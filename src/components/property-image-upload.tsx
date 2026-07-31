import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PROPERTY_BUCKET, PropertyImage } from "@/components/property-image";

const MAX_BYTES = 5 * 1024 * 1024;

export function PropertyImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("اختر ملف صورة صالح");
    if (file.size > MAX_BYTES) return toast.error("حجم الصورة أكبر من 5 ميجابايت");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `properties/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(PROPERTY_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    setUploading(false);

    if (error) return toast.error("تعذّر رفع الصورة: " + error.message);
    onChange(path);
    toast.success("تم رفع الصورة");
  }

  return (
    <div className="space-y-2">
      <Label>صورة العقار</Label>
      <div className="flex items-center gap-3">
        <PropertyImage
          value={value}
          alt="صورة العقار"
          className="size-20 shrink-0 rounded-xl border border-border object-cover"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {value ? "تغيير الصورة" : "رفع صورة"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="size-4" /> إزالة
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <p className="text-xs text-muted-foreground">
        اختر صورة من جهازك (حتى 5 ميجابايت) — لا حاجة لرابط.
      </p>
    </div>
  );
}
