import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, statusLabel } from "@/lib/realestate";
import { getMyAccess, listBookings, updateBooking, deleteBooking } from "@/lib/realestate.functions";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "حجوزاتي | عقاري" },
      { name: "description", content: "تابع حجوزات معاينة العقارات الخاصة بك وعدّلها أو ألغِها." },
      { property: "og:title", content: "حجوزاتي | عقاري" },
      { property: "og:description", content: "إدارة حجوزات المعاينة الخاصة بك." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const accessFn = useServerFn(getMyAccess);
  const listFn = useServerFn(listBookings);
  const updateFn = useServerFn(updateBooking);
  const deleteFn = useServerFn(deleteBooking);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["access"], queryFn: () => accessFn({}) });
  const bookings = useQuery({ queryKey: ["bookings"], queryFn: () => listFn({}) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bookings"] });

  const update = useMutation({
    mutationFn: (data: {
      id: string;
      status?: "pending" | "confirmed" | "cancelled";
      visit_date?: string;
      notes?: string;
    }) => updateFn({ data }),
    onSuccess: () => {
      toast.success("تم تحديث الحجز");
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

  return (
    <AppShell isAdmin={access.data?.isAdmin}>
      <h1 className="text-2xl font-extrabold text-foreground">حجوزاتي</h1>
      <p className="mt-1 text-sm text-muted-foreground">حجوزات المعاينة التي قمت بإنشائها.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم العقار</TableHead>
              <TableHead>العقار</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>تاريخ الزيارة</TableHead>
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
                <TableCell>
                  <Input
                    type="date"
                    className="w-40"
                    defaultValue={b.visit_date ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (b.visit_date ?? "") &&
                      update.mutate({ id: b.id, visit_date: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                    {statusLabel(b.status)}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 space-x-reverse text-left">
                  {b.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update.mutate({ id: b.id, status: "cancelled" })}
                    >
                      إلغاء
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {bookings.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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
