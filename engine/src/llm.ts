import { CONFIG } from "./config.ts";

// The AI "workforce". Uses the real Claude API when @anthropic-ai/sdk is
// installed AND ANTHROPIC_API_KEY is set; otherwise falls back to a deterministic
// offline synthesizer so the whole engine runs with zero dependencies (e.g. in CI
// or a fresh clone). Loops supply an `offline` fallback for the no-API path.

export interface CompleteOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  // Deterministic output used when no live model is available.
  offline: () => string;
}

let clientPromise: Promise<unknown> | null = null;

async function getClient(): Promise<unknown | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        // Dynamic import so a missing optional dependency never breaks startup.
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

  try {
    // System prompt is cached (prompt caching) since it's stable across calls.
    const resp = await client.messages.create({
      model: CONFIG.model,
      max_tokens: opts.maxTokens ?? 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: CONFIG.effort },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.prompt }],
    });
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

// Parse the first JSON object/array out of a model response (tolerates prose
// around the JSON). Returns null if nothing parseable is found.
export function extractJSON<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  for (let end = candidate.length; end > start; end--) {
    const slice = candidate.slice(start, end);
    try {
      return JSON.parse(slice) as T;
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}
