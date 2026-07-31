import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropertyImageUpload } from "@/components/property-image-upload";
import { PROPERTY_TYPES, formatPrice, typeLabel } from "@/lib/realestate";
import {
  getMyAccess,
  searchProperties,
  createProperty,
  updateProperty,
  deleteProperty,
} from "@/lib/realestate.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "إدارة العقارات | عقاري" },
      { name: "description", content: "لوحة مدير النظام لإضافة وتعديل وحذف العقارات." },
      { property: "og:title", content: "إدارة العقارات | عقاري" },
      { property: "og:description", content: "إدارة كاملة لقائمة العقارات." },
    ],
  }),
  component: AdminProperties,
});

type Form = {
  id?: string;
  title: string;
  type: string;
  price: string;
  description: string;
  city: string;
  country: string;
  image_url: string;
  area_sqm: string;
  is_available: boolean;
};

const emptyForm: Form = {
  title: "",
  type: "apartment",
  price: "",
  description: "",
  city: "",
  country: "مصر",
  image_url: "",
  area_sqm: "",
  is_available: true,
};

function AdminProperties() {
  const accessFn = useServerFn(getMyAccess);
  const searchFn = useServerFn(searchProperties);
  const createFn = useServerFn(createProperty);
  const updateFn = useServerFn(updateProperty);
  const deleteFn = useServerFn(deleteProperty);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Form | null>(null);
  const [quick, setQuick] = useState<{
    id: string;
    title: string;
    type: string;
    price: string;
    city: string;
    is_available: boolean;
  } | null>(null);

  const access = useQuery({ queryKey: ["access"], queryFn: () => accessFn({}) });
  const properties = useQuery({
    queryKey: ["properties", "all"],
    queryFn: () => searchFn({ data: {} }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["properties"] });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        title: f.title,
        type: f.type as "apartment",
        price: Number(f.price),
        description: f.description,
        city: f.city,
        country: f.country,
        image_url: f.image_url,
        area_sqm: f.area_sqm ? Number(f.area_sqm) : null,
        is_available: f.is_available,
      };
      return f.id ? updateFn({ data: { ...payload, id: f.id } }) : createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("تم حفظ العقار");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("تعذّر الحفظ: " + e.message),
  });

  const quickSave = useMutation({
    mutationFn: async (p: {
      id: string;
      description: string | null;
      country: string;
      image_url: string | null;
      area_sqm: number | null;
    }) => {
      if (!quick) throw new Error("لا يوجد تعديل");
      return updateFn({
        data: {
          id: p.id,
          title: quick.title,
          type: quick.type as "apartment",
          price: Number(quick.price),
          description: p.description ?? "",
          city: quick.city,
          country: p.country,
          image_url: p.image_url ?? "",
          area_sqm: p.area_sqm,
          is_available: quick.is_available,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم التعديل السريع");
      setQuick(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("تعذّر الحفظ: " + e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف العقار");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (access.isPending) {
    return <AppShell>جاري التحميل…</AppShell>;
  }

  if (!access.data?.isAdmin) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <h1 className="text-xl font-bold text-foreground">هذه الصفحة لمدير النظام فقط</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            حسابك الحالي مسجّل كعميل. تواصل مع الشركة لمنحك صلاحية الإدارة.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">إدارة العقارات</h1>
          <p className="mt-1 text-sm text-muted-foreground">إضافة وتعديل وحذف العقارات.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/bookings">مراجعة الحجوزات</Link>
          </Button>
          <Button onClick={() => setForm(emptyForm)}>
            <Plus className="size-4" /> عقار جديد
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرقم</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المدينة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.data?.map((p) => {
              const editing = quick?.id === p.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                  <TableCell className="font-medium">
                    {editing ? (
                      <Input
                        className="h-8 min-w-40"
                        value={quick!.title}
                        onChange={(e) => setQuick({ ...quick!, title: e.target.value })}
                      />
                    ) : (
                      p.title
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        value={quick!.type}
                        onValueChange={(v) => setQuick({ ...quick!, type: v })}
                      >
                        <SelectTrigger className="h-8 min-w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      typeLabel(p.type)
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        className="h-8 min-w-28"
                        value={quick!.city}
                        onChange={(e) => setQuick({ ...quick!, city: e.target.value })}
                      />
                    ) : (
                      p.city
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        className="h-8 min-w-32"
                        type="number"
                        min={0}
                        value={quick!.price}
                        onChange={(e) => setQuick({ ...quick!, price: e.target.value })}
                      />
                    ) : (
                      formatPrice(p.price)
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        value={quick!.is_available ? "1" : "0"}
                        onValueChange={(v) => setQuick({ ...quick!, is_available: v === "1" })}
                      >
                        <SelectTrigger className="h-8 min-w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">متاح</SelectItem>
                          <SelectItem value="0">غير متاح</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={p.is_available ? "default" : "secondary"}>
                        {p.is_available ? "متاح" : "غير متاح"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 space-x-reverse text-left">
                    {editing ? (
                      <>
                        <Button
                          size="sm"
                          disabled={quickSave.isPending}
                          title="حفظ"
                          onClick={() =>
                            quickSave.mutate({
                              id: p.id,
                              description: p.description,
                              country: p.country,
                              image_url: p.image_url,
                              area_sqm: p.area_sqm,
                            })
                          }
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="إلغاء"
                          onClick={() => setQuick(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          title="تعديل سريع"
                          onClick={() =>
                            setQuick({
                              id: p.id,
                              title: p.title,
                              type: p.type,
                              price: String(p.price),
                              city: p.city,
                              is_available: p.is_available,
                            })
                          }
                        >
                          <Zap className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="تعديل كامل"
                          onClick={() =>
                            setForm({
                              id: p.id,
                              title: p.title,
                              type: p.type,
                              price: String(p.price),
                              description: p.description ?? "",
                              city: p.city,
                              country: p.country,
                              image_url: p.image_url ?? "",
                              area_sqm: p.area_sqm ? String(p.area_sqm) : "",
                              is_available: p.is_available,
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove.mutate(p.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل عقار" : "إضافة عقار"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="f-title">عنوان العقار</Label>
                <Input
                  id="f-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>النوع</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-price">السعر (ج.م)</Label>
                  <Input
                    id="f-price"
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-city">المدينة</Label>
                  <Input
                    id="f-city"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-country">الدولة</Label>
                  <Input
                    id="f-country"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-area">المساحة (م²)</Label>
                  <Input
                    id="f-area"
                    type="number"
                    min={0}
                    value={form.area_sqm}
                    onChange={(e) => setForm({ ...form, area_sqm: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الإتاحة</Label>
                  <Select
                    value={form.is_available ? "1" : "0"}
                    onValueChange={(v) => setForm({ ...form, is_available: v === "1" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">متاح</SelectItem>
                      <SelectItem value="0">غير متاح</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <PropertyImageUpload
                value={form.image_url}
                onChange={(v) => setForm({ ...form, image_url: v })}
              />

              <div className="space-y-1.5">
                <Label htmlFor="f-desc">الوصف</Label>
                <Textarea
                  id="f-desc"
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={save.isPending}>
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
