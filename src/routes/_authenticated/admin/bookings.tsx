import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
import { BOOKING_STATUSES, formatPrice } from "@/lib/realestate";
import { getMyAccess, listBookings, updateBooking, deleteBooking } from "@/lib/realestate.functions";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({
    meta: [
      { title: "مراجعة الحجوزات | عقاري" },
      { name: "description", content: "مراجعة كل حجوزات المعاينة وتغيير حالتها من لوحة الإدارة." },
      { property: "og:title", content: "مراجعة الحجوزات | عقاري" },
      { property: "og:description", content: "إدارة حجوزات العملاء من لوحة مدير النظام." },
    ],
  }),
  component: AdminBookings,
});

function AdminBookings() {
  const accessFn = useServerFn(getMyAccess);
  const listFn = useServerFn(listBookings);
  const updateFn = useServerFn(updateBooking);
  const deleteFn = useServerFn(deleteBooking);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["access"], queryFn: () => accessFn({}) });
  const bookings = useQuery({ queryKey: ["bookings"], queryFn: () => listFn({}) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bookings"] });

  const update = useMutation({
    mutationFn: (data: { id: string; status: "pending" | "confirmed" | "cancelled" }) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الحجز");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف الحجز");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (access.isPending) return <AppShell>جاري التحميل…</AppShell>;

  if (!access.data?.isAdmin) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <h1 className="text-xl font-bold text-foreground">هذه الصفحة لمدير النظام فقط</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">مراجعة الحجوزات</h1>
          <p className="mt-1 text-sm text-muted-foreground">كل حجوزات العملاء وحجوزات الـ API.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin">إدارة العقارات</Link>
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم العقار</TableHead>
              <TableHead>العقار</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>تاريخ الزيارة</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.data?.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.properties?.reference}</TableCell>
                <TableCell className="font-medium">{b.properties?.title}</TableCell>
                <TableCell>{b.properties ? formatPrice(b.properties.price) : "-"}</TableCell>
                <TableCell>{b.full_name}</TableCell>
                <TableCell dir="ltr">{b.phone}</TableCell>
                <TableCell>{b.visit_date ?? "-"}</TableCell>
                <TableCell>{b.source === "api" ? "API" : "الموقع"}</TableCell>
                <TableCell>
                  <Select
                    value={b.status}
                    onValueChange={(v) =>
                      update.mutate({ id: b.id, status: v as "pending" | "confirmed" | "cancelled" })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-left">
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {bookings.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد حجوزات بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
