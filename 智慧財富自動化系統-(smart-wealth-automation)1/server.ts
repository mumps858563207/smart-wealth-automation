import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory storage for demo purposes (could use better-sqlite3 if persistence is needed)
  const db = {
    niches: [
      { id: 1, name: "AI 工具評測", trend: "上升", competition: "中" },
      { id: 2, name: "永續生活指南", trend: "穩定", competition: "低" },
      { id: 3, name: "加密貨幣策略", trend: "劇烈", competition: "高" }
    ],
    contents: [],
    campaigns: []
  };

  // API Routes
  app.get("/api/niches", (req, res) => {
    res.json(db.niches);
  });

  app.get("/api/contents", (req, res) => {
    res.json(db.contents);
  });

  app.post("/api/contents", (req, res) => {
    const newContent = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
      status: "draft"
    };
    db.contents.push(newContent);
    res.status(201).json(newContent);
  });

  app.get("/api/analytics", (req, res) => {
    // Mock analytics data
    const data = [
      { name: "Mon", views: 400, clicks: 240, revenue: 120 },
      { name: "Tue", views: 300, clicks: 139, revenue: 98 },
      { name: "Wed", views: 200, clicks: 980, revenue: 390 },
      { name: "Thu", views: 278, clicks: 390, revenue: 190 },
      { name: "Fri", views: 189, clicks: 480, revenue: 210 },
      { name: "Sat", views: 239, clicks: 380, revenue: 250 },
      { name: "Sun", views: 349, clicks: 430, revenue: 210 },
    ];
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
