import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const searchSchema = z.object({
  type: z.enum(["land", "apartment", "villa", "office"]).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  minPrice: z.number().nonnegative().nullable().optional(),
  maxPrice: z.number().nonnegative().nullable().optional(),
});

const propertySchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(["land", "apartment", "villa", "office"]),
  price: z.number().nonnegative(),
  description: z.string().trim().max(2000).optional().nullable(),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  image_url: z.string().trim().max(600).optional().nullable(),
  image_urls: z.array(z.string().trim().max(600)).max(12).optional(),
  video_url: z.string().trim().max(600).optional().nullable(),
  area_sqm: z.number().int().nonnegative().nullable().optional(),
  is_available: z.boolean().optional(),
});

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", context.userId)
      .maybeSingle();
    return { isAdmin: Boolean(data), userId: context.userId, profile: profile ?? null };
  });

export const searchProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (data.type) query = query.eq("type", data.type);
    if (data.city) query = query.ilike("city", `%${data.city}%`);
    if (typeof data.minPrice === "number") query = query.gte("price", data.minPrice);
    if (typeof data.maxPrice === "number") query = query.lte("price", data.maxPrice);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => propertySchema.parse(input))
  .handler(async ({ data, context }) => {
    const images = data.image_urls ?? (data.image_url ? [data.image_url] : []);
    const payload = {
      ...data,
      image_urls: images,
      image_url: images[0] ?? data.image_url ?? null,
      video_url: data.video_url || null,
    };
    const { data: row, error } = await context.supabase.from("properties").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => propertySchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const images = rest.image_urls;
    const { data: row, error } = await context.supabase
      .from("properties")
      .update({
        ...rest,
        ...(images ? { image_urls: images } : {}),
        image_url: (images ? images[0] : rest.image_url) || null,
        video_url: rest.video_url || null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("properties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*, properties(reference, title, city, type, price, image_url)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        property_id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(6).max(30),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        visit_date: z.string().trim().max(20).optional().or(z.literal("")),
        visit_time: z
          .string()
          .trim()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .or(z.literal("")),
        notes: z.string().trim().max(1000).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bookings")
      .insert({
        property_id: data.property_id,
        user_id: context.userId,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        visit_date: data.visit_date || null,
        visit_time: data.visit_time || null,
        notes: data.notes || null,
        source: "web",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { data: property } = await context.supabase
      .from("properties")
      .select("id, reference, title, city, type, price")
      .eq("id", data.property_id)
      .maybeSingle();
    const { notifyBookingEvent, notifyNewBookingWebhook, notifyBookingRecordWebhook } = await import(
      "@/lib/notify.server"
    );
    await notifyBookingRecordWebhook({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email,
      visit_date: row.visit_date,
      notes: row.notes,
      property_id: row.property_id,
    });
    await notifyBookingEvent({ event: "booking_created", booking: row, property: property ?? null });
    await notifyNewBookingWebhook({
      booking_id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      visit_date: row.visit_date,
      property_title: property?.title ?? null,
      notes: row.notes,
    });

    return row;
  });


export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
        visit_date: z.string().trim().max(20).optional().or(z.literal("")),
        notes: z.string().trim().max(1000).optional().or(z.literal("")),
        phone: z.string().trim().min(6).max(30).optional(),
        full_name: z.string().trim().min(2).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: {
      status?: "pending" | "confirmed" | "cancelled";
      visit_date?: string | null;
      notes?: string | null;
      phone?: string;
      full_name?: string;
    } = {};
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.visit_date !== undefined) patch.visit_date = rest.visit_date || null;
    if (rest.notes !== undefined) patch.notes = rest.notes || null;
    if (rest.phone !== undefined) patch.phone = rest.phone;
    if (rest.full_name !== undefined) patch.full_name = rest.full_name;
    const { data: row, error } = await context.supabase
      .from("bookings")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (patch.status === "confirmed") {
      const { data: property } = await context.supabase
        .from("properties")
        .select("id, reference, title, city, type, price")
        .eq("id", row.property_id)
        .maybeSingle();
      const { notifyBookingEvent } = await import("@/lib/notify.server");
      await notifyBookingEvent({ event: "booking_confirmed", booking: row, property: property ?? null });
    }

    return row;
  });


export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
