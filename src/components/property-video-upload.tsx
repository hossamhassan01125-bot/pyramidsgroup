import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PROPERTY_BUCKET } from "@/components/property-image";
import { PropertyVideo } from "@/components/property-video";

const MAX_BYTES = 100 * 1024 * 1024;

export function PropertyVideoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) return toast.error("اختر ملف فيديو صالح");
    if (file.size > MAX_BYTES) return toast.error("حجم الفيديو أكبر من 100 ميجابايت");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `videos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(PROPERTY_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    setUploading(false);

    if (error) return toast.error("تعذّر رفع الفيديو: " + error.message);
    onChange(path);
    toast.success("تم رفع الفيديو");
  }

  return (
    <div className="space-y-2">
      <Label>فيديو العقار (اختياري)</Label>
      {value && <PropertyVideo value={value} className="max-h-52 w-full rounded-xl border border-border" />}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {value ? "تغيير الفيديو" : "رفع فيديو"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 className="size-4" /> إزالة
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <p className="text-xs text-muted-foreground">
        ارفع فيديو من جهازك (حتى 100 ميجابايت) — MP4 مفضّل.
      </p>
    </div>
  );
}
