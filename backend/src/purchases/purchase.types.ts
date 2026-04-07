export interface PurchaseRow {
  id: number;
  usuario_id: number;
  evento_tipo_entrada_id: number;
  cantidad: number;
  total: number;
  fecha_compra: Date;
  estado: "completada" | "cancelada";
}

export interface CreatePurchaseDTO {
  evento_tipo_entrada_id: number;
  cantidad: number;
}

export interface PurchaseDetailRow extends PurchaseRow {
  evento_nombre: string;
  tipo_entrada_nombre: string;
  precio_unitario: number;
}