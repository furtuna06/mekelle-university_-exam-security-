import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { testMysqlConnection } from "./src/mysql.js";
import mysqlRoutes from "./src/mysqlRoutes.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use("/api", mysqlRoutes);

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // MySQL health check
  app.get("/api/db-health", async (req, res) => {
    try {
      await testMysqlConnection();
      res.json({ status: "ok", database: "mysql" });
    } catch (error) {
      console.error("MySQL health check failed:", error);
      res.status(500).json({ status: "error", message: "MySQL connection failed", details: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
}

startServer();
