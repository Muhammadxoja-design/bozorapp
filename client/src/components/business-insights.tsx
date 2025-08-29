import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Target, Calendar, Clock, Lightbulb, BarChart3, PieChart, LineChart as LineChartIcon, Users, Package, DollarSign, ArrowUp, ArrowDown, Zap, Star, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine } from "recharts";
import type { Sale, Product, DashboardStats } from "@shared/schema";

interface BusinessInsightsProps {
  sales: Sale[];
  products: Product[];
  dashboardStats: DashboardStats;
  isLoading: boolean;
}

interface Insight {
  id: string;
  type: "opportunity" | "warning" | "success" | "info";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
  category: "sales" | "inventory" | "pricing" | "performance";
  priority: number;
  recommendation?: string;
  data?: any;
}

interface TrendAnalysis {
  trend: "upward" | "downward" | "stable" | "volatile";
  strength: number;
  description: string;
  forecast: number[];
  confidence: number;
}

interface ProductInsight {
  productId: string;
  productName: string;
  performance: "excellent" | "good" | "average" | "poor";
  salesVelocity: number;
  profitability: number;
  stockTurnover: number;
  recommendations: string[];
  opportunities: string[];
  risks: string[];
}

interface MarketAnalysis {
  demandPattern: "seasonal" | "consistent" | "declining" | "growing";
  bestSellingTime: string;
  worstSellingTime: string;
  averageOrderSize: number;
  customerBehavior: string;
  marketPosition: "leader" | "follower" | "niche";
  competitiveAdvantage: string[];
}

interface PerformanceMetrics {
  efficiency: number;
  growth: number;
  stability: number;
  profitability: number;
  overall: number;
}

const getIcon = (type: string) => {
  switch (type) {
    case "opportunity": return <Lightbulb className="text-yellow-500" size={20} />;
    case "warning": return <AlertTriangle className="text-orange-500" size={20} />;
    case "success": return <CheckCircle className="text-green-500" size={20} />;
    case "info": return <Info className="text-blue-500" size={20} />;
    default: return <Brain className="text-purple-500" size={20} />;
  }
};

const getBadgeVariant = (impact: string) => {
  switch (impact) {
    case "high": return "destructive";
    case "medium": return "default";
    case "low": return "secondary";
    default: return "outline";
  }
};

