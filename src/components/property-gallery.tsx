import { useState } from "react";
import { PropertyImage } from "@/components/property-image";

/** Shows a property's images with simple thumbnail switching. */
export function PropertyGallery({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div>
      <PropertyImage
        value={images[Math.min(active, images.length - 1)]}
        alt={alt}
        className={className ?? "h-44 w-full object-cover"}
      />
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-2 pt-2">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              aria-label={`صورة ${i + 1}`}
              onClick={() => setActive(i)}
              className={`shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === active ? "border-primary" : "border-transparent"
              }`}
            >
              <PropertyImage value={img} alt={`${alt} ${i + 1}`} className="size-12 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
