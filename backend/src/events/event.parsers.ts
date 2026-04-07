import { EventTicketTypeInput } from "./event.types";

export interface ParseEntradasResult {
    entradas: EventTicketTypeInput[] | null;
    error?: string;
}

export function parseEntradas(value: unknown, required: boolean): ParseEntradasResult {
    if (value === undefined || value === null) {
        if (required) {
            return { entradas: null, error: "El campo entradas es requerido" };
        }
        return { entradas: null };
    }

    if (!Array.isArray(value)) {
        return { entradas: null, error: "El campo entradas debe ser un arreglo" };
    }

    if (required && value.length === 0) {
        return { entradas: null, error: "Debe enviar al menos un tipo de entrada" };
    }

    const ids = new Set<number>();
    const entradas: EventTicketTypeInput[] = [];

    for (const item of value) {
        const tipoEntradaId = Number((item as any)?.tipo_entrada_id);
        const aforo         = Number((item as any)?.aforo);

        if (!Number.isInteger(tipoEntradaId) || tipoEntradaId <= 0) {
            return { entradas: null, error: "Cada entrada debe incluir un tipo_entrada_id entero válido" };
        }

        if (!Number.isInteger(aforo) || aforo < 0) {
            return { entradas: null, error: "Cada entrada debe incluir un aforo entero mayor o igual a 0" };
        }

        if (ids.has(tipoEntradaId)) {
            return { entradas: null, error: "No se permiten tipos de entrada repetidos en el mismo evento" };
        }

        ids.add(tipoEntradaId);
        entradas.push({ tipo_entrada_id: tipoEntradaId, aforo });
    }

    return { entradas };
}

export function parseCategoriaId(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return NaN;
    return parsed;
}

export function parseValor(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return NaN;
    return parsed;
}