import { notFound } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { ReplayScrubber } from "@/components/replay/replay-scrubber";
import { getReplay, listReplayIds } from "@/lib/fixtures/replay";

export const metadata = { title: "Counter — Replay" };

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const artifact = getReplay(runId);
  if (!artifact) notFound();

  const others = listReplayIds().filter((id) => id !== runId);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 pb-12 pt-8">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-money">
          Run replay
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {artifact.goal}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          run <span className="font-mono">{artifact.runId}</span> · candidate{" "}
          <span className="font-mono">{artifact.candidateId}</span>
        </p>

        <div className="mt-6">
          <ReplayScrubber artifact={artifact} />
        </div>

        {others.length > 0 && (
          <div className="mt-6 text-xs text-muted-foreground">
            Other runs:{" "}
            {others.map((id) => (
              <a
                key={id}
                href={`/replay/${id}`}
                className="ml-2 font-mono underline-offset-2 hover:underline"
              >
                {id}
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
