"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Platform = "doordash" | "ubereats" | "grubhub";

interface OpsResult {
  mode: "live" | "fixture";
  batchId: string;
  startedAt: string;
  runs: Array<{ runId: string; platform: Platform; status: string }>;
}

interface Props {
  endpoint: string;
  buildBody: () => unknown | Promise<unknown>;
  description: string;
  children: ReactNode;
  submitLabel?: string;
  /** When true, the parent has set required fields and the submit can fire. */
  canSubmit?: boolean;
}

export function OpsShell({
  endpoint,
  buildBody,
  description,
  children,
  submitLabel = "Push to all platforms",
  canSubmit = true,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OpsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const body = await buildBody();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          (json?.issues as { path: string; message: string }[] | undefined)
            ?.map((i) => `${i.path}: ${i.message}`)
            .join("; ") ?? json?.error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setResult(json as OpsResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <form onSubmit={onSubmit} className="glass space-y-5 rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            {submitting ? "Dispatching…" : submitLabel}
          </Button>
        </div>
      </form>

      <aside className="glass rounded-2xl p-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Result
        </div>
        {!result && !error && (
          <p className="mt-3 text-sm text-muted-foreground">
            Counter will dispatch one browser-agent run per selected platform.
            Results appear here.
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-denied-border/30 bg-denied-bg p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 text-denied-border" />
            <div>
              <div className="font-semibold">Dispatch failed</div>
              <div className="text-xs text-muted-foreground">{error}</div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-money" />
              <span>
                Batch dispatched ({result.mode === "live" ? "live TinyFish" : "fixture mode"})
              </span>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-3 text-xs">
              <div className="font-mono text-muted-foreground">{result.batchId}</div>
              <div className="mt-1 text-muted-foreground">
                Started {new Date(result.startedAt).toLocaleTimeString("en-US")}
              </div>
            </div>
            <ul className="space-y-1.5 text-xs">
              {result.runs.map((r) => (
                <li
                  key={r.runId}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-3 py-2"
                >
                  <span className="font-medium capitalize">{r.platform}</span>
                  <span className="font-mono text-muted-foreground">
                    {r.runId.slice(-10)} · {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

export function PlatformPicker({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (next: Platform[]) => void;
}) {
  const ALL: { id: Platform; label: string }[] = [
    { id: "doordash", label: "DoorDash" },
    { id: "ubereats", label: "Uber Eats" },
    { id: "grubhub", label: "Grubhub" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {ALL.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (active) onChange(selected.filter((x) => x !== p.id));
              else onChange([...selected, p.id]);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "border-money bg-money text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent/40"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldLabel({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
