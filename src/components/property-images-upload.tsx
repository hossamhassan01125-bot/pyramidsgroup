import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PROPERTY_BUCKET, PropertyImage } from "@/components/property-image";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 12;

export function PropertyImagesUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: File[]) {
    const room = MAX_FILES - value.length;
    if (room <= 0) return toast.error(`الحد الأقصى ${MAX_FILES} صورة`);

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: ليس ملف صورة`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: أكبر من 10 ميجابايت`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `properties/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(PROPERTY_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) toast.error("تعذّر رفع الصورة: " + error.message);
      else uploaded.push(path);
    }
    setUploading(false);

    if (uploaded.length) {
      onChange([...value, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} صورة`);
    }
  }

  return (
    <div className="space-y-2">
      <Label>صور العقار</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((path, i) => (
            <div key={path} className="relative">
              <PropertyImage
                value={path}
                alt={`صورة العقار ${i + 1}`}
                className="size-20 rounded-xl border border-border object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                aria-label="حذف الصورة"
                className="absolute -top-2 -left-2 size-6 rounded-full"
                onClick={() => onChange(value.filter((v) => v !== path))}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        إضافة صور
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) handleFiles(files);
        }}
      />
      <p className="text-xs text-muted-foreground">
        تقدر ترفع أكثر من صورة (حتى {MAX_FILES} صور، كل صورة حتى 10 ميجابايت). الصورة الأولى هي
        الصورة الرئيسية.
      </p>
    </div>
  );
}
