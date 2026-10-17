"use client";

import type { ReactNode } from "react";
import { useStorySignal } from "./FeedbackProvider";

export function OriginalLink({
  storyId,
  href,
  className,
  children,
}: {
  storyId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const send = useStorySignal(storyId);
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} onClick={() => send("click")}>
      {children}
    </a>
  );
}