export const PROPERTY_TYPES = [
  { value: "apartment", label: "شقة" },
  { value: "villa", label: "فيلا" },
  { value: "land", label: "أرض" },
  { value: "office", label: "مكتب" },
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

export const BOOKING_STATUSES = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "confirmed", label: "مؤكد" },
  { value: "cancelled", label: "ملغي" },
] as const;

export function typeLabel(value: string) {
  return PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function statusLabel(value: string) {
  return BOOKING_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function formatPrice(price: number | string) {
  const n = typeof price === "string" ? Number(price) : price;
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n) + " ج.م";
}
