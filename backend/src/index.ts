import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events";
import usersRouter from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`---> TicketEven API corriendo en http://localhost:${PORT}`);
});