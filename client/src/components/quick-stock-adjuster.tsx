import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Package, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface QuickStockAdjusterProps {
  product: Product;
  onUpdate?: () => void;
}

export function QuickStockAdjuster({ product, onUpdate }: QuickStockAdjusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStockMutation = useMutation({
    mutationFn: async (data: { newStock: string; adjustment: string; type: "add" | "remove" }) => {
      const response = await apiRequest("PATCH", `/api/products/${product.id}/stock`, {
        newStock: data.newStock,
        adjustment: data.adjustment,
        type: data.type,
        reason: `Quick adjustment: ${data.type} ${data.adjustment}kg`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Muvaffaqiyat",
        description: "Stock yangilandi!",
      });
      setIsEditing(false);
      setAdjustment("");
      onUpdate?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Xato",
        description: error.message || "Stock yangilanmadi",
        variant: "destructive",
      });
    },
  });

  const handleQuickAdjustment = (type: "add" | "remove", amount: number) => {
    const currentStock = parseFloat(product.stock);
    let newStock: number;
    
    if (type === "add") {
      newStock = currentStock + amount;
    } else {
      newStock = Math.max(0, currentStock - amount);
    }
    
    updateStockMutation.mutate({
      newStock: newStock.toFixed(1),
      adjustment: amount.toString(),
      type,
    });
  };

  const handleCustomAdjustment = () => {
    const adjustmentNum = parseFloat(adjustment);
    if (isNaN(adjustmentNum) || adjustmentNum <= 0) {
      toast({
        title: "Xato",
        description: "Miqdorni to'g'ri kiriting",
        variant: "destructive",
      });
      return;
    }

    const currentStock = parseFloat(product.stock);
    let newStock: number;
    
    if (adjustmentType === "add") {
      newStock = currentStock + adjustmentNum;
    } else {
      newStock = Math.max(0, currentStock - adjustmentNum);
      if (newStock === 0 && currentStock > 0) {
        toast({
          title: "Ogohlantirish",
          description: "Stock 0 ga tushdi",
          variant: "destructive",
        });
      }
    }
    
    updateStockMutation.mutate({
      newStock: newStock.toFixed(1),
      adjustment: adjustment,
      type: adjustmentType,
    });
  };

  const getStockStatus = () => {
    const stock = parseFloat(product.stock);
    if (stock <= 0) return { color: "bg-red-600 text-white", text: "Tugagan", variant: "destructive" as const };
    if (stock < 5) return { color: "bg-orange-950 text-white", text: "Kam", variant: "secondary" as const };
    if (stock < 20) return { color: "bg-yellow-700 text-white", text: "O'rtacha", variant: "outline" as const };
    return { color: "bg-green-500", text: "Yetarli", variant: "default" as const };
  };

  const stockStatus = getStockStatus();

  return (
    <Card className="border-l-4" style={{ borderLeftColor: stockStatus.color.replace('bg-', '#') }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-lg" data-testid={`stock-adjuster-name-${product.id}`}>
              {product.name}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold" data-testid={`stock-amount-${product.id}`}>
                {product.stock} kg
              </span>
              <Badge className={stockStatus.color}>
                {stockStatus.text}
              </Badge>
            </div>
          </div>
          <Package className="text-gray-400" size={24} />
        </div>

        {!isEditing ? (
          <div className="space-y-3">
            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjustment("add", 10)}
                disabled={updateStockMutation.isPending}
                data-testid={`quick-add-1-${product.id}`}
                className="text-green-600 border-green-200 hover:bg-green-500"
              >
                <Plus size={14} />
                10 kg
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjustment("add", 15)}
                disabled={updateStockMutation.isPending}
                data-testid={`quick-add-5-${product.id}`}
                className="text-green-600 border-green-200 hover:bg-green-500"
              >
                <Plus size={14} />
                15 kg
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjustment("add", 20)}
                disabled={updateStockMutation.isPending}
                data-testid={`quick-add-10-${product.id}`}
                className="text-green-600 border-green-200 hover:bg-green-500"
              >
                <Plus size={14} />
                20 kg
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjustment("remove", 10)}
                disabled={updateStockMutation.isPending || parseFloat(product.stock) < 1}
                data-testid={`quick-remove-1-${product.id}`}
                className="text-red-600 border-red-200 hover:bg-red-700"
              >
                <Minus size={14} />
                10 kg
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjustment("remove", 15)}
                disabled={updateStockMutation.isPending || parseFloat(product.stock) < 5}
                data-testid={`quick-remove-5-${product.id}`}
                className="text-red-600 border-red-200 hover:bg-red-700"
              >
                <Minus size={14} className="mr-1" />
                15 kg
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid={`custom-adjust-${product.id}`}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Edit3 size={14} className="mr-1" />
                Boshqa miqdor
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button
                variant={adjustmentType === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustmentType("add")}
                data-testid={`adjustment-type-add-${product.id}`}
              >
                <Plus size={14} className="mr-1" />
                Qo'shish
              </Button>
              <Button
                variant={adjustmentType === "remove" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustmentType("remove")}
                data-testid={`adjustment-type-remove-${product.id}`}
              >
                <Minus size={14} className="mr-1" />
                Ayirish
              </Button>
            </div>

            <div className="flex space-x-2">
              <Input
                type="number"
                step="0.1"
                placeholder="Miqdor (kg)"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                data-testid={`adjustment-input-${product.id}`}
                className="flex-1"
              />
              <Button
                onClick={handleCustomAdjustment}
                disabled={updateStockMutation.isPending || !adjustment}
                data-testid={`save-adjustment-${product.id}`}
              >
                <Save size={16} className="mr-1" />
                Saqlash
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setAdjustment("");
                }}
                data-testid={`cancel-adjustment-${product.id}`}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {adjustmentType === "add" 
                ? `Yangi stock: ${(parseFloat(product.stock) + (parseFloat(adjustment) || 0)).toFixed(1)} kg`
                : `Yangi stock: ${Math.max(0, parseFloat(product.stock) - (parseFloat(adjustment) || 0)).toFixed(1)} kg`
              }
            </div>
          </div>
        )}

        {updateStockMutation.isPending && (
          <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
            Yangilanmoqda...
          </div>
        )}
      </CardContent>
    </Card>
  );
}