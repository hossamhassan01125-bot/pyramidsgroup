import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Ruler, Hash, Search, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { PropertyImage } from "@/components/property-image";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyVideo } from "@/components/property-video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, formatPrice, typeLabel } from "@/lib/realestate";
import { getMyAccess, searchProperties, createBooking } from "@/lib/realestate.functions";

export const Route = createFileRoute("/_authenticated/properties")({
  head: () => ({
    meta: [
      { title: "قائمة العقارات | عقاري" },
      { name: "description", content: "ابحث في العقارات المتاحة حسب النوع والسعر والمدينة واحجز معاينتك." },
      { property: "og:title", content: "قائمة العقارات | عقاري" },
      { property: "og:description", content: "بحث متقدم في عقارات مصر: شقق، فيلات، أراضٍ ومكاتب." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pyramidsgroup.lovable.app/properties" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pyramidsgroup.lovable.app/properties" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "قائمة العقارات",
          description: "عقارات متاحة في مصر: شقق، فيلات، أراضٍ ومكاتب.",
          url: "https://pyramidsgroup.lovable.app/properties",
          isPartOf: {
            "@type": "WebSite",
            name: "عقاري",
            url: "https://pyramidsgroup.lovable.app",
          },
        }),
      },
    ],
  }),
  component: PropertiesPage,
});


type Filters = { type: string; city: string; minPrice: string; maxPrice: string };
const emptyFilters: Filters = { type: "all", city: "", minPrice: "", maxPrice: "" };

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic/Persian-Indic digits to Latin digits. */
function toLatinDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const i = AR_DIGITS.indexOf(ch);
    return String(i >= 0 ? i : FA_DIGITS.indexOf(ch));
  });
}

function PropertiesPage() {
  const accessFn = useServerFn(getMyAccess);
  const searchFn = useServerFn(searchProperties);
  const bookFn = useServerFn(createBooking);
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [bookingFor, setBookingFor] = useState<{ id: string; title: string } | null>(null);
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState<string>("");
  const submitLock = useRef(false);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 20; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 20) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);


  const access = useQuery({ queryKey: ["access"], queryFn: () => accessFn({}) });

  const payload = useMemo(
    () => ({
      type: applied.type === "all" ? null : (applied.type as "land"),
      city: applied.city.trim() || null,
      minPrice: applied.minPrice ? Number(applied.minPrice) : null,
      maxPrice: applied.maxPrice ? Number(applied.maxPrice) : null,
    }),
    [applied],
  );

  const properties = useQuery({
    queryKey: ["properties", payload],
    queryFn: () => searchFn({ data: payload }),
  });

  const booking = useMutation({
    mutationFn: (data: {
      property_id: string;
      full_name: string;
      phone: string;
      email?: string;
      visit_date?: string;
      visit_time?: string;
      notes?: string;
    }) => bookFn({ data }),
    onSuccess: () => {
      toast.success("تم إرسال طلب الحجز بنجاح");
      setBookingFor(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => toast.error("تعذّر إنشاء الحجز: " + e.message),
    onSettled: () => {
      submitLock.current = false;
    },
  });

  return (
    <AppShell isAdmin={access.data?.isAdmin}>
      <h1 className="text-2xl font-extrabold text-foreground">قائمة العقارات</h1>
      <p className="mt-1 text-sm text-muted-foreground">ابحث بالنوع أو المدينة أو نطاق السعر.</p>

      <form
        className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        <div className="space-y-1.5">
          <Label>نوع العقار</Label>
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">المدينة</Label>
          <Input
            id="city"
            placeholder="القاهرة"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min">أقل سعر</Label>
          <Input
            id="min"
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max">أعلى سعر</Label>
          <Input
            id="max"
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            <Search className="size-4" /> بحث
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFilters(emptyFilters);
              setApplied(emptyFilters);
            }}
          >
            مسح
          </Button>
        </div>
      </form>

      <div className="mt-6">
        {properties.isPending && <p className="text-sm text-muted-foreground">جاري تحميل العقارات…</p>}
        {properties.data?.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لا توجد عقارات مطابقة لمعايير البحث.
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.data?.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              {p.video_url ? (
                <PropertyVideo value={p.video_url} className="h-44 w-full bg-black object-cover" />
              ) : (p.image_urls?.length ?? 0) > 0 ? (
                <PropertyGallery images={p.image_urls} alt={p.title} />
              ) : (
                <PropertyImage
                  value={p.image_url}
                  alt={p.title}
                  className="h-44 w-full object-cover"
                />
              )}

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{typeLabel(p.type)}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="size-3" />
                    {p.reference}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground">{p.title}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {p.city} - {p.country}
                  </span>
                  {p.area_sqm && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="size-3" /> {p.area_sqm} م²
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-extrabold text-primary">{formatPrice(p.price)}</span>
                  <Button size="sm" onClick={() => setBookingFor({ id: p.id, title: p.title })}>
                    احجز معاينة
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(bookingFor)} onOpenChange={(open) => !open && setBookingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حجز معاينة</DialogTitle>
            <DialogDescription>{bookingFor?.title}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (booking.isPending || submitLock.current) return;
              submitLock.current = true;
              const fd = new FormData(e.currentTarget);
              booking.mutate({
                property_id: bookingFor!.id,
                full_name: String(fd.get("full_name") ?? ""),
                phone: toLatinDigits(String(fd.get("phone") ?? "")),
                email: String(fd.get("email") ?? ""),
                visit_date: visitDate ? format(visitDate, "yyyy-MM-dd") : "",
                visit_time: visitTime,
                notes: String(fd.get("notes") ?? ""),
              });
            }}
          >
            <fieldset disabled={booking.isPending} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-name">الاسم</Label>
                <Input id="b-name" name="full_name" required defaultValue={access.data?.profile?.full_name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-phone">الهاتف (أرقام إنجليزية فقط)</Label>
                <Input
                  id="b-phone"
                  name="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  pattern="^\+?[0-9]{6,20}$"
                  title="اكتب الرقم بأرقام إنجليزية فقط (0-9)"
                  placeholder="01xxxxxxxxx"
                  defaultValue={access.data?.profile?.phone ?? ""}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.value = toLatinDigits(el.value).replace(/(?!^\+)[^0-9]/g, "");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-email">البريد الإلكتروني</Label>
                <Input id="b-email" name="email" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-date">تاريخ الزيارة</Label>
                  <Input id="b-date" name="visit_date" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-time">توقيت الزيارة</Label>
                  <Input id="b-time" name="visit_time" type="time" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-notes">ملاحظات</Label>
                <Textarea id="b-notes" name="notes" maxLength={1000} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={booking.isPending}>
                  {booking.isPending ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ltr:mr-2 rtl:ml-2" />
                      جاري الإرسال…
                    </>
                  ) : (
                    "تأكيد الحجز"
                  )}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
