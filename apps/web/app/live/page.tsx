import { LiveGrid } from "@/components/live/live-grid";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "dishpute — Live scrape",
};

export default function LivePage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-8">
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-widest text-money">
            Live · DoorDash · Uber Eats · Grubhub
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Watch it scrape.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-foreground/60">
            Hit <span className="font-semibold text-foreground">Fire batch</span> to dispatch a browser agent across all three portals. Every order found, classified, and filed appears in real time below.
          </p>
        </div>

        <LiveGrid />
      </main>
    </div>
  );
}
