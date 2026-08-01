import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Search, ShieldCheck, CalendarCheck, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عقاري | ابحث عن عقارك في مصر" },
      {
        name: "description",
        content: "منصة عقاري لعرض الشقق والفيلات والأراضي والمكاتب في مصر مع بحث متقدم وحجز معاينات.",
      },
      { property: "og:title", content: "عقاري | ابحث عن عقارك في مصر" },
      {
        property: "og:description",
        content: "تصفح عقارات مصر، ابحث بالنوع والسعر والمدينة، واحجز معاينتك مباشرة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pyramidsgroup.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pyramidsgroup.lovable.app/" }],
  }),

  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Building2 className="size-6" /> عقاري
        </span>
        <Button asChild size="sm">
          <Link to="/auth">تسجيل الدخول</Link>
        </Button>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
          <div className="rounded-4xl bg-hero px-6 py-16 text-center shadow-card sm:px-12">
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">
              عقارك القادم في مصر يبدأ من هنا
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/85">
              شقق وفيلات وأراضٍ ومكاتب موثقة برقم مرجعي فريد لكل عقار. ابحث بالنوع أو السعر أو
              المدينة، واحجز معاينتك في دقائق.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">أنشئ حسابك وابدأ البحث</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">لديك حساب؟ سجّل الدخول</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Search, title: "بحث متقدم", text: "فلترة بالنوع والسعر والمدينة في لحظة." },
            { icon: CalendarCheck, title: "حجز معاينة", text: "احجز زيارتك وتابع حالة الحجز." },
            { icon: ShieldCheck, title: "إدارة مركزية", text: "شركة واحدة تدير كل العقارات والحجوزات." },
            { icon: Plug, title: "API لـ n8n", text: "نتائج البحث وإنشاء الحجوزات عبر API جاهز." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-3 text-base font-bold text-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} عقاري — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
