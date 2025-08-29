import { Link, useLocation } from "wouter";
import { Home, Plus, ShoppingCart, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Dashboard", testId: "nav-dashboard" },
  { path: "/add-product", icon: Plus, label: "Add", testId: "nav-add-product" },
  { path: "/record-sale", icon: ShoppingCart, label: "Sales", testId: "nav-record-sale" },
  { path: "/reports", icon: BarChart3, label: "Reports", testId: "nav-reports" },
];

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-2 z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={item.testId}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
                  isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                )}
              >
                <Icon className="text-xl mb-1" size={20} />
                <span className="text-xs">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
