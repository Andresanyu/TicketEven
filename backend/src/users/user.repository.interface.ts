import { User, UserRow, SavedEventRow, CreateUserDTO } from './user.types';

export interface IUserRepository {
  findAll(): Promise<UserRow[]>;
  findById(id: number): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  create(dto: CreateUserDTO): Promise<UserRow>;

  findSavedEventsByUserId(userId: number): Promise<SavedEventRow[]>;
  findSavedEvent(userId: number, eventId: number): Promise<{ event_id: number } | null>;
  deleteSavedEvent(userId: number, eventId: number): Promise<boolean>;
}
