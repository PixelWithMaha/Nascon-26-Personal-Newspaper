import Link from "next/link";
import { cn } from "@/lib/utils";

/** The nameplate as a home link. "dark" is for dark pages (archive, landing). */
export function SiteLogo({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="The Morning Paper home"
      className={cn(
        "font-blackletter text-2xl leading-none transition-opacity hover:opacity-70 md:text-3xl",
        tone === "dark" ? "text-paper" : "text-ink",
        className,
      )}
    >
      The Morning Paper
    </Link>
  );
}
