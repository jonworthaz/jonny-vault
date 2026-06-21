import { CONFIG, modelFor } from "./config.ts";
import { resolveRoute } from "./components.ts";
import type { TokenUsage, EngineState } from "./types.ts";

// The AI "workforce" router. Resolves each call to a model + provider via the
// component registry (so per-agent model changes and holds take effect), meters
// tokens by component, and supports:
//   - Anthropic (Claude) via @anthropic-ai/sdk
//   - non-Claude models via any OpenAI-compatible endpoint (CUSTOM_LLM_BASE_URL)
//   - a deterministic offline fallback when nothing is configured (zero deps)

export interface CompleteOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  loop?: string; // routes the model + attributes token usage
  state?: EngineState; // enables registry-based routing (model/provider/hold)
  offline: () => string;
}

function zero(): TokenUsage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, estCostUsd: 0, byLoop: {} };
}
let pending: TokenUsage = zero();

export function drainUsage(): TokenUsage {
  const out = pending;
  pending = zero();
  return out;
}

function record(key: string, model: string, u: any): void {
  const input = u?.input_tokens ?? 0;
  const output = u?.output_tokens ?? 0;
  const cacheRead = u?.cache_read_input_tokens ?? 0;
  const cacheWrite = u?.cache_creation_input_tokens ?? 0;
  const price = CONFIG.pricing[model] ?? { input: 0, output: 0 }; // unknown (e.g. custom) → cost unmetered
  const cost =
    ((input + cacheRead * 0.1 + cacheWrite * 1.25) * price.input + output * price.output) / 1_000_000;

  pending.input += input;
  pending.output += output;
  pending.cacheRead += cacheRead;
  pending.cacheWrite += cacheWrite;
  pending.calls += 1;
  pending.estCostUsd += cost;
  const b = (pending.byLoop[key] ??= { input: 0, output: 0, calls: 0, estCostUsd: 0 });
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

export function customConfigured(): boolean {
  return Boolean(process.env.CUSTOM_LLM_BASE_URL);
}

export function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) || customConfigured();
}

// Call any OpenAI-compatible chat endpoint (OpenAI, OpenRouter, local servers,
// etc.). Returns null if not configured → caller falls back to offline.
async function callCustom(
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<{ text: string; usage: any } | null> {
  const base = process.env.CUSTOM_LLM_BASE_URL;
  const key = process.env.CUSTOM_LLM_API_KEY;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    const j: any = await res.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    const usage = { input_tokens: j?.usage?.prompt_tokens ?? 0, output_tokens: j?.usage?.completion_tokens ?? 0 };
    return { text, usage };
  } catch (err) {
    console.warn(`[llm] custom provider call failed: ${(err as Error).message}`);
    return null;
  }
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const route = opts.state && opts.loop ? resolveRoute(opts.state, opts.loop) : null;
  const key = route?.key ?? opts.loop ?? "default";

  // On-hold components don't spend — they degrade to the deterministic path.
  if (route?.onHold) return opts.offline();

  const provider = route?.provider ?? "anthropic";
  const model = route?.model ?? modelFor(opts.loop);
  const maxTokens = opts.maxTokens ?? 1500;

  if (provider === "custom") {
    const r = await callCustom(model, opts.system, opts.prompt, maxTokens);
    if (!r) return opts.offline();
    record(key, model, r.usage);
    return r.text.trim() || opts.offline();
  }

  const client: any = await getClient();
  if (!client) return opts.offline();
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: CONFIG.effort },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.prompt }],
    });
    record(key, model, resp.usage);
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
