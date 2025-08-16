import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Package, Calendar, Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickStockAdjuster } from "@/components/quick-stock-adjuster";
import type { DashboardStats, Product } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  const recentProducts = products?.slice(0, 3) || [];

  return (
    <div className="pb-20">
      {/* Today's Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl text-white p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Today's Profit</p>
            <p className="text-2xl font-bold" data-testid="text-daily-profit">
              {stats?.dailyProfit || '0.00'} so'm
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Sales</p>
            <p className="text-lg font-semibold" data-testid="text-daily-sales">
              {stats?.dailySales || '0.00'} so'm
            </p>
          </div>
        </div>
        <div className="flex justify-between text-blue-100 text-sm">
          <span>Cost: <span data-testid="text-daily-cost">{stats?.dailyCost || '0.00'} so'm</span></span>
          <span>Margin: <span data-testid="text-daily-margin">{stats?.dailyMargin || '0'}%</span></span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Profit</p>
                <p className="text-xl font-bold text-profit" data-testid="text-weekly-profit">
                  {stats?.weeklyProfit || '0.00'} so'm
                </p>
              </div>
              <Calendar className="text-profit text-xl" size={24} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-product-count">
                  {stats?.productCount || 0}
                </p>
              </div>
              <Package className="text-amber-500 text-xl" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products with Quick Stock Adjuster */}
      <Card>
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center">
            <Sprout className="text-green-500 mr-2" size={20} />
            Mahsulotlar va Stock
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {productsLoading ? (
            <ProductListSkeleton />
          ) : recentProducts.length > 0 ? (
            recentProducts.map((product) => (
              <QuickStockAdjuster 
                key={product.id} 
                product={product}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Package className="mx-auto mb-2" size={48} />
              <p>Hali mahsulot qo'shilmagan</p>
              <p className="text-sm">Birinchi mahsulotingizni qo'shing</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="pb-20 space-y-4">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </>
  );
}
