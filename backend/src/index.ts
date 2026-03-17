import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events";
import categoriesRouter from "./routes/categories";
import ticketTypesRouter from "./routes/ticket-types";
import usersRouter from "./routes/users";
import { connectDatabase, runSchemaMigrations } from "./config/database";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/ticket-types", ticketTypesRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    await connectDatabase();
    await runSchemaMigrations();

    app.listen(PORT, () => {
      console.log(`---> EventPro API corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar la API por error de base de datos:", err);
    process.exit(1);
  }
}

bootstrap();