import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bookingSchema = z.object({
  property_id: z.string().uuid().optional(),
  reference: z.string().trim().max(40).optional(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160).optional(),
  visit_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const Route = createFileRoute("/api/public/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      POST: async ({ request }) => {
        const apiKey = process.env.N8N_API_KEY;
        if (apiKey && request.headers.get("x-api-key") !== apiKey) {
          return json({ success: false, error: "مفتاح API غير صالح" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ success: false, error: "الطلب يجب أن يكون JSON صالح" }, 400);
        }

        const parsed = bookingSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ success: false, error: "بيانات غير صالحة", details: parsed.error.issues }, 400);
        }
        const data = parsed.data;
        if (!data.property_id && !data.reference) {
          return json({ success: false, error: "يجب إرسال property_id أو reference للعقار" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const lookup = supabaseAdmin.from("properties").select("id, reference, title");
        const { data: property, error: propError } = data.property_id
          ? await lookup.eq("id", data.property_id).maybeSingle()
          : await lookup.eq("reference", data.reference!).maybeSingle();

        if (propError) return json({ success: false, error: propError.message }, 500);
        if (!property) return json({ success: false, error: "العقار غير موجود" }, 404);

        const { data: booking, error } = await supabaseAdmin
          .from("bookings")
          .insert({
            property_id: property.id,
            full_name: data.full_name,
            phone: data.phone,
            email: data.email ?? null,
            visit_date: data.visit_date ?? null,
            notes: data.notes ?? null,
            source: "api",
          })
          .select("id, status, visit_date, created_at")
          .single();

        if (error) return json({ success: false, error: error.message }, 500);

        return json(
          {
            success: true,
            booking: {
              ...booking,
              property: { id: property.id, reference: property.reference, title: property.title },
            },
          },
          201,
        );
      },
    },
  },
});
