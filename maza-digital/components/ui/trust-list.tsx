import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Short list of honest promises shown next to calls to action. */
export function TrustList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-6 gap-y-2 text-sm text-fog", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <Check aria-hidden className="size-4 shrink-0 text-blue" />
          {item}
        </li>
      ))}
    </ul>
  );
}
