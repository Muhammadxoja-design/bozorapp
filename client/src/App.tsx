import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FloatingActionButton } from "@/components/floating-action-button";
import { useThemeContext } from "@/components/theme-provider";
import { Moon, Sun, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";

import Dashboard from "@/pages/dashboard";
import AddProduct from "@/pages/add-product";
import RecordSale from "@/pages/record-sale";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function AppHeader() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <header className="bg-blue-600 dark:bg-blue-700 text-white p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <ChartLine size={24} />
        <h1 className="text-lg font-semibold">BizTracker Pro</h1>
      </div>
      <div className="flex items-center space-x-3">
        <Button
          data-testid="button-theme-toggle"
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-white hover:text-white"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/add-product" component={AddProduct} />
      <Route path="/record-sale" component={RecordSale} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen shadow-xl">
      <AppHeader />
      <main className="p-4">
        <Router />
      </main>
      <FloatingActionButton />
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
