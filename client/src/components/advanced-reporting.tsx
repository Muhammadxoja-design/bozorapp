import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Calendar, Filter, TrendingUp, BarChart3, PieChart, Users, Target, Clock, RefreshCw, Settings, Mail, FileDown, Printer, Share2, Eye, Edit, Trash2, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Sale, Product, DashboardStats } from "@shared/schema";

interface AdvancedReportingProps {
  sales: Sale[];
  products: Product[];
  dashboardStats: DashboardStats;
  isLoading: boolean;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  type: "sales" | "inventory" | "financial" | "custom";
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    products?: string[];
    categories?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  metrics: string[];
  chartType: "line" | "bar" | "pie" | "area" | "table";
  schedule?: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    recipients: string[];
  };
  createdAt: Date;
  lastGenerated?: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: "sales" | "inventory" | "financial" | "performance";
  metrics: string[];
  chartType: "line" | "bar" | "pie" | "area" | "table";
  defaultFilters: any;
}

interface ExportOptions {
  format: "pdf" | "excel" | "csv" | "json";
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  sections: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "daily-sales",
    name: "Daily Sales Report",
    description: "Comprehensive daily sales overview with trends and insights",
    type: "sales",
    metrics: ["revenue", "profit", "transactions", "averageOrderValue"],
    chartType: "line",
    defaultFilters: { timeframe: "today" },
  },
  {
    id: "weekly-performance",
    name: "Weekly Performance Report",
    description: "Weekly business performance analysis with comparisons",
    type: "performance",
    metrics: ["revenue", "profit", "growth", "efficiency"],
    chartType: "bar",
    defaultFilters: { timeframe: "week" },
  },
  {
    id: "inventory-status",
    name: "Inventory Status Report",
    description: "Current inventory levels, stock movements, and reorder alerts",
    type: "inventory",
    metrics: ["stockLevels", "turnover", "lowStock", "outOfStock"],
    chartType: "table",
    defaultFilters: { includeAllProducts: true },
  },
  {
    id: "financial-summary",
    name: "Financial Summary Report",
    description: "Detailed financial analysis including profit margins and costs",
    type: "financial",
    metrics: ["revenue", "profit", "costs", "margins", "roi"],
    chartType: "pie",
    defaultFilters: { includeProjections: true },
  },
  {
    id: "product-performance",
    name: "Product Performance Report",
    description: "Individual product analysis with sales velocity and profitability",
    type: "sales",
    metrics: ["salesVelocity", "profitability", "customerDemand"],
    chartType: "bar",
    defaultFilters: { topProducts: 10 },
  },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

const reportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  type: z.enum(["sales", "inventory", "financial", "custom"]),
  dateRange: z.object({
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
  }),
  metrics: z.array(z.string()).min(1, "At least one metric is required"),
  chartType: z.enum(["line", "bar", "pie", "area", "table"]),
});

type ReportFormData = z.infer<typeof reportSchema>;

