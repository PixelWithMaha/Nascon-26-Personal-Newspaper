"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function NewsPhoto({ src, topic, className }: { src: string | null; topic: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={cn("relative flex items-end overflow-hidden bg-[#e6dfcf]", className)}
        style={{
          backgroundImage: "radial-gradient(circle, rgba(23,20,15,0.5) 1px, transparent 1.5px)",
          backgroundSize: "6px 6px",
        }}
      >
        <span className="m-2 bg-paper px-1.5 py-0.5 font-condensed text-[10px] uppercase tracking-[0.2em] text-ink">
          {topic}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("w-full object-cover saturate-[0.8] sepia-[0.12]", className)}
    />
  );
}