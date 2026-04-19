"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Snapshot {
  type: "snapshot";
  totalCents: number;
}
interface Tick {
  type: "transfer";
  totalCents: number;
  transfer: {
    id: string;
    amountCents: number;
    candidateId: string | null;
  };
}

export function RecoveredToday() {
  const [totalCents, setTotalCents] = useState(0);
  const [pulse, setPulse] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [arming, setArming] = useState(false);

  const spring = useSpring(0, { stiffness: 80, damping: 20, mass: 0.6 });
  const display = useTransform(spring, (v) => `$${(v / 100).toFixed(2)}`);

  useEffect(() => {
    spring.set(totalCents);
  }, [totalCents, spring]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transfers/today", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTotalCents(d.totalCents ?? 0);
      })
      .catch(() => undefined);

    const es = new EventSource("/api/transfers/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as Snapshot | Tick | { type: string };
        if (data.type === "snapshot" || data.type === "transfer") {
          setTotalCents((data as Snapshot).totalCents ?? 0);
        }
        if (data.type === "transfer") {
          const t = (data as Tick).transfer;
          setPulse({ id: t.id, amount: t.amountCents });
          setTimeout(() => setPulse(null), 4000);
        }
      } catch {
        // ignore
      }
    };
    es.onerror = () => es.close();
    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  async function arm() {
    setArming(true);
    try {
      await fetch("/api/transfers/demo-arm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: 1850 + Math.floor(Math.random() * 2200) }),
      });
    } finally {
      setArming(false);
    }
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 ring-1 ring-money/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recovered today
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <motion.div className="text-4xl font-semibold tabular-nums text-money">
              {display}
            </motion.div>
            <span className="text-xs text-muted-foreground">
              via Stripe Connect
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Springs up the moment Stripe confirms a transfer to the merchant.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={arm}
          disabled={arming}
          title="Demo: synthesise a transfer.created event"
        >
          <Zap className="size-3.5" />
          {arming ? "Arming…" : "Demo arm"}
        </Button>
      </div>

      {pulse && (
        <motion.div
          key={pulse.id}
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-money/15 px-2.5 py-1 text-[11px] font-semibold text-money"
        >
          <Sparkles className="size-3" />
          +${(pulse.amount / 100).toFixed(2)} just landed
        </motion.div>
      )}
    </div>
  );
}
