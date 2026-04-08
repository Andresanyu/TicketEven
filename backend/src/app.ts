import express from "express";
import cors from "cors";
import eventsRouter from "./events/event.routes";
import categoriesRouter from "./categories/category.routes";
import ticketTypesRouter from "./ticketTypes/ticketType.routes";
import usersRouter from "./users/user.routes";
import purchaseRouter from "./purchases/purchase.routes";
import adminRouter from "./admin/admin.routes";
import { createTicketRouter } from "./tickets/ticket.routes";
import { pool } from "./config/database";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/ticket-types", ticketTypesRouter);
app.use("/api/users", usersRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/admin", adminRouter);
app.use("/api/tickets", createTicketRouter(pool));

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;