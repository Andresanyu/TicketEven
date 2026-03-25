import { Request, Response } from "express";
import { UserService, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } from "./User.service";
import { AuthRequest } from "../middlewares/auth";

export class UserController {
    constructor(private readonly userService: UserService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            const users = await this.userService.getAllUsers();
            res.json(users);
        } catch (err) {
            console.error("Error fetching users:", err);
            res.status(500).json({ error: "Error al obtener los usuarios" });
        }
    };

    getSavedEventsByUserId = async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ error: "ID de usuario inválido" });
            return;
        }

        try {
            const events = await this.userService.getSavedEventsByUserId(id);
            res.json(events);
        } catch (err) {
            console.error("Error fetching user saved events:", err);
            res.status(500).json({ error: "Error al obtener los eventos guardados del usuario" });
        }
    };

    getSavedEventsForCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
        const userId = req.user!.id;

        try {
            const events = await this.userService.getSavedEventsByUserId(userId);
            res.json(events);
        } catch (err) {
            console.error("Error fetching authenticated user saved events:", err);
            res.status(500).json({ error: "Error al obtener los eventos guardados del usuario autenticado" });
        }
    };

    getSavedEventStatus = async (req: AuthRequest, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const eventId = Number(req.params.eventId);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            res.status(400).json({ error: "ID de evento inválido" });
            return;
        }

        try {
            const status = await this.userService.getSavedEventStatus(userId, eventId);
            res.json(status);
        } catch (err) {
            console.error("Error checking saved event status:", err);
            res.status(500).json({ error: "Error al validar el estado del guardado" });
        }
    };

    deleteSavedEvent = async (req: AuthRequest, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const eventId = Number(req.params.eventId);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            res.status(400).json({ error: "ID de evento inválido" });
            return;
        }

        try {
            await this.userService.deleteSavedEvent(userId, eventId);
            res.json({ message: "Evento guardado eliminado correctamente" });
        } catch (err) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ error: err.message });
                return;
            }
            console.error("Error deleting saved event:", err);
            res.status(500).json({ error: "Error al eliminar el guardado" });
        }
    };

    register = async (req: Request, res: Response): Promise<void> => {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            res.status(400).json({ error: "Todos los campos son obligatorios" });
            return;
        }

        try {
            const user = await this.userService.register(nombre, email, password);
            res.status(201).json(user);
        } catch (err) {
            if (err instanceof ConflictError) {
                res.status(409).json({ error: err.message });
                return;
            }
            console.error("Error registering user:", err);
            res.status(500).json({ error: "Error al registrar el usuario" });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;
        const JWT_SECRET = process.env.JWT_SECRET;
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

        if (!JWT_SECRET) {
            console.error("JWT_SECRET is not defined");
            res.status(500).json({ error: "Error de configuración del servidor" });
            return;
        }

        if (!email || !password) {
            res.status(400).json({ error: "Email y contraseña son obligatorios" });
            return;
        }

        try {
            const result = await this.userService.login(email, password, JWT_SECRET, JWT_EXPIRES_IN);
            res.json(result);
        } catch (err) {
            if (err instanceof UnauthorizedError) {
                res.status(401).json({ error: err.message });
                return;
            }
            if (err instanceof ForbiddenError) {
                res.status(403).json({ error: err.message });
                return;
            }
            console.error("Error during login:", err);
            res.status(500).json({ error: "Error al iniciar sesión" });
        }
    };
}