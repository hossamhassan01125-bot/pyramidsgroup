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
  const url = process.env["N8N_BOOKING_WEBHOOK_URL"];
  if (!url) {
    console.warn("[notify] N8N_BOOKING_WEBHOOK_URL is not configured; skipping notification");
    return;
  }

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
