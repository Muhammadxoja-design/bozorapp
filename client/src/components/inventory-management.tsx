import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Search, Filter, Plus, Minus, Edit3, Trash2, Eye, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface InventoryManagementProps {
  products: Product[];
  isLoading: boolean;
}

const stockUpdateSchema = z.object({
  adjustment: z.string().min(1, "Adjustment is required"),
  reason: z.string().min(1, "Reason is required"),
});

type StockUpdateData = z.infer<typeof stockUpdateSchema>;

const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
});

type ProductEditData = z.infer<typeof productEditSchema>;

export function InventoryManagement({ products, isLoading }: InventoryManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "profit" | "created">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState<"all" | "low-stock" | "high-profit">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockAdjustmentType, setStockAdjustmentType] = useState<"add" | "remove">("add");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const stockUpdateForm = useForm<StockUpdateData>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      adjustment: "",
      reason: "",
    },
  });

  const productEditForm = useForm<ProductEditData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      purchasePrice: "",
      sellingPrice: "",
    },
  });

  // Set form values when product is selected
  useEffect(() => {
    if (selectedProduct) {
      productEditForm.setValue("name", selectedProduct.name);
      productEditForm.setValue("purchasePrice", selectedProduct.purchasePrice);
      productEditForm.setValue("sellingPrice", selectedProduct.sellingPrice);
    }
  }, [selectedProduct, productEditForm]);

  const updateStockMutation = useMutation({
    mutationFn: async (data: { productId: string; newStock: string; adjustment: string; type: "add" | "remove"; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/products/${data.productId}/stock`, {
        newStock: data.newStock,
        adjustment: data.adjustment,
        type: data.type,
        reason: data.reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Stock updated successfully!",
      });
      setIsStockDialogOpen(false);
      stockUpdateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: { productId: string; updates: ProductEditData }) => {
      const response = await apiRequest("PATCH", `/api/products/${data.productId}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Product updated successfully!",
      });
      setIsEditDialogOpen(false);
      productEditForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const filteredAndSortedProducts = products
    ?.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterBy === "low-stock") {
        return matchesSearch && parseFloat(product.stock) < 10;
      } else if (filterBy === "high-profit") {
        const profit = parseFloat(product.sellingPrice) - parseFloat(product.purchasePrice);
        return matchesSearch && profit > 5;
      }
      
      return matchesSearch;
    })
    ?.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "stock":
          comparison = parseFloat(a.stock) - parseFloat(b.stock);
          break;
        case "profit":
          const profitA = parseFloat(a.sellingPrice) - parseFloat(a.purchasePrice);
          const profitB = parseFloat(b.sellingPrice) - parseFloat(b.purchasePrice);
          comparison = profitA - profitB;
          break;
        case "created":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    }) || [];

  const handleStockUpdate = (data: StockUpdateData) => {
    if (!selectedProduct) return;
    
    const currentStock = parseFloat(selectedProduct.stock);
    const adjustment = parseFloat(data.adjustment);
    
    let newStock: number;
    if (stockAdjustmentType === "add") {
      newStock = currentStock + adjustment;
    } else {
      newStock = currentStock - adjustment;
      if (newStock < 0) {
        toast({
          title: "Error",
          description: "Stock cannot be negative",
          variant: "destructive",
        });
        return;
      }
    }
    
    updateStockMutation.mutate({
      productId: selectedProduct.id,
      newStock: newStock.toFixed(1),
      adjustment: data.adjustment,
      type: stockAdjustmentType,
      reason: data.reason,
    });
  };

  const handleProductEdit = (data: ProductEditData) => {
    if (!selectedProduct) return;
    
    updateProductMutation.mutate({
      productId: selectedProduct.id,
      updates: data,
    });
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProductMutation.mutate(productId);
    }
  };

  const getStockStatus = (stock: string) => {
    const stockNum = parseFloat(stock);
    if (stockNum < 5) return { status: "critical", color: "bg-red-500" };
    if (stockNum < 10) return { status: "low", color: "bg-yellow-500" };
    if (stockNum < 50) return { status: "medium", color: "bg-blue-500" };
    return { status: "high", color: "bg-green-500" };
  };

  const getProfitMargin = (product: Product) => {
    const profit = parseFloat(product.sellingPrice) - parseFloat(product.purchasePrice);
    const margin = (profit / parseFloat(product.sellingPrice)) * 100;
    return margin;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2" size={20} />
            Inventory Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="mr-2 text-blue-500" size={20} />
            Inventory Management
          </div>
          <Badge variant="outline">{products.length} Products</Badge>
        </CardTitle>
        
        {/* Search and Filters */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              data-testid="input-search-products"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="profit">Profit</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            data-testid="button-sort-order"
          >
            {sortOrder === "asc" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </Button>
          
          <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-filter-by">
              <Filter className="mr-2" size={16} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="high-profit">High Profit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Package className="mx-auto mb-4" size={48} />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedProducts.map((product) => {
              const profit = parseFloat(product.sellingPrice) - parseFloat(product.purchasePrice);
              const profitMargin = getProfitMargin(product);
              const stockStatus = getStockStatus(product.stock);
              
              return (
                <Card key={product.id} className="border-l-4" style={{ borderLeftColor: stockStatus.color.replace('bg-', '') === 'red-500' ? '#ef4444' : stockStatus.color.replace('bg-', '') === 'yellow-500' ? '#eab308' : stockStatus.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : '#22c55e' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-lg" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h4>
                          <Badge 
                            variant={stockStatus.status === "critical" ? "destructive" : stockStatus.status === "low" ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {stockStatus.status} stock
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Stock</p>
                            <p className="font-medium" data-testid={`text-stock-${product.id}`}>
                              {product.stock} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Selling Price</p>
                            <p className="font-medium" data-testid={`text-selling-price-${product.id}`}>
                              {product.sellingPrice} so'm/kg
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Profit/kg</p>
                            <p className={`font-medium ${profit >= 0 ? 'text-profit' : 'text-loss'}`} data-testid={`text-profit-${product.id}`}>
                              {profit.toFixed(2)} so'm
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Margin</p>
                            <p className={`font-medium ${profitMargin >= 0 ? 'text-profit' : 'text-loss'}`} data-testid={`text-margin-${product.id}`}>
                              {profitMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <Dialog open={isStockDialogOpen && selectedProduct?.id === product.id} onOpenChange={setIsStockDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                              data-testid={`button-adjust-stock-${product.id}`}
                            >
                              <Package size={14} className="mr-1" />
                              Stock
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Dialog open={isEditDialogOpen && selectedProduct?.id === product.id} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit3 size={14} className="mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Stock: <span className="font-medium">{selectedProduct?.stock} kg</span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={stockAdjustmentType === "add" ? "default" : "outline"}
                  onClick={() => setStockAdjustmentType("add")}
                  data-testid="button-stock-add"
                >
                  <Plus size={16} className="mr-1" />
                  Add Stock
                </Button>
                <Button
                  variant={stockAdjustmentType === "remove" ? "default" : "outline"}
                  onClick={() => setStockAdjustmentType("remove")}
                  data-testid="button-stock-remove"
                >
                  <Minus size={16} className="mr-1" />
                  Remove Stock
                </Button>
              </div>
              
              <Form {...stockUpdateForm}>
                <form onSubmit={stockUpdateForm.handleSubmit(handleStockUpdate)} className="space-y-4">
                  <FormField
                    control={stockUpdateForm.control}
                    name="adjustment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adjustment Amount (kg)</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-stock-adjustment"
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
                    control={stockUpdateForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-stock-reason"
                            placeholder="e.g., Damaged goods, Manual recount..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={updateStockMutation.isPending}
                      data-testid="button-confirm-stock-update"
                    >
                      {updateStockMutation.isPending ? "Updating..." : "Update Stock"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsStockDialogOpen(false)}
                      data-testid="button-cancel-stock-update"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            
            <Form {...productEditForm}>
              <form onSubmit={productEditForm.handleSubmit(handleProductEdit)} className="space-y-4">
                <FormField
                  control={productEditForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-edit-product-name"
                          placeholder="Product name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={productEditForm.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">$</span>
                            <Input
                              data-testid="input-edit-purchase-price"
                              type="number"
                              step="0.01"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={productEditForm.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">$</span>
                            <Input
                              data-testid="input-edit-selling-price"
                              type="number"
                              step="0.01"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={updateProductMutation.isPending}
                    data-testid="button-confirm-product-edit"
                  >
                    {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-product-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}