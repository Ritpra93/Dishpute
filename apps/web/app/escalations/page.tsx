'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

const DENIED_DISPUTES = [
  {
    id: 'DD-271940',
    orderId: 'dc-022',
    item: 'Family Biryani Platter',
    amount: '$76.00',
    reason: 'Missing item — customer claim',
    deniedAt: '2 hours ago',
    active: true,
  },
  {
    id: 'DD-104928',
    orderId: 'dc-011',
    item: 'Lamb Rogan Josh × 2',
    amount: '$48.00',
    reason: 'Missing item — customer claim',
    deniedAt: '1 day ago',
    active: false,
  },
  {
    id: 'DD-326741',
    orderId: 'dc-013',
    item: 'Fish Curry + Naan',
    amount: '$72.00',
    reason: 'Wrong item delivered',
    deniedAt: '3 days ago',
    active: false,
  },
];

const TRANSCRIPT: { role: 'agent' | 'ai'; text: string }[] = [
  {
    role: 'agent',
    text: "Thank you for calling DoorDash Merchant Support. This is Alex, how can I help you today?",
  },
  {
    role: 'ai',
    text: "Hi Alex, I'm calling on behalf of House of Curry regarding dispute DD-271940. We received a denial on a missing item charge for a Family Biryani Platter from April 15th. We'd like to request a manual review.",
  },
  {
    role: 'agent',
    text: "Sure, I can look into that. Can you give me the merchant ID and order number?",
  },
  {
    role: 'ai',
    text: "Merchant ID is merchant_hoc, order number DC-022. The charge was $76.00 and was auto-denied without review. Our kitchen prep logs confirm the item was included and sealed at packaging.",
  },
  {
    role: 'agent',
    text: "Okay, I'm pulling that up now… I can see the dispute was auto-denied by our system. Let me escalate this for a manual review. Can you hold for just a moment?",
  },
  {
    role: 'ai',
    text: "Of course, I'll hold. Thank you, Alex.",
  },
];

export default function EscalationsPage() {
  const [seconds, setSeconds] = useState(165);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left panel — denied disputes */}
      <div className="w-80 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Denied Disputes</p>
          <p className="text-xs text-zinc-600 mt-0.5">3 awaiting escalation</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {DENIED_DISPUTES.map((d) => (
            <div
              key={d.id}
              className={`mx-2 mb-1 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                d.active
                  ? 'bg-zinc-800 border border-zinc-700'
                  : 'hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-zinc-400">{d.id}</span>
                {d.active ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    live
                  </span>
                ) : (
                  <span className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                    denied
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-100 font-medium truncate">{d.item}</p>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{d.reason}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-zinc-200">{d.amount}</span>
                <span className="text-xs text-zinc-600">{d.deniedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Active call header */}
        <div className="px-8 py-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.2, 1], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
                  Active Call
                </span>
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">Escalating Dispute #DD-271940</h2>
              <p className="text-sm text-zinc-500 mt-0.5">DoorDash Merchant Support · Alex</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <p className="text-2xl font-mono font-semibold text-zinc-100 tabular-nums">
                  {formatTime(seconds)}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">elapsed</p>
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  muted
                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {muted ? <MicOff size={14} /> : <Mic size={14} />}
                {muted ? 'Unmute' : 'Mute Agent'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                <PhoneOff size={14} />
                End Call
              </button>
            </div>
          </div>
        </div>

        {/* Live transcript */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase mb-4">
            Live Transcript
          </p>
          {TRANSCRIPT.map((line, i) => (
            <div key={i} className={`flex ${line.role === 'ai' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[60%] flex flex-col gap-1 ${line.role === 'ai' ? 'items-end' : 'items-start'}`}>
                <p
                  className={`text-xs font-semibold tracking-wider uppercase ${
                    line.role === 'ai' ? 'text-emerald-500' : 'text-zinc-500'
                  }`}
                >
                  {line.role === 'ai' ? 'Counter AI' : 'Support Agent'}
                </p>
                <div
                  className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                    line.role === 'ai'
                      ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/15'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {line.text}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="flex flex-col gap-1 items-start">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                Support Agent
              </p>
              <div className="px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center gap-1.5">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-8 py-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase whitespace-nowrap">
              AI Confidence
            </p>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '88%' }} />
              </div>
              <span className="text-sm font-semibold text-emerald-400">88%</span>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <div>
            <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase">
              Connection
            </p>
            <p className="text-xs text-zinc-300 mt-0.5">Ultra-low latency</p>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <div>
            <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase">
              Expected Outcome
            </p>
            <p className="text-xs text-emerald-400 font-medium mt-0.5">Reversal likely</p>
          </div>

          <div className="ml-auto">
            <button className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold tracking-wide uppercase text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100 transition-colors">
              <Phone size={12} />
              Intervene Manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
