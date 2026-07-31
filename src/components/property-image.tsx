import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PROPERTY_BUCKET = "property-images";

export function isStoragePath(value?: string | null) {
  return Boolean(value) && !/^https?:\/\//i.test(value!) && !value!.startsWith("data:");
}

/** Resolves a stored value (external URL or storage object path) to a displayable URL. */
export function usePropertyImageUrl(value?: string | null) {
  const [url, setUrl] = useState<string | null>(
    value && !isStoragePath(value) ? value : null,
  );

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    if (!isStoragePath(value)) {
      setUrl(value);
      return;
    }
    supabase.storage
      .from(PROPERTY_BUCKET)
      .createSignedUrl(value, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}

export function PropertyImage({
  value,
  alt,
  className,
}: {
  value?: string | null;
  alt: string;
  className?: string;
}) {
  const url = usePropertyImageUrl(value);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-secondary ${className ?? ""}`}>
        <ImageOff className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
