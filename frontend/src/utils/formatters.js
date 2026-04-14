export function formatDate(dateInput) {
  if (!dateInput) return "—";

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "—";
  if (numericValue === 0) return "Gratis";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(numericValue);
}
