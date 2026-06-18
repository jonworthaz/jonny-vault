import { CONFIG, modelFor } from "./config.ts";
import type { TokenUsage } from "./types.ts";

// The AI "workforce". Uses the real Claude API when @anthropic-ai/sdk is
// installed AND ANTHROPIC_API_KEY is set; otherwise falls back to a deterministic
// offline synthesizer so the whole engine runs with zero dependencies.
//
// Token discipline (see 11-landscape-and-gaps.md):
//   - per-loop model routing (frontier only where it matters) via modelFor()
//   - prompt caching on the stable system block
//   - all usage is metered and drained into engine state for the dashboard

export interface CompleteOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  loop?: string; // routes the model + attributes token usage
  offline: () => string; // deterministic output when no live model is available
}

// In-process usage accumulator, drained into state after each command.
function zero(): TokenUsage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, estCostUsd: 0, byLoop: {} };
}
let pending: TokenUsage = zero();

export function drainUsage(): TokenUsage {
  const out = pending;
  pending = zero();
  return out;
}

function record(loop: string, model: string, u: any): void {
  const input = u?.input_tokens ?? 0;
  const output = u?.output_tokens ?? 0;
  const cacheRead = u?.cache_read_input_tokens ?? 0;
  const cacheWrite = u?.cache_creation_input_tokens ?? 0;
  const price = CONFIG.pricing[model] ?? { input: 5, output: 25 };
  // Cache reads ~0.1x input, writes ~1.25x input.
  const cost =
    ((input + cacheRead * 0.1 + cacheWrite * 1.25) * price.input + output * price.output) / 1_000_000;

  pending.input += input;
  pending.output += output;
  pending.cacheRead += cacheRead;
  pending.cacheWrite += cacheWrite;
  pending.calls += 1;
  pending.estCostUsd += cost;
  const b = (pending.byLoop[loop] ??= { input: 0, output: 0, calls: 0, estCostUsd: 0 });
  b.input += input + cacheRead + cacheWrite;
  b.output += output;
  b.calls += 1;
  b.estCostUsd += cost;
}

let clientPromise: Promise<unknown> | null = null;
async function getClient(): Promise<unknown | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod: any = await import("@anthropic-ai/sdk");
        const Anthropic = mod.default ?? mod.Anthropic;
        return new Anthropic();
      } catch {
        return null;
      }
    })();
  }
  return clientPromise as Promise<unknown | null>;
}

export function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const client: any = await getClient();
  if (!client) return opts.offline();

  const model = modelFor(opts.loop);
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: CONFIG.effort },
      // Stable system block is cached (prompt caching → ~0.1x on repeats).
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.prompt }],
    });
    record(opts.loop ?? "default", model, resp.usage);
    const text = (resp.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    return text || opts.offline();
  } catch (err) {
    console.warn(`[llm] live call failed, using offline fallback: ${(err as Error).message}`);
    return opts.offline();
  }
}

// Parse the first JSON object/array out of a model response.
export function extractJSON<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  for (let end = candidate.length; end > start; end--) {
    try {
      return JSON.parse(candidate.slice(start, end)) as T;
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}
