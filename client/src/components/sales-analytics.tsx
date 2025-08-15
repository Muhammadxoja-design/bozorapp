import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Calendar, DollarSign, Package, Target, Clock, AlertCircle, Filter, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import type { Sale, Product, WeeklyData, DashboardStats } from "@shared/schema";

interface SalesAnalyticsProps {
  sales: Sale[];
  products: Product[];
  weeklyData: WeeklyData;
  dashboardStats: DashboardStats;
  isLoading: boolean;
}

interface SalesMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  averageOrderValue: number;
  profitMargin: number;
  topProduct: { name: string; revenue: number; quantity: number } | null;
  salesTrend: "up" | "down" | "stable";
  dailyTarget: number;
  targetProgress: number;
}

interface ProductPerformance {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalProfit: number;
  totalQuantity: number;
  transactionCount: number;
  averagePrice: number;
  profitMargin: number;
  lastSaleDate: string;
}

interface TimeframeSales {
  date: string;
  revenue: number;
  profit: number;
  transactions: number;
  quantity: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function SalesAnalytics({ sales, products, weeklyData, dashboardStats, isLoading }: SalesAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");
  const [selectedMetric, setSelectedMetric] = useState<"revenue" | "profit" | "transactions">("revenue");
  const [productFilter, setProductFilter] = useState<string>("all");
  
  // Calculate sales metrics
  const salesMetrics = useMemo((): SalesMetrics => {
    if (!sales || sales.length === 0) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        profitMargin: 0,
        topProduct: null,
        salesTrend: "stable",
        dailyTarget: 500, // Default daily target
        targetProgress: 0,
      };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todaySales = sales.filter(sale => sale.saleDate.toISOString().split('T')[0] === today);
    
    const totalRevenue = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const totalProfit = todaySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const totalTransactions = todaySales.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Find top product
    const productSales = new Map<string, { revenue: number; quantity: number; name: string }>();
    todaySales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        const existing = productSales.get(sale.productId) || { revenue: 0, quantity: 0, name: product.name };
        existing.revenue += parseFloat(sale.totalAmount);
        existing.quantity += parseFloat(sale.quantity);
        productSales.set(sale.productId, existing);
      }
    });
    
    const topProduct = Array.from(productSales.values()).reduce((top, current) => 
      !top || current.revenue > top.revenue ? current : top, null as any);
    
    // Calculate trend (compare today vs yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdaySales = sales.filter(sale => sale.saleDate.toISOString().split('T')[0] === yesterdayStr);
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    
    let salesTrend: "up" | "down" | "stable" = "stable";
    if (totalRevenue > yesterdayRevenue * 1.05) salesTrend = "up";
    else if (totalRevenue < yesterdayRevenue * 0.95) salesTrend = "down";
    
    const dailyTarget = 500; // This could be configurable
    const targetProgress = (totalRevenue / dailyTarget) * 100;
    
    return {
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageOrderValue,
      profitMargin,
      topProduct,
      salesTrend,
      dailyTarget,
      targetProgress: Math.min(targetProgress, 100),
    };
  }, [sales, products]);

  // Calculate product performance
  const productPerformance = useMemo((): ProductPerformance[] => {
    if (!sales || !products) return [];
    
    const performance = new Map<string, ProductPerformance>();
    
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (!product) return;
      
      const existing = performance.get(sale.productId) || {
        productId: sale.productId,
        productName: product.name,
        totalRevenue: 0,
        totalProfit: 0,
        totalQuantity: 0,
        transactionCount: 0,
        averagePrice: 0,
        profitMargin: 0,
        lastSaleDate: sale.saleDate.toISOString().split('T')[0],
      };
      
      existing.totalRevenue += parseFloat(sale.totalAmount);
      existing.totalProfit += parseFloat(sale.profit);
      existing.totalQuantity += parseFloat(sale.quantity);
      existing.transactionCount += 1;
      
      if (new Date(sale.saleDate) > new Date(existing.lastSaleDate)) {
        existing.lastSaleDate = sale.saleDate.toISOString().split('T')[0];
      }
      
      performance.set(sale.productId, existing);
    });
    
    // Calculate derived metrics
    return Array.from(performance.values()).map(p => ({
      ...p,
      averagePrice: p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0,
      profitMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, products]);

  // Calculate timeframe data
  const timeframeData = useMemo((): TimeframeSales[] => {
    if (!sales) return [];
    
    const now = new Date();
    const data: TimeframeSales[] = [];
    
    if (timeframe === "today") {
      // Last 24 hours by hour
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i, 0, 0, 0);
        const nextHour = new Date(hour);
        nextHour.setHours(nextHour.getHours() + 1);
        
        const hourSales = sales.filter(sale => {
          const saleDate = new Date(sale.saleDate);
          return saleDate >= hour && saleDate < nextHour;
        });
        
        data.push({
          date: hour.getHours().toString().padStart(2, '0') + ':00',
          revenue: hourSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
          profit: hourSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
          transactions: hourSales.length,
          quantity: hourSales.reduce((sum, sale) => sum + parseFloat(sale.quantity), 0),
        });
      }
    } else if (timeframe === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySales = sales.filter(sale => 
          sale.saleDate.toISOString().split('T')[0] === dateStr
        );
        
        data.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: daySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
          profit: daySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
          transactions: daySales.length,
          quantity: daySales.reduce((sum, sale) => sum + parseFloat(sale.quantity), 0),
        });
      }
    } else {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySales = sales.filter(sale => 
          sale.saleDate.toISOString().split('T')[0] === dateStr
        );
        
        data.push({
          date: date.getDate().toString(),
          revenue: daySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
          profit: daySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
          transactions: daySales.length,
          quantity: daySales.reduce((sum, sale) => sum + parseFloat(sale.quantity), 0),
        });
      }
    }
    
    return data;
  }, [sales, timeframe]);

  const filteredProductPerformance = useMemo(() => {
    if (productFilter === "all") return productPerformance;
    return productPerformance.filter(p => p.productId === productFilter);
  }, [productPerformance, productFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2" size={20} />
            Sales Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 text-purple-500" size={20} />
              Sales Analytics
            </CardTitle>
            
            <div className="flex space-x-2">
              <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
                <SelectTrigger className="w-32" data-testid="select-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" data-testid="button-refresh-analytics">
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-analytics-revenue">
                 {salesMetrics.totalRevenue.toFixed(2)} so'm
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  {salesMetrics.salesTrend === "up" ? (
                    <TrendingUp className="text-green-500 mr-1" size={12} />
                  ) : salesMetrics.salesTrend === "down" ? (
                    <TrendingUp className="text-red-500 mr-1 rotate-180" size={12} />
                  ) : null}
                  vs yesterday
                </p>
              </div>
              <DollarSign className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit</p>
                <p className="text-2xl font-bold text-profit" data-testid="text-analytics-profit">
                  {salesMetrics.totalProfit.toFixed(2)} so'm
                </p>
                <p className="text-xs text-gray-500">
                  {salesMetrics.profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-analytics-transactions">
                  {salesMetrics.totalTransactions}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: {salesMetrics.averageOrderValue.toFixed(2)} so'm
                </p>
              </div>
              <Package className="text-amber-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-analytics-target">
                  {salesMetrics.targetProgress.toFixed(0)}%
                </p>
                <Progress value={salesMetrics.targetProgress} className="mt-1" />
              </div>
              <Target className="text-purple-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sales Trends</span>
                <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as any)}>
                  <SelectTrigger className="w-32" data-testid="select-metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="profit">Profit</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeframeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        selectedMetric === "transactions" ? value : `$${Number(value).toFixed(2)}`,
                        name
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Product Performance</span>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-48" data-testid="select-product-filter">
                    <Filter className="mr-2" size={16} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProductPerformance.slice(0, 10).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`} 
                           style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-product-performance-name-${product.productId}`}>
                          {product.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.totalQuantity.toFixed(1)}kg sold • {product.transactionCount} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-profit" data-testid={`text-product-performance-revenue-${product.productId}`}>
                        {product.totalRevenue.toFixed(2)} so'm
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.profitMargin.toFixed(1)}% margin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productPerformance.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalRevenue"
                        nameKey="productName"
                      >
                        {productPerformance.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Best Performer</p>
                    <p className="font-medium" data-testid="text-best-performer">
                      {salesMetrics.topProduct?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Revenue</p>
                    <p className="font-medium" data-testid="text-best-performer-revenue">
                      {salesMetrics.topProduct?.revenue.toFixed(2) || "0.00"} so'm
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Avg Order Value</p>
                    <p className="font-medium" data-testid="text-avg-order-value">
                      {salesMetrics.averageOrderValue.toFixed(2)} so'm
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Profit Margin</p>
                    <p className="font-medium" data-testid="text-profit-margin">
                      {salesMetrics.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Daily Target Progress</span>
                    <span className="text-sm text-gray-500">
                      {salesMetrics.totalRevenue.toFixed(2)} so'm / {salesMetrics.dailyTarget.toFixed(2)} so'm
                    </span>
                  </div>
                  <Progress value={salesMetrics.targetProgress} className="h-2" />
                  {salesMetrics.targetProgress >= 100 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                      <Target className="mr-1" size={12} />
                      Target achieved!
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" variant="outline" data-testid="button-export-analytics">
                    <Download className="mr-2" size={16} />
                    Export Analytics Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}