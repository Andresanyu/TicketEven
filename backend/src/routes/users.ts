import { Router, Request, Response } from "express";
import { UserResponse, UserFavoritoResponse } from "../models/types";
import { pool } from "../config/database";
import bcrypt from "bcrypt";

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

const USERS_FAVORITOS_SELECT_QUERY = `
SELECT
    f.id AS favorito_id,
    f.fecha_agregado,
    u.id AS usuario_id,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    e.id AS evento_id,
    e.nombre AS evento_nombre,
    e.fecha AS evento_fecha,
    e.valor AS evento_valor
FROM favoritos f
JOIN usuarios u ON u.id = f.usuario_id
JOIN eventos e ON e.id = f.evento_id
`;

router.get("/", async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`${USERS_SELECT_QUERY} ORDER BY u.id DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Error al obtener los usuarios" });
    }
});

router.get("/:id/favorites", async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID de usuario inválido" });
    }

    try {
        const result = await pool.query(
        `${USERS_FAVORITOS_SELECT_QUERY}
        WHERE u.id = $1
        ORDER BY f.fecha_agregado DESC`,
        [id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching user favoritos:", err);
        res.status(500).json({ error: "Error al obtener los favoritos del usuario" });
    }
});

router.post("/favorite", async (req: Request, res: Response) => {
    const { usuario_id, evento_id } = req.body;

    if (
        !Number.isInteger(usuario_id) ||
        usuario_id <= 0 ||
        !Number.isInteger(evento_id) ||
        evento_id <= 0
    ) {
        return res.status(400).json({ error: "Datos inválidos" });
    }

    try {
        const result = await pool.query(
        `
        INSERT INTO favoritos (usuario_id, evento_id)
        VALUES ($1, $2)
        RETURNING *
        `,
        [usuario_id, evento_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error("Error creating favorito:", err);

        if (err.code === "23505") {
        return res.status(409).json({
            error: "El evento ya está marcado como favorito por este usuario"
        });
        }

        if (err.code === "23503") {
        return res.status(400).json({
            error: "Usuario o evento no existe"
        });
        }

        res.status(500).json({ error: "Error al crear el favorito" });
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
        `
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES ($1, $2, $3, 'externo')
        RETURNING id, nombre, email, rol, activo, fecha_registro
        `,
        [nombre, email, password_hash]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).json({ error: "Error al registrar el usuario" });
    }
});

export default router;