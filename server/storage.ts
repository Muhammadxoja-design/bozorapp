import { type Product, type InsertProduct, type Sale, type InsertSale, type DailyReport, type InsertDailyReport, type DashboardStats, type WeeklyData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductStock(id: string, newStock: string): Promise<void>;

  // Sale operations
  getSales(): Promise<Sale[]>;
  getSalesByDate(date: string): Promise<Sale[]>;
  getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;

  // Report operations
  getDailyReport(date: string): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(date: string, updates: Partial<DailyReport>): Promise<void>;

  // Dashboard operations
  getDashboardStats(): Promise<DashboardStats>;
  getWeeklyData(): Promise<WeeklyData>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private sales: Map<string, Sale>;
  private dailyReports: Map<string, DailyReport>;

  constructor() {
    this.products = new Map();
    this.sales = new Map();
    this.dailyReports = new Map();
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      createdAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProductStock(id: string, newStock: string): Promise<void> {
    const product = this.products.get(id);
    if (product) {
      product.stock = newStock;
      this.products.set(id, product);
    }
  }

  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values()).sort((a, b) => 
      new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
  }

  async getSalesByDate(date: string): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(sale => 
      sale.saleDate.toISOString().split('T')[0] === date
    );
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(sale => {
      const saleDate = sale.saleDate.toISOString().split('T')[0];
      return saleDate >= startDate && saleDate <= endDate;
    });
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const id = randomUUID();
    const sale: Sale = {
      ...insertSale,
      id,
      saleDate: new Date(),
    };
    this.sales.set(id, sale);

    // Update product stock
    const product = this.products.get(insertSale.productId);
    if (product) {
      const newStock = (parseFloat(product.stock) - parseFloat(insertSale.quantity)).toString();
      await this.updateProductStock(insertSale.productId, newStock);
    }

    return sale;
  }

  async getDailyReport(date: string): Promise<DailyReport | undefined> {
    return this.dailyReports.get(date);
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    const id = randomUUID();
    const report: DailyReport = {
      ...insertReport,
      id,
      submittedAt: insertReport.isSubmitted ? new Date() : null,
    };
    this.dailyReports.set(insertReport.date, report);
    return report;
  }

  async updateDailyReport(date: string, updates: Partial<DailyReport>): Promise<void> {
    const report = this.dailyReports.get(date);
    if (report) {
      if (updates.isSubmitted && !report.isSubmitted) {
        updates.submittedAt = new Date();
      }
      Object.assign(report, updates);
      this.dailyReports.set(date, report);
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = await this.getSalesByDate(today);
    
    const dailyProfit = todaySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const dailySales = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const dailyCost = dailySales - dailyProfit;
    const dailyMargin = dailySales > 0 ? (dailyProfit / dailySales) * 100 : 0;

    // Calculate weekly stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyStartDate = weekAgo.toISOString().split('T')[0];
    
    const weeklySales = await this.getSalesByDateRange(weeklyStartDate, today);
    const weeklyProfit = weeklySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);

    return {
      dailyProfit: dailyProfit.toFixed(2),
      dailySales: dailySales.toFixed(2),
      dailyCost: dailyCost.toFixed(2),
      dailyMargin: dailyMargin.toFixed(1),
      weeklyProfit: weeklyProfit.toFixed(2),
      productCount: this.products.size,
    };
  }

  async getWeeklyData(): Promise<WeeklyData> {
    const weeklyData: WeeklyData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = await this.getSalesByDate(dateStr);
      const dayProfit = daySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
      const daySalesAmount = daySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      
      weeklyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        profit: dayProfit.toFixed(2),
        sales: daySalesAmount.toFixed(2),
      });
    }
    
    return weeklyData;
  }
}

export const storage = new MemStorage();
