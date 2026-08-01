import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | عقاري" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً للبحث عن العقارات وحجز المعاينات." },
      { property: "og:title", content: "تسجيل الدخول | عقاري" },
      { property: "og:description", content: "حساب مجاني للوصول إلى قائمة العقارات والبحث والحجز." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pyramidsgroup.lovable.app/auth" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pyramidsgroup.lovable.app/auth" }],
  }),

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/properties", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("تعذّر تسجيل الدخول: " + error.message);
    toast.success("مرحباً بعودتك");
    navigate({ to: "/properties", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error("أدخل الاسم الكامل");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    setLoading(false);
    if (error) return toast.error("تعذّر إنشاء الحساب: " + error.message);
    toast.success("تم إنشاء الحساب بنجاح");
    if (data.session) navigate({ to: "/properties", replace: true });
    else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return toast.error("سجّل الدخول من فضلك");
      navigate({ to: "/properties", replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-card">
        <Link to="/" className="flex items-center justify-center gap-2 text-lg font-extrabold text-primary">
          <Building2 className="size-6" /> عقاري
        </Link>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          سجّل الدخول للوصول إلى قائمة العقارات والبحث فيها
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">دخول</TabsTrigger>
            <TabsTrigger value="signup">حساب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">البريد الإلكتروني</Label>
                <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-pass">كلمة المرور</Label>
                <Input
                  id="si-pass"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                تسجيل الدخول
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">الاسم الكامل</Label>
                <Input id="su-name" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-phone">رقم الهاتف</Label>
                <Input id="su-phone" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">البريد الإلكتروني</Label>
                <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pass">كلمة المرور</Label>
                <Input
                  id="su-pass"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                إنشاء الحساب
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
