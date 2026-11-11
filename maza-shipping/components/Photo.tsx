import Image from "next/image";
import { photos, type PhotoKey } from "@/content/site";

type Props = {
  name: PhotoKey;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/** Fills its (relatively positioned, sized) parent → no layout shift. */
export default function Photo({ name, alt, sizes = "100vw", priority, className = "" }: Props) {
  return (
    <Image
      src={photos[name].src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
