import express from "express";
import cors from "cors";
import eventsRouter from "./events/event.routes";
import categoriesRouter from "./categories/category.routes";
import ticketTypesRouter from "./ticketTypes/ticketType.routes";
import usersRouter from "./users/user.routes";

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