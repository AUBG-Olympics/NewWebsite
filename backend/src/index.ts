import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  app.get("/api/test", async (_req, res) => {
    res.json({ msg: "Hello from backend!" });
  });

  // Add your routes...

  app.listen(4000, () => console.log("Server running on port 4000"));
})();
