import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events";
import categoriesRouter from "./routes/categories";
import ticketTypesRouter from "./routes/ticket-types";
import usersRouter from "./users/User.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/ticket-types", ticketTypesRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;