export function BusinessInsights({ sales, products, dashboardStats, isLoading }: BusinessInsightsProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "sales" | "inventory" | "pricing" | "performance">("all");
  const [sortBy, setSortBy] = useState<"priority" | "impact" | "category">("priority");
  const [timeHorizon, setTimeHorizon] = useState<"short" | "medium" | "long">("short");

  // Generate comprehensive business insights
  const businessInsights = useMemo((): Insight[] => {
    if (!sales || !products || sales.length === 0) {
      return [
        {
          id: "no-data",
          type: "info",
          title: "Getting Started",
          description: "Start adding products and recording sales to unlock powerful business insights.",
          impact: "high",
          actionable: true,
          category: "performance",
          priority: 1,
          recommendation: "Add your first product and record some sales to begin analysis.",
        }
      ];
    }

    const insights: Insight[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Sales Analysis
    const todaySales = sales.filter(sale => sale.saleDate.toISOString().split('T')[0] === today);
    const yesterdaySales = sales.filter(sale => sale.saleDate.toISOString().split('T')[0] === yesterday);
    const weekSales = sales.filter(sale => new Date(sale.saleDate) >= weekAgo);

    const todayRevenue = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const weekRevenue = weekSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

    // Revenue trend insight
    if (yesterdayRevenue > 0) {
      const growthRate = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      if (growthRate > 20) {
        insights.push({
          id: "revenue-surge",
          type: "success",
          title: "Strong Revenue Growth",
          description: `Daily revenue increased by ${growthRate.toFixed(1)}% compared to yesterday.`,
          impact: "high",
          actionable: true,
          category: "sales",
          priority: 2,
          recommendation: "Analyze what drove this growth and replicate successful strategies.",
        });
      } else if (growthRate < -15) {
        insights.push({
          id: "revenue-decline",
          type: "warning",
          title: "Revenue Decline Alert",
          description: `Daily revenue dropped by ${Math.abs(growthRate).toFixed(1)}% compared to yesterday.`,
          impact: "high",
          actionable: true,
          category: "sales",
          priority: 1,
          recommendation: "Review market conditions and consider promotional strategies.",
        });
      }
    }

    // Inventory Analysis
    const lowStockProducts = products.filter(product => parseFloat(product.stock) < 10);
    const overStockProducts = products.filter(product => parseFloat(product.stock) > 100);
    const outOfStockProducts = products.filter(product => parseFloat(product.stock) <= 0);

    if (lowStockProducts.length > 0) {
      insights.push({
        id: "low-stock-warning",
        type: "warning",
        title: "Low Stock Alert",
        description: `${lowStockProducts.length} products are running low on inventory.`,
        impact: "high",
        actionable: true,
        category: "inventory",
        priority: 1,
        recommendation: "Reorder stock immediately to avoid stockouts and lost sales.",
        data: lowStockProducts,
      });
    }

    if (outOfStockProducts.length > 0) {
      insights.push({
        id: "out-of-stock-critical",
        type: "warning",
        title: "Critical: Products Out of Stock",
        description: `${outOfStockProducts.length} products are completely out of stock.`,
        impact: "high",
        actionable: true,
        category: "inventory",
        priority: 1,
        recommendation: "Urgent restocking required to resume sales and maintain customer satisfaction.",
        data: outOfStockProducts,
      });
    }

    // Pricing Analysis
    const productProfitability = products.map(product => {
      const profit = parseFloat(product.sellingPrice) - parseFloat(product.purchasePrice);
      const margin = parseFloat(product.sellingPrice) > 0 ? (profit / parseFloat(product.sellingPrice)) * 100 : 0;
      return { ...product, profit, margin };
    });

    const lowMarginProducts = productProfitability.filter(product => product.margin < 15);
    const highMarginProducts = productProfitability.filter(product => product.margin > 40);

    if (lowMarginProducts.length > 0) {
      insights.push({
        id: "low-margin-products",
        type: "opportunity",
        title: "Pricing Optimization Opportunity",
        description: `${lowMarginProducts.length} products have profit margins below 15%.`,
        impact: "medium",
        actionable: true,
        category: "pricing",
        priority: 3,
        recommendation: "Consider increasing prices or negotiating better purchase costs.",
        data: lowMarginProducts,
      });
    }

    if (highMarginProducts.length > 0) {
      insights.push({
        id: "high-margin-products",
        type: "success",
        title: "High-Margin Products Identified",
        description: `${highMarginProducts.length} products have excellent profit margins above 40%.`,
        impact: "medium",
        actionable: true,
        category: "pricing",
        priority: 4,
        recommendation: "Focus marketing efforts on these profitable products.",
        data: highMarginProducts,
      });
    }

    // Product Performance Analysis
    const productSalesMap = new Map<string, { revenue: number; quantity: number; frequency: number }>();
    sales.forEach(sale => {
      const existing = productSalesMap.get(sale.productId) || { revenue: 0, quantity: 0, frequency: 0 };
      existing.revenue += parseFloat(sale.totalAmount);
      existing.quantity += parseFloat(sale.quantity);
      existing.frequency += 1;
      productSalesMap.set(sale.productId, existing);
    });

    const topPerformers = Array.from(productSalesMap.entries())
      .map(([productId, metrics]) => {
        const product = products.find(p => p.id === productId);
        return { productId, product, ...metrics };
      })
      .filter(item => item.product)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      insights.push({
        id: "top-performers",
        type: "success",
        title: "Star Products Identified",
        description: `Your top 3 products generate ${((topPerformers.reduce((sum, p) => sum + p.revenue, 0) / weekRevenue) * 100).toFixed(1)}% of weekly revenue.`,
        impact: "medium",
        actionable: true,
        category: "performance",
        priority: 3,
        recommendation: "Ensure adequate stock levels and consider expanding similar product lines.",
        data: topPerformers,
      });
    }

    // Seasonal Patterns
    const hourlyData = new Map<number, number>();
    sales.forEach(sale => {
      const hour = new Date(sale.saleDate).getHours();
      hourlyData.set(hour, (hourlyData.get(hour) || 0) + parseFloat(sale.totalAmount));
    });

    const peakHour = Array.from(hourlyData.entries()).reduce((max, current) => 
      current[1] > max[1] ? current : max, [0, 0]);

    if (peakHour[1] > 0) {
      insights.push({
        id: "peak-sales-time",
        type: "info",
        title: "Peak Sales Time Identified",
        description: `Most sales occur around ${peakHour[0]}:00, generating ${peakHour[1].toFixed(2)} so'm in revenue.`,
        impact: "low",
        actionable: true,
        category: "sales",
        priority: 5,
        recommendation: "Optimize staffing and inventory availability during peak hours.",
      });
    }

    // Market Opportunities
    const avgOrderValue = sales.length > 0 ? weekRevenue / sales.length : 0;
    const largeOrders = sales.filter(sale => parseFloat(sale.totalAmount) > avgOrderValue * 2);

    if (largeOrders.length > 0) {
      insights.push({
        id: "large-orders",
        type: "opportunity",
        title: "Large Order Opportunity",
        description: `${largeOrders.length} recent orders were significantly above average size.`,
        impact: "medium",
        actionable: true,
        category: "sales",
        priority: 4,
        recommendation: "Identify patterns in large orders and develop strategies to encourage similar purchases.",
        data: largeOrders,
      });
    }

    // Customer Behavior Insights
    const dailyTransactionCounts = new Map<string, number>();
    sales.forEach(sale => {
      const date = sale.saleDate.toISOString().split('T')[0];
      dailyTransactionCounts.set(date, (dailyTransactionCounts.get(date) || 0) + 1);
    });

    const avgDailyTransactions = Array.from(dailyTransactionCounts.values()).reduce((sum, count) => sum + count, 0) / dailyTransactionCounts.size;
    const todayTransactions = dailyTransactionCounts.get(today) || 0;

    if (todayTransactions > avgDailyTransactions * 1.5) {
      insights.push({
        id: "high-activity-day",
        type: "success",
        title: "High Customer Activity",
        description: `Today's transaction count is ${((todayTransactions / avgDailyTransactions - 1) * 100).toFixed(1)}% above average.`,
        impact: "medium",
        actionable: false,
        category: "performance",
        priority: 4,
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [sales, products, dashboardStats]);

  // Analyze sales trends
  const trendAnalysis = useMemo((): TrendAnalysis => {
    if (!sales || sales.length < 7) {
      return {
        trend: "stable",
        strength: 0,
        description: "Insufficient data for trend analysis",
        forecast: [],
        confidence: 0,
      };
    }

    const dailyRevenue = new Map<string, number>();
    sales.forEach(sale => {
      const date = sale.saleDate.toISOString().split('T')[0];
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + parseFloat(sale.totalAmount));
    });

    const sortedData = Array.from(dailyRevenue.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7) // Last 7 days
      .map(([date, revenue]) => revenue);

    if (sortedData.length < 3) {
      return {
        trend: "stable",
        strength: 0,
        description: "Insufficient data for trend analysis",
        forecast: [],
        confidence: 0,
      };
    }

    // Simple linear regression for trend
    const n = sortedData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = sortedData;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Determine trend
    let trend: "upward" | "downward" | "stable" | "volatile";
    const strength = Math.abs(slope);
    
    if (strength < 5) trend = "stable";
    else if (slope > 0) trend = "upward";
    else trend = "downward";
    
    // Check for volatility
    const predictions = x.map(val => slope * val + intercept);
    const errors = y.map((val, i) => Math.abs(val - predictions[i]));
    const avgError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const avgRevenue = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    if (avgError / avgRevenue > 0.3) trend = "volatile";
    
    // Generate forecast
    const forecast = [1, 2, 3].map(days => slope * (n + days - 1) + intercept);
    
    const confidence = Math.max(0, Math.min(100, 100 - (avgError / avgRevenue) * 100));
    
    let description = "";
    switch (trend) {
      case "upward":
        description = `Sales are trending upward with ${strength.toFixed(1)}% daily growth`;
        break;
      case "downward":
        description = `Sales are declining at ${strength.toFixed(1)}% daily rate`;
        break;
      case "stable":
        description = "Sales are relatively stable with minimal fluctuation";
        break;
      case "volatile":
        description = "Sales show high volatility with unpredictable patterns";
        break;
    }

    return {
      trend,
      strength,
      description,
      forecast,
      confidence,
    };
  }, [sales]);

  // Product insights
  const productInsights = useMemo((): ProductInsight[] => {
    if (!sales || !products) return [];

    return products.map(product => {
      const productSales = sales.filter(sale => sale.productId === product.id);
      const totalRevenue = productSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const totalQuantity = productSales.reduce((sum, sale) => sum + parseFloat(sale.quantity), 0);
      const avgSalePrice = productSales.length > 0 ? totalRevenue / totalQuantity : 0;
      
      const profit = parseFloat(product.sellingPrice) - parseFloat(product.purchasePrice);
      const profitability = parseFloat(product.sellingPrice) > 0 ? (profit / parseFloat(product.sellingPrice)) * 100 : 0;
      
      const salesVelocity = productSales.length; // Simplified
      const stockTurnover = parseFloat(product.stock) > 0 ? totalQuantity / parseFloat(product.stock) : 0;
      
      let performance: "excellent" | "good" | "average" | "poor";
      if (profitability > 30 && salesVelocity > 5) performance = "excellent";
      else if (profitability > 20 && salesVelocity > 3) performance = "good";
      else if (profitability > 10 && salesVelocity > 1) performance = "average";
      else performance = "poor";
      
      const recommendations: string[] = [];
      const opportunities: string[] = [];
      const risks: string[] = [];
      
      if (profitability < 15) {
        recommendations.push("Consider price optimization");
        risks.push("Low profit margin");
      }
      
      if (parseFloat(product.stock) < 5) {
        recommendations.push("Restock immediately");
        risks.push("Stock shortage risk");
      }
      
      if (salesVelocity > 10) {
        opportunities.push("High demand product");
        recommendations.push("Increase inventory levels");
      }
      
      if (stockTurnover > 2) {
        opportunities.push("Fast-moving inventory");
      }

      return {
        productId: product.id,
        productName: product.name,
        performance,
        salesVelocity,
        profitability,
        stockTurnover,
        recommendations,
        opportunities,
        risks,
      };
    }).sort((a, b) => {
      const scoreA = (a.profitability * 0.4) + (a.salesVelocity * 0.6);
      const scoreB = (b.profitability * 0.4) + (b.salesVelocity * 0.6);
      return scoreB - scoreA;
    });
  }, [sales, products]);

  // Performance metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const efficiency = Math.min(100, (parseFloat(dashboardStats?.dailyProfit || "0") / 100) * 100);
    const growth = Math.max(0, Math.min(100, trendAnalysis.strength * 10));
    const stability = Math.max(0, 100 - (trendAnalysis.trend === "volatile" ? 50 : 10));
    const profitability = Math.min(100, parseFloat(dashboardStats?.dailyMargin || "0"));
    const overall = (efficiency + growth + stability + profitability) / 4;

    return {
      efficiency,
      growth,
      stability,
      profitability,
      overall,
    };
  }, [dashboardStats, trendAnalysis]);

  const filteredInsights = businessInsights.filter(insight => 
    selectedCategory === "all" || insight.category === selectedCategory
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2" size={20} />
            Business Insights
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="mr-2 text-purple-500" size={20} />
              Business Insights & Analytics
            </div>
            <Badge variant="outline">
              {filteredInsights.length} insights
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{performanceMetrics.overall.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
              <Progress value={performanceMetrics.overall} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{performanceMetrics.profitability.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Profitability</div>
              <Progress value={performanceMetrics.profitability} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">{performanceMetrics.growth.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Growth</div>
              <Progress value={performanceMetrics.growth} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{performanceMetrics.stability.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Stability</div>
              <Progress value={performanceMetrics.stability} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{performanceMetrics.efficiency.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
              <Progress value={performanceMetrics.efficiency} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} />
            Sales Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {trendAnalysis.trend === "upward" && <ArrowUp className="text-green-500" size={20} />}
              {trendAnalysis.trend === "downward" && <ArrowDown className="text-red-500" size={20} />}
              {trendAnalysis.trend === "stable" && <Target className="text-blue-500" size={20} />}
              {trendAnalysis.trend === "volatile" && <Zap className="text-orange-500" size={20} />}
              <span className="font-medium">{trendAnalysis.description}</span>
            </div>
            <Badge variant={trendAnalysis.trend === "upward" ? "default" : trendAnalysis.trend === "downward" ? "destructive" : "secondary"}>
              {trendAnalysis.confidence.toFixed(0)}% confidence
            </Badge>
          </div>
          {trendAnalysis.forecast.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">3-day forecast:</span>
              {trendAnalysis.forecast.map((value, index) => (
                <span key={index} className="ml-2">{value.toFixed(2)}so'm</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Tabs */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights" data-testid="tab-business-insights">Key Insights</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-product-analysis">Product Analysis</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {/* Category Filter */}
          <div className="flex space-x-2 mb-4">
            {["all", "sales", "inventory", "pricing", "performance"].map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category as any)}
                data-testid={`filter-${category}`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>

          {/* Insights List */}
          <div className="space-y-3">
            {filteredInsights.map((insight) => (
              <Alert key={insight.id} className="border-l-4" style={{
                borderLeftColor: insight.type === "success" ? "#22c55e" : 
                               insight.type === "warning" ? "#f59e0b" : 
                               insight.type === "opportunity" ? "#3b82f6" : "#6b7280"
              }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold" data-testid={`insight-title-${insight.id}`}>
                          {insight.title}
                        </h4>
                        <Badge variant={getBadgeVariant(insight.impact)}>
                          {insight.impact} impact
                        </Badge>
                        <Badge variant="outline">{insight.category}</Badge>
                      </div>
                      <AlertDescription className="text-sm mb-2">
                        {insight.description}
                      </AlertDescription>
                      {insight.recommendation && (
                        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-500">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4">
            {productInsights.slice(0, 10).map((product) => (
              <Card key={product.productId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg" data-testid={`product-insight-name-${product.productId}`}>
                      {product.productName}
                    </h4>
                    <Badge variant={
                      product.performance === "excellent" ? "default" :
                      product.performance === "good" ? "secondary" :
                      product.performance === "average" ? "outline" : "destructive"
                    }>
                      {product.performance}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Sales Velocity</p>
                      <p className="font-bold">{product.salesVelocity} transactions</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Profitability</p>
                      <p className="font-bold text-profit">{product.profitability.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Stock Turnover</p>
                      <p className="font-bold">{product.stockTurnover.toFixed(1)}x</p>
                    </div>
                  </div>

                  {(product.opportunities.length > 0 || product.risks.length > 0 || product.recommendations.length > 0) && (
                    <div className="space-y-2">
                      {product.opportunities.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <Star className="text-yellow-500 mt-1" size={14} />
                          <div className="text-sm">
                            <strong>Opportunities:</strong> {product.opportunities.join(", ")}
                          </div>
                        </div>
                      )}
                      {product.risks.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="text-red-500 mt-1" size={14} />
                          <div className="text-sm">
                            <strong>Risks:</strong> {product.risks.join(", ")}
                          </div>
                        </div>
                      )}
                      {product.recommendations.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <Lightbulb className="text-blue-500 mt-1" size={14} />
                          <div className="text-sm">
                            <strong>Actions:</strong> {product.recommendations.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {filteredInsights
              .filter(insight => insight.actionable && insight.recommendation)
              .sort((a, b) => a.priority - b.priority)
              .map((insight) => (
                <Card key={insight.id} className="border-l-4 border-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold flex items-center">
                        {getIcon(insight.type)}
                        <span className="ml-2">{insight.title}</span>
                      </h4>
                      <div className="flex space-x-2">
                        <Badge variant={getBadgeVariant(insight.impact)}>
                          {insight.impact}
                        </Badge>
                        <Badge variant="outline">Priority {insight.priority}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {insight.description}
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-2 border-blue-500">
                      <p className="text-sm">
                        <strong>Recommended Action:</strong> {insight.recommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}