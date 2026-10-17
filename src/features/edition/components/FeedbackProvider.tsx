"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { sendFeedback } from "../api";
import type { FeedbackSignal } from "../schemas";

type FeedbackContextValue = {
  editionId: string;
  hidden: Set<string>;
  hide: (storyId: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({
  editionId,
  hiddenStoryIds,
  children,
}: {
  editionId: string;
  hiddenStoryIds: string[];
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(() => new Set(hiddenStoryIds));
  const hide = useCallback((id: string) => setHidden((prev) => new Set(prev).add(id)), []);
  return <FeedbackContext.Provider value={{ editionId, hidden, hide }}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

/** Fire-and-forget signal for one story. Feedback must never break reading. */
export function useStorySignal(storyId: string) {
  const { editionId } = useFeedback();
  return useCallback(
    (signal: FeedbackSignal, value?: number) => {
      sendFeedback({ editionId, storyId, signal, value }).catch((err) =>
        console.warn("[feedback]", signal, err),
      );
    },
    [editionId, storyId],
  );
}