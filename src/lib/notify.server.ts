// Server-only helper: single source of truth for sending booking data to n8n.
// Never import this from client components — only from server functions / server routes.

export const ADMIN_WHATSAPP = "+201147789665";

const DEFAULT_WEBHOOK_URL = "https://hoss33.app.n8n.cloud/webhook/new-booking";

/** Webhook URL, overridable via N8N_WEBHOOK_URL env var. */
function webhookUrl(): string {
  return process.env["N8N_WEBHOOK_URL"] || DEFAULT_WEBHOOK_URL;
}

/** Converts an Egyptian local number to international format (20XXXXXXXXXX). */
export function toInternationalPhone(raw: string): string {
  let digits = (raw ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return "20" + digits.slice(1);
  if (digits.startsWith("1") && digits.length === 10) return "20" + digits;
  return digits;
}

/** "YYYY-MM-DD HH:mm" from a date + optional time. */
export function formatVisitWhen(date?: string | null, time?: string | null): string {
  if (!date) return "";
  const hhmm = (time ?? "").slice(0, 5);
  return hhmm ? `${date} ${hhmm}` : date;
}

export type BookingWebhookInput = {
  /** Unique booking id (uuid) — generated once when the booking row is created. */
  booking_id: string;
  full_name: string;
  phone: string;
  /** Already formatted as "YYYY-MM-DD HH:mm" (or empty). */
  visit_when?: string | null;
  property_title?: string | null;
  notes?: string | null;
};

/**
 * The ONE and ONLY place that posts booking data to the n8n webhook.
 * Fire-and-forget: never throws.
 */
export async function sendBookingWebhook(input: BookingWebhookInput): Promise<void> {
  const body = {
    booking_id: input.booking_id,
    phone: toInternationalPhone(input.phone),
    "اسم العميل": input.full_name,
    "معاد المعاينة": input.visit_when ?? "",
    "اسم العقار": input.property_title ?? "",
    ملاحظات: input.notes ?? "",
  };

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const secret = process.env["N8N_WEBHOOK_SECRET"];
    if (secret) headers["x-webhook-secret"] = secret;

    const res = await fetch(webhookUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[booking webhook] failed [${res.status}]: ${await res.text()}`);
    }
  } catch (error) {
    console.error("[booking webhook] error", error);
  }
}
