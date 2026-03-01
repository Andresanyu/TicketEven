"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.connectDatabase = connectDatabase;
exports.runSchemaMigrations = runSchemaMigrations;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config();
const dbPort = Number(process.env.DB_PORT ?? 5432);
const rawDbPassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;
if (rawDbPassword === undefined || rawDbPassword === null || String(rawDbPassword).trim() === "") {
    throw new Error("DB_PASSWORD no está configurado. Define DB_PASSWORD en backend/.env para conectar con PostgreSQL (Docker/local).");
}
const dbPassword = String(rawDbPassword);
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number.isNaN(dbPort) ? 5432 : dbPort,
    user: process.env.DB_USER ?? "postgres",
    database: process.env.DB_NAME ?? "postgres",
    password: dbPassword,
});
async function connectDatabase() {
    await exports.pool.query("SELECT 1");
}
async function runSchemaMigrations() {
    await exports.pool.query(`
    ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS contador_interes INTEGER DEFAULT 0
  `);
    await exports.pool.query(`
    UPDATE eventos
    SET contador_interes = 0
    WHERE contador_interes IS NULL
  `);
}
