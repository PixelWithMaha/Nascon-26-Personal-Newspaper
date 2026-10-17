"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiDownload } from "@/lib/api/client";

export function DownloadPdfButton({ editionId, editionDate }: { editionId: string; editionDate: string }) {
  const download = useMutation({
    mutationFn: async () => {
      const blob = await apiDownload(`/api/pdf?edition=${editionId}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `morning-paper-${editionDate}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={() => download.mutate()}
        disabled={download.isPending}
        className="border-ink font-condensed uppercase tracking-widest"
      >
        {download.isPending ? "Setting type…" : "Download PDF"}
      </Button>
      {download.error && <p className="max-w-xs text-right text-xs text-destructive">{download.error.message}</p>}
    </div>
  );
}