"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGenerateEdition } from "../hooks";

type Props = { label?: string; autoStart?: boolean };

export function GenerateButton({ label = "Print today's edition", autoStart = false }: Props) {
  const router = useRouter();
  const generate = useGenerateEdition();
  const started = useRef(false);

  const print = () => generate.mutate(undefined, { onSuccess: () => router.refresh() });

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      print();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={print} disabled={generate.isPending} className="font-condensed uppercase tracking-widest">
        {generate.isPending ? "On the press… ~20s" : label}
      </Button>
      {generate.error && <p className="max-w-xs text-right text-xs text-destructive">{generate.error.message}</p>}
    </div>
  );
}