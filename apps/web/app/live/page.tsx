import { LiveGrid } from "@/components/live/live-grid";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "Counter Live — three platforms, one agent",
};

export default function LivePage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-6 pb-16 pt-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-money">
              Live · all three platforms
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Watch Counter run.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground/70">
              Click <span className="font-semibold">Fire batch</span> to dispatch a
              browser agent to DoorDash, Uber Eats, and Grubhub at once. Reasoning
              streams live on top of each portal; the recovered counter ticks up as
              each dispute clears.
            </p>
          </div>
        </div>

        <LiveGrid />
      </main>
    </div>
  );
}
