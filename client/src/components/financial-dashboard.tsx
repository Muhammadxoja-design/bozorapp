import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Calculator, PieChart, BarChart3, Target, Calendar, Clock, AlertCircle, CheckCircle, Banknote, CreditCard, Wallet, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from "recharts";
import type { Sale, Product, DashboardStats } from "@shared/schema";

interface FinancialDashboardProps {
  sales: Sale[];
  products: Product[];
  dashboardStats: DashboardStats;
  isLoading: boolean;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  profitMargin: number;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  cashFlow: number;
  averageTransactionValue: number;
  topPerformingProduct: string;
  leastPerformingProduct: string;
  revenueGrowth: number;
  profitGrowth: number;
  inventoryValue: number;
  inventoryTurnover: number;
}

interface ProfitabilityData {
  product: string;
  revenue: number;
  profit: number;
  margin: number;
  cost: number;
}

interface CashFlowData {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

interface PerformanceIndicators {
  roi: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  inventoryDays: number;
  salesEfficiency: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

export function FinancialDashboard({ sales, products, dashboardStats, isLoading }: FinancialDashboardProps) {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "quarter">("today");
  const [viewMode, setViewMode] = useState<"overview" | "detailed" | "analysis">("overview");
  const [comparisonPeriod, setComparisonPeriod] = useState<"previous" | "lastYear" | "target">("previous");

  // Calculate comprehensive financial metrics
  const financialMetrics = useMemo((): FinancialMetrics => {
    if (!sales || !products) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalCost: 0,
        profitMargin: 0,
        dailyTarget: 500,
        weeklyTarget: 3500,
        monthlyTarget: 15000,
        cashFlow: 0,
        averageTransactionValue: 0,
        topPerformingProduct: "N/A",
        leastPerformingProduct: "N/A",
        revenueGrowth: 0,
        profitGrowth: 0,
        inventoryValue: 0,
        inventoryTurnover: 0,
      };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Filter sales by timeframe
    let filteredSales = sales;
    if (timeframe === "today") {
      filteredSales = sales.filter(sale => sale.saleDate.toISOString().split('T')[0] === today);
    } else if (timeframe === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredSales = sales.filter(sale => new Date(sale.saleDate) >= weekAgo);
    } else if (timeframe === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredSales = sales.filter(sale => new Date(sale.saleDate) >= monthAgo);
    } else if (timeframe === "quarter") {
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      filteredSales = sales.filter(sale => new Date(sale.saleDate) >= quarterAgo);
    }

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const totalCost = totalRevenue - totalProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageTransactionValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    // Calculate inventory value
    const inventoryValue = products.reduce((sum, product) => {
      return sum + (parseFloat(product.stock) * parseFloat(product.purchasePrice));
    }, 0);

    // Calculate inventory turnover (simplified)
    const inventoryTurnover = inventoryValue > 0 ? totalCost / inventoryValue : 0;

    // Find top and least performing products
    const productPerformance = new Map<string, number>();
    filteredSales.forEach(sale => {
      const current = productPerformance.get(sale.productId) || 0;
      productPerformance.set(sale.productId, current + parseFloat(sale.totalAmount));
    });

    const sortedProducts = Array.from(productPerformance.entries()).sort((a, b) => b[1] - a[1]);
    const topPerformingProduct = sortedProducts[0] ? 
      products.find(p => p.id === sortedProducts[0][0])?.name || "N/A" : "N/A";
    const leastPerformingProduct = sortedProducts[sortedProducts.length - 1] ? 
      products.find(p => p.id === sortedProducts[sortedProducts.length - 1][0])?.name || "N/A" : "N/A";

    // Calculate growth (compare with previous period)
    const periodStart = new Date(now);
    if (timeframe === "today") {
      periodStart.setDate(periodStart.getDate() - 1);
    } else if (timeframe === "week") {
      periodStart.setDate(periodStart.getDate() - 14);
    } else if (timeframe === "month") {
      periodStart.setMonth(periodStart.getMonth() - 2);
    } else {
      periodStart.setMonth(periodStart.getMonth() - 6);
    }

    const previousPeriodSales = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= periodStart && saleDate < (timeframe === "today" ? 
        new Date(now.getTime() - 24 * 60 * 60 * 1000) : 
        new Date(now.getTime() - (timeframe === "week" ? 7 : timeframe === "month" ? 30 : 90) * 24 * 60 * 60 * 1000));
    });

