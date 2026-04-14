import { IAdminRepository } from "./admin.repository.interface";
import { AdminGlobalMetrics } from "./admin.types";

export class AdminService {
  constructor(private readonly adminRepository: IAdminRepository) {} // 👈

  async getGlobalMetrics(): Promise<AdminGlobalMetrics> {
    return this.adminRepository.getGlobalMetrics();
  }
}