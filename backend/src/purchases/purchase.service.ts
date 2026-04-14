import QRCode from "qrcode";
import { IPurchaseRepository } from "./purchase.repository.interface";
import { CreatePurchaseDTO, PurchaseRow, PurchaseDetailRow, PurchaseWithQR } from "./purchase.types";

export class PurchaseService {
  constructor(private readonly repo: IPurchaseRepository) {}

  async create(usuarioId: number, dto: CreatePurchaseDTO): Promise<PurchaseRow> {
    const precio = await this.repo.findPrecioByEntradaId(dto.evento_tipo_entrada_id);

    if (precio === null) {
      throw new Error("Tipo de entrada no encontrado.");
    }

    const total = precio * dto.cantidad;
    return this.repo.create(usuarioId, dto, total);
  }

  getByUser(usuarioId: number): Promise<PurchaseDetailRow[]> {
    return this.repo.findByUser(usuarioId);
  }

  async getById(id: number, usuarioId: number): Promise<PurchaseWithQR> {
    const purchase = await this.repo.findById(id);

    if (!purchase) {
      throw new Error("Compra no encontrada.");
    }
    if (purchase.usuario_id !== usuarioId) {
      throw new Error("No autorizado.");
    }

    const qrPayload = `EVENTPRO-COMPRA-${purchase.id}-USUARIO-${purchase.usuario_id}`;
    const qr_code = await QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: "#111210", light: "#c6f135" },
    });

    return { ...purchase, qr_code };
  }
}