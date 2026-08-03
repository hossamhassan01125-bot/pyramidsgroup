import { usePropertyImageUrl } from "@/components/property-image";

/** Plays a property video stored in the bucket (or an external URL). */
export function PropertyVideo({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const url = usePropertyImageUrl(value);
  if (!url) return null;

  return (
    <video
      src={url}
      controls
      preload="metadata"
      playsInline
      className={className ?? "w-full rounded-xl border border-border"}
    />
  );
}
