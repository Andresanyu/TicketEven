import { AdminGlobalMetrics } from "./admin.types";

export interface IAdminRepository {
    getGlobalMetrics(): Promise<AdminGlobalMetrics>;
}