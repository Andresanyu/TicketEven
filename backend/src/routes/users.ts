import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, authorizeAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

const USERS_SELECT_QUERY = `
SELECT
    u.id,
    u.nombre,
    u.email,
    u.rol,
    u.activo,
    u.fecha_registro
FROM usuarios u
`;

const USERS_SAVED_EVENTS_SELECT_QUERY = `
SELECT
    se.saved_at,
    u.id AS usuario_id,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    e.id AS evento_id,
    e.nombre AS evento_nombre,
    e.fecha AS evento_fecha,
    e.valor AS evento_valor
FROM saved_events se
JOIN usuarios u ON u.id = se.user_id
JOIN eventos e ON e.id = se.event_id
`;

router.get("/", authenticateToken, authorizeAdmin, async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`${USERS_SELECT_QUERY} ORDER BY u.id DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Error al obtener los usuarios" });
    }
});

router.get("/:id/saved-events", authenticateToken, async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID de usuario inválido" });
    }

    try {
        const result = await pool.query(
            `${USERS_SAVED_EVENTS_SELECT_QUERY}
            WHERE u.id = $1
            ORDER BY se.saved_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching user saved events:", err);
        res.status(500).json({ error: "Error al obtener los eventos guardados del usuario" });
    }
});

router.get("/saved-events", authenticateToken, async (req: AuthRequest, res: Response) => {
    const usuario_id = req.user!.id;

    try {
        const result = await pool.query(
            `${USERS_SAVED_EVENTS_SELECT_QUERY}
            WHERE u.id = $1
            ORDER BY se.saved_at DESC`,
            [usuario_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching authenticated user saved events:", err);
        res.status(500).json({ error: "Error al obtener los eventos guardados del usuario autenticado" });
    }
});

router.get("/saved-events/:eventId/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    const usuario_id = req.user!.id;
    const evento_id = Number(req.params.eventId);

    if (!Number.isInteger(evento_id) || evento_id <= 0) {
        return res.status(400).json({ error: "ID de evento inválido" });
    }

    try {
        const result = await pool.query(
            `SELECT event_id
             FROM saved_events
             WHERE user_id = $1 AND event_id = $2
             LIMIT 1`,
            [usuario_id, evento_id]
        );

        res.json({
            isSaved: Number(result.rowCount ?? 0) > 0,
        });
    } catch (err) {
        console.error("Error checking saved event status:", err);
        res.status(500).json({ error: "Error al validar el estado del guardado" });
    }
});

router.delete("/saved-events/:eventId", authenticateToken, async (req: AuthRequest, res: Response) => {
    const usuario_id = req.user!.id;
    const evento_id = Number(req.params.eventId);

    if (!Number.isInteger(evento_id) || evento_id <= 0) {
        return res.status(400).json({ error: "ID de evento inválido" });
    }

    try {
        const result = await pool.query(
            `DELETE FROM saved_events
             WHERE user_id = $1 AND event_id = $2
             RETURNING event_id`,
            [usuario_id, evento_id]
        );

        if (!result.rowCount) {
            return res.status(404).json({ error: "Guardado no encontrado" });
        }

        res.json({ message: "Evento guardado eliminado correctamente" });
    } catch (err) {
        console.error("Error deleting saved event:", err);
        res.status(500).json({ error: "Error al eliminar el guardado" });
    }
});

router.post("/register", async (req: Request, res: Response) => {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const existingUser = await pool.query(
            "SELECT id FROM usuarios WHERE email = $1",
            [email]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            return res.status(409).json({ error: "El email ya está registrado" });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
                `INSERT INTO usuarios (nombre, email, password_hash, rol)
                VALUES ($1, $2, $3, 'externo')
                RETURNING id, nombre, email, rol, activo, fecha_registro`,
            [nombre, email, password_hash]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).json({ error: "Error al registrar el usuario" });
    }
});

router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET no está definido en las variables de entorno");
    }

    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    try {
        const result = await pool.query(
                `SELECT id, nombre, email, password_hash, rol, activo
                FROM usuarios
                WHERE email = $1`,
            [email]
        );

        if (!result.rowCount) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const user = result.rows[0];

        if (!user.activo) {
            return res.status(403).json({ error: "Usuario inactivo" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
        );

        res.json({ message: "Login exitoso", token });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

export default router;