export function AdvancedReporting({ sales, products, dashboardStats, isLoading }: AdvancedReportingProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "custom" | "scheduled">("overview");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "pdf",
    includeCharts: true,
    includeRawData: false,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    sections: ["summary", "charts", "details"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reportForm = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "sales",
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      metrics: ["revenue"],
      chartType: "line",
    },
  });

  // Generate report data based on filters and metrics
  const generateReportData = useMemo(() => {
    return (report: Partial<CustomReport> | ReportTemplate) => {
      if (!sales || !products) return null;

      const startDate = 'dateRange' in report ? new Date(report.dateRange?.start || '') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = 'dateRange' in report ? new Date(report.dateRange?.end || '') : new Date();

      const filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= startDate && saleDate <= endDate;
      });

      const data = {
        summary: {
          totalRevenue: filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
          totalProfit: filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
          totalTransactions: filteredSales.length,
          averageOrderValue: filteredSales.length > 0 ? 
            filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0) / filteredSales.length : 0,
          profitMargin: 0,
          topProduct: "",
          salesGrowth: 0,
          activeProducts: products.filter(p => parseFloat(p.stock) > 0).length,
        },
        charts: {
          dailyTrends: [] as any[],
          productPerformance: [] as any[],
          categoryBreakdown: [] as any[],
          profitAnalysis: [] as any[],
        },
        details: {
          transactions: filteredSales.slice(0, 100),
          products: products,
          lowStockAlerts: products.filter(p => parseFloat(p.stock) < 5),
          insights: [] as string[],
        }
      };

      // Calculate profit margin
      data.summary.profitMargin = data.summary.totalRevenue > 0 ? 
        (data.summary.totalProfit / data.summary.totalRevenue) * 100 : 0;

      // Find top product
      const productSales = new Map<string, number>();
      filteredSales.forEach(sale => {
        productSales.set(sale.productId, (productSales.get(sale.productId) || 0) + parseFloat(sale.totalAmount));
      });
      const topProductId = Array.from(productSales.entries()).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];
      data.summary.topProduct = products.find(p => p.id === topProductId)?.name || "N/A";

      // Generate daily trends
      const dailyData = new Map<string, { revenue: number; profit: number; transactions: number }>();
      filteredSales.forEach(sale => {
        const date = sale.saleDate.toISOString().split('T')[0];
        const existing = dailyData.get(date) || { revenue: 0, profit: 0, transactions: 0 };
        existing.revenue += parseFloat(sale.totalAmount);
        existing.profit += parseFloat(sale.profit);
        existing.transactions += 1;
        dailyData.set(date, existing);
      });

      data.charts.dailyTrends = Array.from(dailyData.entries()).map(([date, metrics]) => ({
        date,
        revenue: metrics.revenue,
        profit: metrics.profit,
        transactions: metrics.transactions,
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Generate product performance data
      data.charts.productPerformance = Array.from(productSales.entries()).map(([productId, revenue]) => {
        const product = products.find(p => p.id === productId);
        const productProfitSales = filteredSales.filter(s => s.productId === productId);
        const profit = productProfitSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
        
        return {
          name: product?.name || "Unknown",
          revenue,
          profit,
          transactions: productProfitSales.length,
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // Generate insights
      if (data.summary.totalRevenue > 1000) {
        data.details.insights.push("Strong revenue performance this period");
      }
      if (data.summary.profitMargin > 25) {
        data.details.insights.push("Excellent profit margins maintained");
      }
      if (data.details.lowStockAlerts.length > 0) {
        data.details.insights.push(`${data.details.lowStockAlerts.length} products need restocking`);
      }

      return data;
    };
  }, [sales, products]);

  const handleCreateReport = (data: ReportFormData) => {
    const newReport: CustomReport = {
      id: `report-${Date.now()}`,
      name: data.name,
      description: data.description || "",
      type: data.type,
      dateRange: data.dateRange,
      filters: {},
      metrics: data.metrics,
      chartType: data.chartType,
      createdAt: new Date(),
    };

    setCustomReports(prev => [...prev, newReport]);
    setIsCreateDialogOpen(false);
    reportForm.reset();
    
    toast({
      title: "Success",
      description: "Custom report created successfully!",
    });
  };

  const handleGenerateReport = (report: ReportTemplate | CustomReport) => {
    const data = generateReportData(report);
    setPreviewData({ report, data });
    setIsPreviewDialogOpen(true);
  };

  const handleExportReport = async (format: "pdf" | "excel" | "csv" | "json") => {
    try {
      // In a real app, this would call an API to generate and download the report
      const reportData = previewData?.data || generateReportData({
        dateRange: exportOptions.dateRange,
        metrics: ["revenue", "profit", "transactions"],
        chartType: "table"
      });

      // Simulate export
      const filename = `business-report-${new Date().toISOString().split('T')[0]}.${format}`;
      
      toast({
        title: "Export Started",
        description: `Generating ${format.toUpperCase()} report: ${filename}`,
      });

      // In a real implementation, you would:
      // 1. Send reportData to backend
      // 2. Generate the file in the specified format
      // 3. Return download link or stream the file
      
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: `Report downloaded as ${filename}`,
        });
      }, 2000);

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case "sales": return <TrendingUp className="text-green-500" size={20} />;
      case "inventory": return <Package className="text-blue-500" size={20} />;
      case "financial": return <DollarSign className="text-purple-500" size={20} />;
      case "performance": return <BarChart3 className="text-orange-500" size={20} />;
      default: return <FileText className="text-gray-500" size={20} />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2" size={20} />
            Advanced Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 text-blue-500" size={20} />
              Advanced Reporting & Analytics
            </CardTitle>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="button-create-custom-report"
              >
                <Plus className="mr-2" size={16} />
                Create Report
              </Button>
              
              <Select value={exportOptions.format} onValueChange={(value) => 
                setExportOptions(prev => ({ ...prev, format: value as any }))
              }>
                <SelectTrigger className="w-32" data-testid="select-export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => handleExportReport(exportOptions.format)}
                data-testid="button-export-report"
              >
                <Download className="mr-2" size={16} />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-reports-overview">Overview</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-report-templates">Templates</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom-reports">Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled-reports">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reports Generated</p>
                    <p className="text-2xl font-bold" data-testid="text-reports-generated">
                      {customReports.length}
                    </p>
                  </div>
                  <FileText className="text-blue-500" size={24} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
                    <p className="text-2xl font-bold" data-testid="text-data-points">
                      {sales.length + products.length}
                    </p>
                  </div>
                  <BarChart3 className="text-green-500" size={24} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Templates Available</p>
                    <p className="text-2xl font-bold" data-testid="text-templates-available">
                      {REPORT_TEMPLATES.length}
                    </p>
                  </div>
                  <Settings className="text-purple-500" size={24} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Export</p>
                    <p className="text-sm font-medium" data-testid="text-last-export">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <Download className="text-orange-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reporting Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customReports.slice(0, 5).map((report, index) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getReportIcon(report.type)}
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-gray-500">
                          Created {report.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report)}
                        data-testid={`view-report-${report.id}`}
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`export-report-${report.id}`}
                      >
                        <Download size={14} className="mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                ))}
                {customReports.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="mx-auto mb-4" size={48} />
                    <p className="text-lg font-medium">No custom reports yet</p>
                    <p className="text-sm">Create your first custom report to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {REPORT_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      {getReportIcon(template.type)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2" data-testid={`template-name-${template.id}`}>
                          {template.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{template.type}</Badge>
                          <Badge variant="secondary">{template.chartType}</Badge>
                          {template.metrics.slice(0, 3).map(metric => (
                            <Badge key={metric} variant="outline" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                          {template.metrics.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.metrics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleGenerateReport(template)}
                        data-testid={`generate-template-${template.id}`}
                      >
                        <BarChart3 className="mr-2" size={16} />
                        Generate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsCreateDialogOpen(true);
                        }}
                        data-testid={`customize-template-${template.id}`}
                      >
                        <Edit className="mr-2" size={16} />
                        Customize
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {customReports.length > 0 ? (
            <div className="grid gap-4">
              {customReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        {getReportIcon(report.type)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{report.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {report.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline">{report.type}</Badge>
                            <Badge variant="secondary">{report.chartType}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {report.dateRange.start} to {report.dateRange.end}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Created: {report.createdAt.toLocaleDateString()}
                            {report.lastGenerated && (
                              <span> • Last generated: {report.lastGenerated.toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button
                          onClick={() => handleGenerateReport(report)}
                          data-testid={`generate-custom-${report.id}`}
                        >
                          <Eye className="mr-2" size={16} />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          data-testid={`edit-custom-${report.id}`}
                        >
                          <Edit className="mr-2" size={16} />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCustomReports(prev => prev.filter(r => r.id !== report.id))}
                          data-testid={`delete-custom-${report.id}`}
                        >
                          <Trash2 className="mr-1" size={14} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto mb-4 text-gray-400" size={64} />
                <h3 className="text-lg font-semibold mb-2">No Custom Reports</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create custom reports tailored to your specific business needs
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2" size={16} />
                  Create Your First Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="mx-auto mb-4" size={48} />
                <p className="text-lg font-medium">No Scheduled Reports</p>
                <p className="text-sm mb-4">Set up automatic report generation and delivery</p>
                <Button variant="outline">
                  <Settings className="mr-2" size={16} />
                  Configure Scheduling
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Report Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
          </DialogHeader>
          
          <Form {...reportForm}>
            <form onSubmit={reportForm.handleSubmit(handleCreateReport)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reportForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Name</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-report-name"
                          placeholder="My Custom Report"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={reportForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={reportForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="textarea-report-description"
                        placeholder="Describe what this report will show..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reportForm.control}
                  name="dateRange.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-report-start-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={reportForm.control}
                  name="dateRange.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-report-end-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={reportForm.control}
                name="chartType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chart Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-chart-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <Button type="submit" data-testid="button-create-report">
                  Create Report
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Report Preview: {previewData?.report.name}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport("pdf")}
                >
                  <Download className="mr-1" size={14} />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport("excel")}
                >
                  <FileDown className="mr-1" size={14} />
                  Export Excel
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-6">
              {/* Summary Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {previewData.data.summary.totalRevenue.toFixed(2)} so'm
                      </p>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {previewData.data.summary.totalProfit.toFixed(2)} so'm
                      </p>
                      <p className="text-sm text-gray-600">Total Profit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {previewData.data.summary.totalTransactions}
                      </p>
                      <p className="text-sm text-gray-600">Transactions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {previewData.data.summary.profitMargin.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Profit Margin</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Section */}
              {previewData.data.charts.dailyTrends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={previewData.data.charts.dailyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#3B82F6" name="Revenue" />
                          <Line type="monotone" dataKey="profit" stroke="#10B981" name="Profit" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product Performance */}
              {previewData.data.charts.productPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={previewData.data.charts.productPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                          <Bar dataKey="profit" fill="#10B981" name="Profit" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insights */}
              {previewData.data.details.insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {previewData.data.details.insights.map((insight, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <Lightbulb className="text-blue-500" size={16} />
                          <span className="text-sm">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}