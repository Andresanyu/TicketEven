import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { IUserRepository } from "./User.repository.interface";
import { User, UserRow, SavedEventRow } from "./user.types";

const SALT_ROUNDS = 10;

export class UserService {
    constructor(private readonly userRepository: IUserRepository) {}

    async getAllUsers(): Promise<User[]> {
        return this.userRepository.findAll();
    }

    async getSavedEventsByUserId(userId: number): Promise<SavedEventRow[]> {
        return this.userRepository.findSavedEventsByUserId(userId);
    }

    async getSavedEventStatus(userId: number, eventId: number): Promise<{ isSaved: boolean }> {
        const saved = await this.userRepository.findSavedEvent(userId, eventId);
        return { isSaved: saved !== null };
    }

    async deleteSavedEvent(userId: number, eventId: number): Promise<void> {
        const deleted = await this.userRepository.deleteSavedEvent(userId, eventId);

        if (!deleted) {
            throw new NotFoundError("Guardado no encontrado");
        }
    }

    async register(nombre: string, email: string, password: string): Promise<User> {
        const existing = await this.userRepository.findByEmail(email);

        if (existing) {
            throw new ConflictError("El email ya está registrado");
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        return this.userRepository.create({ nombre, email, password_hash });
    }

    async login(
        email: string,
        password: string,
        jwtSecret: string,
        jwtExpiresIn: string
    ): Promise<{ message: string; token: string }> {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new UnauthorizedError("Credenciales inválidas");
        }

        if (!user.activo) {
            throw new ForbiddenError("Usuario inactivo");
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash!);

        if (!passwordMatch) {
            throw new UnauthorizedError("Credenciales inválidas");
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre, email: user.email },
            jwtSecret,
            { expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"] }
        );

        return { message: "Login exitoso", token };
    }
}

// ---------------------------------------------------------------------------
// Domain errors — kept here since they're user-domain specific.
// Move to a shared errors/ module if other domains need them.
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ForbiddenError";
    }
}