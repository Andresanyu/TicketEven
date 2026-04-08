import { AdminGlobalMetrics, AdminRepository } from "./admin.repository";

export class AdminService {
    constructor(private readonly adminRepository: AdminRepository) {}

    async getGlobalMetrics(): Promise<AdminGlobalMetrics> {
        return this.adminRepository.getGlobalMetrics();
    }
}
