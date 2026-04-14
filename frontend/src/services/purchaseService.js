import api from "./api.js";
import { Auth } from "./auth.js";

export const purchaseService = {
  async createPurchase(purchaseData) {
    const payload = {
      evento_tipo_entrada_id: Number(purchaseData?.evento_tipo_entrada_id),
      cantidad: Number(purchaseData?.cantidad),
    };

    return api.post("/purchases", payload, Auth.authOptions());
  },
};

export default purchaseService;
