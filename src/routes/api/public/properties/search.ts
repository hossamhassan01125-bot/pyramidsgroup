import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["land", "apartment", "villa", "office"]).optional(),
  city: z.string().trim().max(80).optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function runSearch(raw: Record<string, unknown>) {
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ success: false, error: "معايير بحث غير صالحة", details: parsed.error.issues }, 400);
  }
  const f = parsed.data;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("properties")
    .select("id, reference, title, type, price, description, city, country, image_url, area_sqm, is_available")
    .order("price", { ascending: true })
    .limit(f.limit ?? 50);

  if (f.type) query = query.eq("type", f.type);
  if (f.city) query = query.ilike("city", `%${f.city}%`);
  if (f.min_price !== undefined) query = query.gte("price", f.min_price);
  if (f.max_price !== undefined) query = query.lte("price", f.max_price);

  const { data, error } = await query;
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, count: data?.length ?? 0, filters: f, results: data ?? [] });
}

export const Route = createFileRoute("/api/public/properties/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return runSearch(Object.fromEntries(url.searchParams.entries()));
      },
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        return runSearch(body ?? {});
      },
    },
  },
});
