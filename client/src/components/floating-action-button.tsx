import { useState } from "react";
import { Plus, PlusCircle, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleActions = () => {
    setIsOpen(!isOpen);
  };

  const closeActions = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <button
        data-testid="fab-main"
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        onClick={toggleActions}
      >
        <Plus className={cn("text-xl transition-transform", isOpen && "rotate-45")} size={24} />
      </button>
      
      {/* Quick Actions Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 -z-10"
            onClick={closeActions}
          />
          
          {/* Menu */}
          <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-2 w-48 animate-in fade-in-0 zoom-in-95 duration-200">
            <Link href="/add-product">
              <button
                data-testid="fab-add-product"
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
                onClick={closeActions}
              >
                <PlusCircle className="text-blue-500 mr-3" size={20} />
                Add Product
              </button>
            </Link>
            <Link href="/record-sale">
              <button
                data-testid="fab-record-sale"
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
                onClick={closeActions}
              >
                <ShoppingCart className="text-green-500 mr-3" size={20} />
                Record Sale
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