    const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const previousProfit = previousPeriodSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const profitGrowth = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;

    return {
      totalRevenue,
      totalProfit,
      totalCost,
      profitMargin,
      dailyTarget: 500,
      weeklyTarget: 3500,
      monthlyTarget: 15000,
      cashFlow: totalProfit, // Simplified
      averageTransactionValue,
      topPerformingProduct,
      leastPerformingProduct,
      revenueGrowth,
      profitGrowth,
      inventoryValue,
      inventoryTurnover,
    };
  }, [sales, products, timeframe]);

  // Calculate profitability data by product
  const profitabilityData = useMemo((): ProfitabilityData[] => {
    if (!sales || !products) return [];

    const productMetrics = new Map<string, { revenue: number; profit: number; cost: number }>();
    
    sales.forEach(sale => {
      const existing = productMetrics.get(sale.productId) || { revenue: 0, profit: 0, cost: 0 };
      existing.revenue += parseFloat(sale.totalAmount);
      existing.profit += parseFloat(sale.profit);
      existing.cost += parseFloat(sale.totalAmount) - parseFloat(sale.profit);
      productMetrics.set(sale.productId, existing);
    });

    return Array.from(productMetrics.entries()).map(([productId, metrics]) => {
      const product = products.find(p => p.id === productId);
      return {
        product: product?.name || "Unknown",
        revenue: metrics.revenue,
        profit: metrics.profit,
        cost: metrics.cost,
        margin: metrics.revenue > 0 ? (metrics.profit / metrics.revenue) * 100 : 0,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [sales, products]);

  // Calculate cash flow data
  const cashFlowData = useMemo((): CashFlowData[] => {
    if (!sales) return [];

    const data: CashFlowData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySales = sales.filter(sale => 
        sale.saleDate.toISOString().split('T')[0] === dateStr
      );

      const inflow = daySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const outflow = daySales.reduce((sum, sale) => sum + (parseFloat(sale.totalAmount) - parseFloat(sale.profit)), 0);

      data.push({
        period: date.toLocaleDateString('en-US', { weekday: 'short' }),
        inflow,
        outflow,
        netFlow: inflow - outflow,
      });
    }

    return data;
  }, [sales]);

  // Calculate performance indicators
  const performanceIndicators = useMemo((): PerformanceIndicators => {
    const roi = financialMetrics.inventoryValue > 0 ? 
      (financialMetrics.totalProfit / financialMetrics.inventoryValue) * 100 : 0;
    
    const grossMargin = financialMetrics.totalRevenue > 0 ? 
      (financialMetrics.totalProfit / financialMetrics.totalRevenue) * 100 : 0;
    
    const operatingMargin = grossMargin; // Simplified
    const netMargin = grossMargin; // Simplified
    
    const inventoryDays = financialMetrics.inventoryTurnover > 0 ? 
      365 / financialMetrics.inventoryTurnover : 0;
    
    const salesEfficiency = financialMetrics.averageTransactionValue > 0 ? 
      (financialMetrics.totalProfit / financialMetrics.averageTransactionValue) * 100 : 0;

    return {
      roi,
      grossMargin,
      operatingMargin,
      netMargin,
      inventoryDays,
      salesEfficiency,
    };
  }, [financialMetrics]);

  const getTargetProgress = () => {
    let target = financialMetrics.dailyTarget;
    if (timeframe === "week") target = financialMetrics.weeklyTarget;
    else if (timeframe === "month") target = financialMetrics.monthlyTarget;
    else if (timeframe === "quarter") target = financialMetrics.monthlyTarget * 3;

    return Math.min((financialMetrics.totalRevenue / target) * 100, 100);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 5) return <TrendingUp className="text-green-500" size={16} />;
    if (growth < -5) return <TrendingDown className="text-red-500" size={16} />;
    return <TrendingUp className="text-gray-500" size={16} />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2" size={20} />
            Financial Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
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
              <DollarSign className="mr-2 text-green-500" size={20} />
              Financial Dashboard
            </CardTitle>
            
            <div className="flex space-x-2">
              <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
                <SelectTrigger className="w-32" data-testid="select-financial-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <SelectTrigger className="w-32" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-financial-revenue">
                 {financialMetrics.totalRevenue.toFixed(2)} so'm
                </p>
                <div className="flex items-center text-green-100 text-xs">
                  {getGrowthIcon(financialMetrics.revenueGrowth)}
                  <span className="ml-1">{financialMetrics.revenueGrowth.toFixed(1)}% vs prev</span>
                </div>
              </div>
              <Banknote size={32} className="text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Net Profit</p>
                <p className="text-2xl font-bold" data-testid="text-financial-profit">
                  {financialMetrics.totalProfit.toFixed(2)} so'm
                </p>
                <div className="flex items-center text-blue-100 text-xs">
                  {getGrowthIcon(financialMetrics.profitGrowth)}
                  <span className="ml-1">{financialMetrics.profitGrowth.toFixed(1)}% vs prev</span>
                </div>
              </div>
              <TrendingUp size={32} className="text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Profit Margin</p>
                <p className="text-2xl font-bold" data-testid="text-financial-margin">
                  {financialMetrics.profitMargin.toFixed(1)}%
                </p>
                <p className="text-purple-100 text-xs">
                  Cost: {financialMetrics.totalCost.toFixed(2)} so'm
                </p>
              </div>
              <Calculator size={32} className="text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Inventory Value</p>
                <p className="text-2xl font-bold" data-testid="text-inventory-value">
                  {financialMetrics.inventoryValue.toFixed(2)} so'm
                </p>
                <p className="text-amber-100 text-xs">
                  Turnover: {financialMetrics.inventoryTurnover.toFixed(1)}x
                </p>
              </div>
              <Wallet size={32} className="text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Target className="text-blue-500 mr-2" size={20} />
              <span className="font-medium">Target Progress</span>
            </div>
            <Badge variant={getTargetProgress() >= 100 ? "default" : "secondary"}>
              {getTargetProgress().toFixed(0)}%
            </Badge>
          </div>
          <Progress value={getTargetProgress()} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>${financialMetrics.totalRevenue.toFixed(2)} achieved</span>
            <span>Target: {timeframe === "today" ? financialMetrics.dailyTarget : 
                      timeframe === "week" ? financialMetrics.weeklyTarget : 
                      timeframe === "month" ? financialMetrics.monthlyTarget : 
                      financialMetrics.monthlyTarget * 3} so'm</span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-financial-overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed" data-testid="tab-financial-detailed">Detailed</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-financial-analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Area type="monotone" dataKey="netFlow" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="inflow" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profitabilityData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                           style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm">{item.product}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-profit">${item.profit.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{item.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={profitabilityData.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="revenue"
                        nameKey="product"
                      >
                        {profitabilityData.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">ROI</span>
                  <span className="font-bold text-profit">{performanceIndicators.roi.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Gross Margin</span>
                  <span className="font-bold">{performanceIndicators.grossMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Inventory Days</span>
                  <span className="font-bold">{performanceIndicators.inventoryDays.toFixed(0)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Transaction</span>
                  <span className="font-bold">${financialMetrics.averageTransactionValue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-sm">Top: {financialMetrics.topPerformingProduct}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="text-amber-500" size={16} />
                  <span className="text-sm">Least: {financialMetrics.leastPerformingProduct}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="text-blue-500" size={16} />
                  <span className="text-sm">Revenue growth: {financialMetrics.revenueGrowth.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Coins className="text-purple-500" size={16} />
                  <span className="text-sm">Cash flow: {financialMetrics.cashFlow.toFixed(2)} so'm</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profitability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitabilityData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === "margin" ? `${Number(value).toFixed(1)}%` : `$${Number(value).toFixed(2)}`,
                      name
                    ]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                    <Bar dataKey="profit" fill="#10B981" name="Profit" />
                    <Bar dataKey="margin" fill="#F59E0B" name="Margin %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}