"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.connectDatabase = connectDatabase;
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
dotenv_1.default.config();
const dbPort = Number(process.env.DB_PORT ?? 5432);
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number.isNaN(dbPort) ? 5432 : dbPort,
    user: process.env.DB_USER ?? "postgres",
    database: process.env.DB_NAME ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
});
async function connectDatabase() {
    await exports.pool.query("SELECT 1");
}
