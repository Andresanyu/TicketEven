"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const events_1 = __importDefault(require("./routes/events"));
const categories_1 = __importDefault(require("./routes/categories"));
const database_1 = require("./config/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/events", events_1.default);
app.use("/api/categories", categories_1.default);
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
async function bootstrap() {
    try {
        await (0, database_1.connectDatabase)();
        await (0, database_1.runSchemaMigrations)();
        app.listen(PORT, () => {
            console.log(`---> TicketEven API corriendo en http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error("No se pudo iniciar la API por error de base de datos:", err);
        process.exit(1);
    }
}
bootstrap();
