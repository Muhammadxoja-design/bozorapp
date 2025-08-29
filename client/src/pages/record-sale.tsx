import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const formSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.string().min(1, "Quantity is required"),
  pricePerKg: z.string().min(1, "Sale price is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function RecordSale() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      quantity: "",
      pricePerKg: "",
    },
  });

  const { watch, setValue } = form;
  const productId = watch("productId");
  const quantity = watch("quantity");
  const pricePerKg = watch("pricePerKg");

  // Auto-fill selling price when product is selected
  useEffect(() => {
    if (productId && products) {
      const selectedProduct = products.find((p) => p.id === productId);
      if (selectedProduct) {
        setValue("pricePerKg", selectedProduct.sellingPrice);
      }
    }
  }, [productId, products, setValue]);

  // Calculate sale summary
  const selectedProduct = products?.find((p) => p.id === productId);
  const totalAmount =
    (parseFloat(quantity) || 0) * (parseFloat(pricePerKg) || 0);
  const totalCost = selectedProduct
    ? (parseFloat(quantity) || 0) * parseFloat(selectedProduct.purchasePrice)
    : 0;
  const profit = totalAmount - totalCost;

  const recordSaleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const saleData = {
        productId: data.productId,
        quantity: data.quantity,
        pricePerKg: data.pricePerKg,
        totalAmount: totalAmount.toFixed(2),
        profit: profit.toFixed(2),
      };
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Sale recorded successfully!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a valid product",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = parseFloat(data.quantity);
    const stockNum = parseFloat(selectedProduct.stock);

    if (quantityNum > stockNum) {
      toast({
        title: "Error",
        description: `Insufficient stock. Available: ${selectedProduct.stock}kg`,
        variant: "destructive",
      });
      return;
    }

    recordSaleMutation.mutate(data);
  };

  return (
    <div className="pb-20 p-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="text-green-500 mr-2" size={20} />
              Sotish
            </h3>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-close">
                <X size={16} />
              </Button>
            </Link>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mahsulotni tanlang</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product">
                          <SelectValue placeholder="Mahsulotni tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.sellingPrice}/kg (
                            {product.stock}kg available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sotilgan miqdor (kg)</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-quantity"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sotish narxi (1 kg uchun)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            data-testid="input-sale-price"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                          <span className="absolute left-2/3 top-2 text-gray-500">
                            so'm
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sale Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-800 dark:text-blue-300">
                    Jami sotish narxi:
                  </span>
                  <span
                    className="text-blue-600 dark:text-blue-400 font-bold"
                    data-testid="text-total-amount"
                  >
                    {totalAmount.toFixed(2)} so'm
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-800 dark:text-blue-300">
                    Xarajat:
                  </span>
                  <span
                    className="text-blue-600 dark:text-blue-400"
                    data-testid="text-total-cost"
                  >
                    {totalCost.toFixed(3)} so'm
                  </span>
                </div>
                <div className="border-t border-blue-200 dark:border-blue-800 pt-2 flex justify-between items-center">
                  <span className="text-blue-800 dark:text-blue-300 font-semibold">
                    Sof foyda:
                  </span>
                  <span
                    className="text-profit font-bold text-lg"
                    data-testid="text-sale-profit"
                  >
                    {profit.toFixed(3)} so'm
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="button-record-sale"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={recordSaleMutation.isPending}
              >
                {recordSaleMutation.isPending ? (
                  "Yozilmoqda..."
                ) : (
                  <>
                    <ShoppingCart className="mr-2" size={16} />
                    Sotishni yozish
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
