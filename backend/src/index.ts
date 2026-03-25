import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase, runSchemaMigrations } from "./config/database";

const PORT = process.env.PORT || 3001;

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