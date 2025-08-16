// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  products;
  sales;
  dailyReports;
  constructor() {
    this.products = /* @__PURE__ */ new Map();
    this.sales = /* @__PURE__ */ new Map();
    this.dailyReports = /* @__PURE__ */ new Map();
  }
  async getProducts() {
    return Array.from(this.products.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getProduct(id) {
    return this.products.get(id);
  }
  async createProduct(insertProduct) {
    const id = randomUUID();
    const product = {
      ...insertProduct,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.products.set(id, product);
    return product;
  }
  async updateProductStock(id, newStock) {
    const product = this.products.get(id);
    if (product) {
      product.stock = newStock;
      this.products.set(id, product);
    }
  }
  async getSales() {
    return Array.from(this.sales.values()).sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
  }
  async getSalesByDate(date) {
    return Array.from(this.sales.values()).filter(
      (sale) => sale.saleDate.toISOString().split("T")[0] === date
    );
  }
  async getSalesByDateRange(startDate, endDate) {
    return Array.from(this.sales.values()).filter((sale) => {
      const saleDate = sale.saleDate.toISOString().split("T")[0];
      return saleDate >= startDate && saleDate <= endDate;
    });
  }
  async createSale(insertSale) {
    const id = randomUUID();
    const sale = {
      ...insertSale,
      id,
      saleDate: /* @__PURE__ */ new Date()
    };
    this.sales.set(id, sale);
    const product = this.products.get(insertSale.productId);
    if (product) {
      const newStock = (parseFloat(product.stock) - parseFloat(insertSale.quantity)).toString();
      await this.updateProductStock(insertSale.productId, newStock);
    }
    return sale;
  }
  async getDailyReport(date) {
    return this.dailyReports.get(date);
  }
  async createDailyReport(insertReport) {
    const id = randomUUID();
    const report = {
      ...insertReport,
      id,
      submittedAt: insertReport.isSubmitted ? /* @__PURE__ */ new Date() : null
    };
    this.dailyReports.set(insertReport.date, report);
    return report;
  }
  async updateDailyReport(date, updates) {
    const report = this.dailyReports.get(date);
    if (report) {
      if (updates.isSubmitted && !report.isSubmitted) {
        updates.submittedAt = /* @__PURE__ */ new Date();
      }
      Object.assign(report, updates);
      this.dailyReports.set(date, report);
    }
  }
  async getDashboardStats() {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todaySales = await this.getSalesByDate(today);
    const dailyProfit = todaySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const dailySales = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const dailyCost = dailySales - dailyProfit;
    const dailyMargin = dailySales > 0 ? dailyProfit / dailySales * 100 : 0;
    const weekAgo = /* @__PURE__ */ new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyStartDate = weekAgo.toISOString().split("T")[0];
    const weeklySales = await this.getSalesByDateRange(weeklyStartDate, today);
    const weeklyProfit = weeklySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    return {
      dailyProfit: dailyProfit.toFixed(2),
      dailySales: dailySales.toFixed(2),
      dailyCost: dailyCost.toFixed(2),
      dailyMargin: dailyMargin.toFixed(1),
      weeklyProfit: weeklyProfit.toFixed(2),
      productCount: this.products.size
    };
  }
  async getWeeklyData() {
    const weeklyData = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const daySales = await this.getSalesByDate(dateStr);
      const dayProfit = daySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
      const daySalesAmount = daySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      weeklyData.push({
        day: date.toLocaleDateString("en-US", { weekday: "long" }),
        profit: dayProfit.toFixed(2),
        sales: daySalesAmount.toFixed(2)
      });
    }
    return weeklyData;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  stock: decimal("stock", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 10, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").defaultNow().notNull()
});
var dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull(),
  totalProfit: decimal("total_profit", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  isSubmitted: boolean("is_submitted").notNull().default(false),
  submittedAt: timestamp("submitted_at")
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true
});
var insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  saleDate: true
});
var insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  submittedAt: true
});

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/products", async (req, res) => {
    try {
      const products2 = await storage.getProducts();
      res.json(products2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  app2.post("/api/products", async (req, res) => {
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
  app2.get("/api/sales", async (req, res) => {
    try {
      const sales2 = await storage.getSales();
      res.json(sales2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });
  app2.post("/api/sales", async (req, res) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
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
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/dashboard/weekly", async (req, res) => {
    try {
      const weeklyData = await storage.getWeeklyData();
      res.json(weeklyData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly data" });
    }
  });
  app2.patch("/api/products/:id/stock", async (req, res) => {
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
  app2.get("/api/reports/daily/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const report = await storage.getDailyReport(date);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily report" });
    }
  });
  app2.post("/api/reports/daily/submit", async (req, res) => {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      if (currentHour < 18) {
        return res.status(400).json({ message: "Daily report can only be submitted after 6:00 PM" });
      }
      const todaySales = await storage.getSalesByDate(today);
      const totalSales = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const totalProfit = todaySales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
      const totalCost = totalSales - totalProfit;
      const existingReport = await storage.getDailyReport(today);
      if (existingReport) {
        await storage.updateDailyReport(today, {
          totalSales: totalSales.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalCost: totalCost.toFixed(2),
          isSubmitted: true
        });
        res.json({ message: "Daily report updated and submitted successfully" });
      } else {
        const report = await storage.createDailyReport({
          date: today,
          totalSales: totalSales.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalCost: totalCost.toFixed(2),
          isSubmitted: true
        });
        res.json({ message: "Daily report submitted successfully", report });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to submit daily report" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "localhost",
    // yoki 'localhost'
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
