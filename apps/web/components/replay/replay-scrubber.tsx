"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, RotateCcw, Zap, AlertTriangle } from "lucide-react";
import type { ReplayArtifact } from "@counter/types";

const SPEEDS = [0.5, 1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

interface Props {
  artifact: ReplayArtifact;
}

export function ReplayScrubber({ artifact }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const totalSteps = artifact.steps.length;
  const totalDurationMs = useMemo(
    () => artifact.steps.reduce((acc, s) => acc + (s.durationMs ?? 1000), 0),
    [artifact.steps]
  );

  const cumulativeMs = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const s of artifact.steps) {
      acc += s.durationMs ?? 1000;
      arr.push(acc);
    }
    return arr;
  }, [artifact.steps]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      setStepIndex((idx) => {
        if (idx >= totalSteps - 1) {
          setPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    };
    const ms = ((artifact.steps[stepIndex]?.durationMs ?? 1000) / speed);
    const t = setTimeout(tick, ms);
    return () => clearTimeout(t);
  }, [playing, stepIndex, speed, totalSteps, artifact.steps]);

  const currentStep = artifact.steps[stepIndex];

  const escalationMarkers = artifact.escalations.map((e) => ({
    pct: cumulativeMs[e.atStepIndex] ? cumulativeMs[e.atStepIndex]! / totalDurationMs : 0,
    label: `Escalated → ${e.toMode}`,
    kind: "escalation" as const,
  }));

  const fallbackEvents = artifact.events.filter(
    (e) => e.type === "FALLBACK_ENGAGED"
  );
  const fallbackMarkers = fallbackEvents.map((ev) => {
    const eventTimeMs = new Date(ev.timestamp).getTime();
    const startMs = artifact.startedAt
      ? new Date(artifact.startedAt).getTime()
      : new Date(artifact.createdAt).getTime();
    const offsetMs = Math.max(0, eventTimeMs - startMs);
    return {
      pct: Math.min(1, offsetMs / totalDurationMs),
      label: "Fallback engaged",
      kind: "fallback" as const,
    };
  });

  const allMarkers = [...escalationMarkers, ...fallbackMarkers];

  const currentPct =
    cumulativeMs[stepIndex] !== undefined
      ? cumulativeMs[stepIndex]! / totalDurationMs
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Pane title="Browser" subtitle="screenshot">
          {currentStep?.screenshotDataUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              {/* Pixel placeholder is intentional — fixture replay uses 1×1 art */}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                {currentStep.action ?? "—"}
              </div>
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg border bg-muted text-xs" />
          )}
        </Pane>
        <Pane title="Action" subtitle={`step ${stepIndex + 1} / ${totalSteps}`}>
          <code className="block max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/40 p-3 font-mono text-[12px] leading-relaxed text-foreground">
            {currentStep?.action ?? "—"}
          </code>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              {currentStep?.durationMs ? `${currentStep.durationMs} ms` : "—"}
            </span>
            <span>·</span>
            <span>{currentStep?.status ?? "—"}</span>
          </div>
        </Pane>
        <Pane title="Reasoning" subtitle="agent thinking">
          <p className="text-[13px] leading-relaxed text-foreground">
            {currentStep?.reasoning ?? "—"}
          </p>
        </Pane>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setStepIndex(0);
                setPlaying(false);
              }}
              aria-label="Restart"
            >
              <RotateCcw className="size-4" />
            </Button>
            <div className="ml-2 flex items-center gap-1 rounded-lg border bg-card p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-md px-2 py-1 text-[11px] tabular-nums transition-colors ${
                    s === speed
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="text-[11px] tabular-nums text-muted-foreground">
            {(((cumulativeMs[stepIndex] ?? 0) / 1000)).toFixed(1)}s /
            {(totalDurationMs / 1000).toFixed(1)}s
          </div>
        </div>

        <div className="relative h-10 select-none">
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={stepIndex}
            onChange={(e) => {
              setStepIndex(Number(e.target.value));
              setPlaying(false);
            }}
            className="absolute inset-x-0 top-3 z-20 h-2 w-full appearance-none rounded-full bg-secondary accent-primary"
          />
          <div className="absolute inset-x-0 top-3 z-10 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full bg-primary/40"
              initial={false}
              animate={{ width: `${currentPct * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
          </div>
          {allMarkers.map((m, i) => (
            <div
              key={i}
              style={{ left: `${m.pct * 100}%` }}
              className="absolute top-0 z-30 -translate-x-1/2"
              title={m.label}
            >
              <div
                className={`h-7 w-0.5 ${
                  m.kind === "escalation" ? "bg-warning" : "bg-denied-border"
                }`}
              />
              <div
                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                  m.kind === "escalation"
                    ? "bg-warning/20 text-warning"
                    : "bg-denied-bg text-denied-border"
                }`}
              >
                {m.kind === "escalation" ? (
                  <Zap className="size-2.5" />
                ) : (
                  <AlertTriangle className="size-2.5" />
                )}
                {m.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline">status: {artifact.status}</Badge>
          {artifact.escalations.map((e, i) => (
            <Badge key={i} variant="warning">
              escalated → {e.toMode}
            </Badge>
          ))}
          {fallbackEvents.length > 0 && (
            <Badge variant="destructive">
              fallback × {fallbackEvents.length}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function Pane({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}
