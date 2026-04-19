"use client";

import { ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  disputeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EvidencePreviewDialog({ disputeId, open, onOpenChange }: Props) {
  const url = `/api/evidence/${encodeURIComponent(disputeId)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            Evidence packet — {disputeId}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generated server-side via @react-pdf/renderer. The same PDF is
            attached to the platform dispute submission.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted">
          {open && (
            <iframe
              src={url}
              title={`Evidence packet for ${disputeId}`}
              className="h-full w-full"
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Counter generates the PDF at request time — no caching.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open in new tab
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
