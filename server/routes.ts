import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertSaleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // Sale routes
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      
      // Verify product exists and has enough stock
      const product = await storage.getProduct(saleData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (parseFloat(product.stock) < parseFloat(saleData.quantity)) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      
      const sale = await storage.createSale(saleData);
      res.json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid sale data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to record sale" });
      }
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/weekly", async (req, res) => {
    try {
      const weeklyData = await storage.getWeeklyData();
      res.json(weeklyData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly data" });
    }
  });

  // Product stock update route
  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
      const { id } = req.params;
      const { newStock } = req.body;
      
      if (!newStock || isNaN(parseFloat(newStock))) {
        return res.status(400).json({ message: "Valid stock amount is required" });
      }
      
      await storage.updateProductStock(id, newStock);
      res.json({ message: "Stock updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Daily report routes
  app.get("/api/reports/daily/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const report = await storage.getDailyReport(date);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily report" });
    }
  });

  app.post("/api/reports/daily/submit", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      
      // Check if it's after 6 PM
      if (currentHour < 18) {
        return res.status(400).json({ message: "Daily report can only be submitted after 6:00 PM" });
      }
      
      // Get today's sales data
      const todaySales = await storage.getSalesByDate(today);
      const totalSales = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const totalProfit = todaySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
      const totalCost = totalSales - totalProfit;
      
      // Check if report already exists
      const existingReport = await storage.getDailyReport(today);
      if (existingReport) {
        // Update existing report
        await storage.updateDailyReport(today, {
          totalSales: totalSales.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalCost: totalCost.toFixed(2),
          isSubmitted: true,
        });
        res.json({ message: "Daily report updated and submitted successfully" });
      } else {
        // Create new report
        const report = await storage.createDailyReport({
          date: today,
          totalSales: totalSales.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalCost: totalCost.toFixed(2),
          isSubmitted: true,
        });
        res.json({ message: "Daily report submitted successfully", report });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to submit daily report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
