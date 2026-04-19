"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Wrench, Gauge } from "lucide-react";

interface Props {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StartMsg {
  type: "start";
  autoBadge: "auto-submit" | "review";
  meritScore: number | null;
}
interface StepMsg {
  type: "step";
  kind: "thinking" | "tool" | "decision";
  label: string | null;
  text: string;
  tokens: number | null;
  totalTokens: number;
}
interface DoneMsg {
  type: "done";
  totalTokens: number;
}
type Msg = StartMsg | StepMsg | DoneMsg;

export function ReasoningPanel({ candidateId, open, onOpenChange }: Props) {
  const [steps, setSteps] = useState<StepMsg[]>([]);
  const [meta, setMeta] = useState<{
    badge: "auto-submit" | "review";
    merit: number | null;
    totalTokens: number;
    done: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !candidateId) return;
    setSteps([]);
    setMeta(null);

    const es = new EventSource(`/api/reasoning/${candidateId}`);
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as Msg;
        if (data.type === "start") {
          setMeta({
            badge: data.autoBadge,
            merit: data.meritScore,
            totalTokens: 0,
            done: false,
          });
        } else if (data.type === "step") {
          setSteps((prev) => [...prev, data]);
          setMeta((prev) =>
            prev ? { ...prev, totalTokens: data.totalTokens } : prev
          );
        } else if (data.type === "done") {
          setMeta((prev) =>
            prev
              ? { ...prev, totalTokens: data.totalTokens, done: true }
              : prev
          );
          es.close();
        }
      } catch {
        // ignore
      }
    };
    es.onerror = () => es.close();
    return () => {
      es.close();
    };
  }, [candidateId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 border-b px-6 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <SheetTitle className="text-base font-semibold">
                Agent reasoning
              </SheetTitle>
            </div>
            {meta && (
              <Badge
                variant={meta.badge === "auto-submit" ? "money" : "warning"}
                className="uppercase tracking-wide"
              >
                {meta.badge === "auto-submit" ? "Auto" : "Review"}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Live token-stream from the dispute classifier — exactly what the
            agent saw, in order.
          </SheetDescription>
          {meta && (
            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Gauge className="size-3" />
                Merit{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {meta.merit ?? "—"}
                </span>
                /100
              </span>
              <span className="tabular-nums">
                {meta.totalTokens.toLocaleString()} tokens
                {meta.done ? "" : "…"}
              </span>
            </div>
          )}
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-2 overflow-y-auto bg-secondary/30 px-5 py-4 text-[13px]"
        >
          <AnimatePresence initial={false}>
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border bg-card px-3 py-2.5 leading-relaxed"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {s.kind === "tool" ? (
                    <Wrench className="size-3" />
                  ) : s.kind === "decision" ? (
                    <Zap className="size-3" />
                  ) : (
                    <Brain className="size-3" />
                  )}
                  <span>{s.kind}</span>
                  {s.label && (
                    <span className="rounded bg-secondary px-1 py-px font-mono text-[9px] normal-case tracking-normal text-foreground">
                      {s.label}
                    </span>
                  )}
                  {s.tokens != null && (
                    <span className="ml-auto tabular-nums text-muted-foreground/70">
                      +{s.tokens}
                    </span>
                  )}
                </div>
                <div className="text-foreground/90">{s.text}</div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!meta?.done && steps.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              thinking…
            </div>
          )}
          {meta?.done && (
            <div className="rounded-xl border border-money/30 bg-money/[0.06] px-3 py-2 text-[11px] text-money">
              Trace complete · {meta.totalTokens.toLocaleString()} tokens
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
