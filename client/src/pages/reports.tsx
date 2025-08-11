import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Calendar, Upload, X, FileText, Download } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WeeklyData } from "@shared/schema";

export default function Reports() {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: weeklyData } = useQuery<WeeklyData>({
    queryKey: ["/api/dashboard/weekly"],
  });

  // Update current hour every minute to check for report availability
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const submitDailyReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/daily/submit", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Daily report submitted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit daily report",
        variant: "destructive",
      });
    },
  });

  const handleSubmitDailyReport = () => {
    if (currentHour < 18) {
      toast({
        title: "Not Available",
        description: "Daily report can only be submitted after 6:00 PM",
        variant: "destructive",
      });
      return;
    }
    submitDailyReportMutation.mutate();
  };

  const handleExport = (type: 'weekly' | 'monthly') => {
    // This would typically generate and download a report file
    toast({
      title: "Export Started",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} report export will be available shortly`,
    });
  };

  const calculateWeeklyTotals = () => {
    if (!weeklyData) return { totalProfit: '0.00', totalSales: '0.00' };
    
    const totalProfit = weeklyData.reduce((sum, day) => sum + parseFloat(day.profit), 0);
    const totalSales = weeklyData.reduce((sum, day) => sum + parseFloat(day.sales), 0);
    
    return {
      totalProfit: totalProfit.toFixed(2),
      totalSales: totalSales.toFixed(2),
    };
  };

  const weeklyTotals = calculateWeeklyTotals();
  const isReportAvailable = currentHour >= 18;

  return (
    <div className="pb-20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart3 className="text-purple-500 mr-2" size={20} />
          Business Reports
        </h3>
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-close">
            <X size={16} />
          </Button>
        </Link>
      </div>

      {/* Daily Report Submit */}
      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-lg">Daily Report</h4>
              <p className="text-purple-100 text-sm">
                {isReportAvailable 
                  ? "Submit your end-of-day report" 
                  : `Available at 6:00 PM (${18 - currentHour} hours remaining)`
                }
              </p>
            </div>
            <Calendar className="text-2xl text-purple-200" size={32} />
          </div>
          <Button
            data-testid="button-submit-daily-report"
            onClick={handleSubmitDailyReport}
            disabled={!isReportAvailable || submitDailyReportMutation.isPending}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="mr-2" size={16} />
            {submitDailyReportMutation.isPending 
              ? "Submitting..." 
              : isReportAvailable 
                ? "Submit Today's Report" 
                : "Not Available Yet"
            }
          </Button>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <div className="p-4 border-b dark:border-gray-700">
          <h4 className="font-semibold flex items-center">
            <Calendar className="text-blue-500 mr-2" size={16} />
            This Week's Performance
          </h4>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-profit" data-testid="text-weekly-total-profit">
                ${weeklyTotals.totalProfit}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Profit</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-weekly-total-sales">
                ${weeklyTotals.totalSales}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
            </div>
          </div>
          
          {/* Daily Breakdown */}
          <div className="space-y-2">
            <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300">Daily Breakdown</h5>
            {weeklyData?.map((day, index) => (
              <div 
                key={index} 
                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
                data-testid={`weekly-day-${index}`}
              >
                <span className="text-sm">{day.day}</span>
                <span className="text-sm font-semibold text-profit">${day.profit}</span>
              </div>
            )) || (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                <FileText className="mx-auto mb-2" size={32} />
                <p>No weekly data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Download className="text-green-500 mr-2" size={16} />
            Export Reports
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Button
              data-testid="button-export-weekly"
              onClick={() => handleExport('weekly')}
              variant="outline"
              className="flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50"
            >
              <FileText className="mr-2" size={16} />
              Weekly
            </Button>
            <Button
              data-testid="button-export-monthly"
              onClick={() => handleExport('monthly')}
              variant="outline"
              className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              <FileText className="mr-2" size={16} />
              Monthly
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
