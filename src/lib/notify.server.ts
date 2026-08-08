// Server-only helper: sends booking events to an n8n webhook (WhatsApp / SMS automation).
// Never import this from client components — only from server functions / server routes.

export const ADMIN_WHATSAPP = "+201147789665";

type BookingEvent = "booking_created" | "booking_confirmed";

export type NotifyPayload = {
  event: BookingEvent;
  admin_phone: string;
  booking: {
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    visit_date?: string | null;
    notes?: string | null;
    status?: string | null;
    source?: string | null;
  };
  property: {
    id: string;
    reference?: string | null;
    title?: string | null;
    city?: string | null;
    type?: string | null;
    price?: number | null;
  } | null;
  message: string;
  created_at: string;
};

function arabicDate(value?: string | null) {
  return value ? value : "غير محدد";
}

function buildMessage(payload: Omit<NotifyPayload, "message">) {
  const p = payload.property;
  const propLine = p ? `${p.title ?? ""} (${p.reference ?? ""}) - ${p.city ?? ""}` : "عقار غير معروف";
  if (payload.event === "booking_created") {
    return [
      "🔔 طلب حجز معاينة جديد",
      `العقار: ${propLine}`,
      `العميل: ${payload.booking.full_name}`,
      `الهاتف: ${payload.booking.phone}`,
      `تاريخ الزيارة المطلوب: ${arabicDate(payload.booking.visit_date)}`,
      payload.booking.notes ? `ملاحظات: ${payload.booking.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "✅ تم تأكيد حجز المعاينة",
    `العقار: ${propLine}`,
    `موعد المعاينة: ${arabicDate(payload.booking.visit_date)}`,
    "برجاء الحضور في الموعد المحدد. شكراً لثقتكم.",
  ].join("\n");
}

export async function notifyBookingEvent(input: {
  event: BookingEvent;
  booking: NotifyPayload["booking"];
  property: NotifyPayload["property"];
}): Promise<void> {
  const url = NEW_BOOKING_WEBHOOK_URL;

  const base = {
    event: input.event,
    admin_phone: ADMIN_WHATSAPP,
    booking: input.booking,
    property: input.property,
    created_at: new Date().toISOString(),
  };
  const payload: NotifyPayload = { ...base, message: buildMessage(base) };

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const secret = process.env["N8N_WEBHOOK_SECRET"];
    if (secret) headers["x-webhook-secret"] = secret;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[notify] webhook failed [${res.status}]: ${await res.text()}`);
    }
  } catch (error) {
    console.error("[notify] webhook error", error);
  }
}

const DEFAULT_WEBHOOK_URL = "https://hoss33.app.n8n.cloud/webhook/new-booking";

/** Webhook URL, overridable via N8N_WEBHOOK_URL env var. */
function webhookUrl(): string {
  return process.env["N8N_WEBHOOK_URL"] || DEFAULT_WEBHOOK_URL;
}

const NEW_BOOKING_WEBHOOK_URL = webhookUrl();

/** Fire-and-forget POST with the raw booking record. Never throws. */
export async function notifyBookingRecordWebhook(input: {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  visit_date?: string | null;
  notes?: string | null;
  property_id: string;
}): Promise<void> {
  try {
    const res = await fetch(webhookUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: input.id,
        full_name: input.full_name,
        phone: input.phone,
        email: input.email ?? null,
        visit_date: input.visit_date ?? null,
        notes: input.notes ?? null,
        property_id: input.property_id,
      }),
    });
    if (!res.ok) {
      console.error(`[booking webhook] failed [${res.status}]: ${await res.text()}`);
    }
  } catch (error) {
    console.error("[booking webhook] error", error);
  }
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

/** Fire-and-forget POST to the n8n new-booking webhook. Never throws. */
export async function notifyNewBookingWebhook(input: {
  booking_id: string;
  full_name: string;
  phone: string;
  visit_date?: string | null;
  property_title?: string | null;
  notes?: string | null;
}): Promise<void> {
  try {
    const res = await fetch(NEW_BOOKING_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: toInternationalPhone(input.phone),
        booking_id: input.booking_id,
        "اسم العميل": input.full_name,
        "رقم التليفون": input.phone,
        "معاد المعاينة": input.visit_date ?? "",
        "اسم العقار": input.property_title ?? "",
        ملاحظات: input.notes ?? "",
      }),
    });
    if (!res.ok) {
      console.error(`[new-booking webhook] failed [${res.status}]: ${await res.text()}`);
    }
  } catch (error) {
    console.error("[new-booking webhook] error", error);
  }
}
