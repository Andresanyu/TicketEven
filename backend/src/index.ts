import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events";
import categoriesRouter from "./routes/categories";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`---> TicketEven API corriendo en http://localhost:${PORT}`);
});