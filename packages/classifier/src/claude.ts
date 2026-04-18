import Anthropic from '@anthropic-ai/sdk';
import type { DisputeCandidate, ClassifiedDispute } from '@counter/types';
import { CLASSIFIED_DISPUTE_SCHEMA, PREFILTER_SCHEMA } from './schemas';
import { CLASSIFIER_SYSTEM_PROMPT, PREFILTER_SYSTEM_PROMPT } from './prompts';

// Singleton — set once by initClient(), reused for all calls in the batch.
// Caching only fires on repeated calls with the same prompt prefix; a single
// client instance ensures the HTTP connection is reused and cache headers carry.
let _client: Anthropic | null = null;

export function initClient(apiKey: string): void {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required — set it in .env.local');
  _client = new Anthropic({ apiKey });
}

function getClient(): Anthropic {
  if (!_client) {
    throw new Error('Anthropic client not initialized — call initClient() before classifying');
  }
  return _client;
}

// ─── user message builder ────────────────────────────────────────────────────

export function buildUserMessage(candidate: DisputeCandidate): string {
  const daysLeft = Math.ceil(
    (new Date(candidate.disputeDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const itemsList = candidate.itemsReported
    .map((i) => `  - ${i.name} ×${i.quantity} ($${(i.refundAmountCents / 100).toFixed(2)})`)
    .join('\n');

  return [
    `Order ID: ${candidate.orderId}`,
    `Platform: ${candidate.platform}`,
    `Charge type: ${candidate.chargeType}`,
    `Charge amount: $${(candidate.chargeAmountCents / 100).toFixed(2)}`,
    `Items reported:\n${itemsList}`,
    candidate.customerComment
      ? `Customer comment: "${candidate.customerComment}"`
      : 'Customer comment: [none provided]',
    `Days until dispute deadline: ${daysLeft}`,
    '',
    'Full portal data:',
    candidate.rawText,
  ].join('\n');
}

// ─── generic Claude call ─────────────────────────────────────────────────────

interface CallClaudeParams {
  model: string;
  maxTokens: number;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userContent: string;
}

async function callClaude<T>(params: CallClaudeParams): Promise<T> {
  const client = getClient();

  // output_config.format reached GA in early 2026; SDK types may lag — explicit cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model: params.model,
    max_tokens: params.maxTokens,
    output_config: {
      format: {
        type: 'json_schema',
        schema: params.schema,
      },
    },
    system: [
      {
        type: 'text',
        text: params.systemPrompt,
        cache_control: { type: 'ephemeral' }, // caches the system prompt; reads cost 0.1×
      },
    ],
    messages: [{ role: 'user', content: params.userContent }],
  });

  const textBlock = (response.content as Array<{ type: string; text?: string }>).find(
    (b) => b.type === 'text',
  );

  if (!textBlock?.text) {
    throw new Error(
      `${params.model} returned no text content — model: ${params.model}, stop_reason: ${response.stop_reason}`,
    );
  }

  return JSON.parse(textBlock.text) as T;
}

// ─── Haiku pre-filter ────────────────────────────────────────────────────────

interface PrefilterResult {
  worthDisputing: boolean;
  quickReason: string;
}

export async function prefilterWithHaiku(candidate: DisputeCandidate): Promise<PrefilterResult> {
  return callClaude<PrefilterResult>({
    model: 'claude-haiku-4-5',
    maxTokens: 256,
    schema: PREFILTER_SCHEMA as Record<string, unknown>,
    systemPrompt: PREFILTER_SYSTEM_PROMPT,
    userContent: buildUserMessage(candidate),
  });
}

// ─── Sonnet full classifier ──────────────────────────────────────────────────

export async function classifyWithSonnet(
  candidate: DisputeCandidate,
): Promise<Omit<ClassifiedDispute, 'candidateId' | 'generatedAt'>> {
  return callClaude<Omit<ClassifiedDispute, 'candidateId' | 'generatedAt'>>({
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
    schema: CLASSIFIED_DISPUTE_SCHEMA as Record<string, unknown>,
    systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
    userContent: buildUserMessage(candidate),
  });
}
