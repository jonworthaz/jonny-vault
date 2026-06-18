import { loadState, saveState, persist } from "./store.ts";
import { isLive } from "./llm.ts";
import { logActivity } from "./activity.ts";
import { runCycle, approveAction } from "./orchestrator.ts";
import { renderDashboard } from "./dashboard.ts";
import { runNicheLoop } from "./loops/niche.ts";
import { runCreativeLoop } from "./loops/creative.ts";
import { runAnalysisLoop } from "./loops/analysis.ts";
import { runRetentionLoop } from "./loops/retention.ts";
import { registerExperiment, concludeExperiment, experimentStatus } from "./loops/experiment.ts";
import { COMPONENTS, defOf, stateOf, mark } from "./components.ts";
import { CONFIG } from "./config.ts";
import type { EngineState, Provider } from "./types.ts";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

// Loop-running commands are blocked while the human has taken control.
function blockedIfPaused(state: EngineState): boolean {
  if (state.autonomy === "paused") {
    console.log("⏸ Engine is PAUSED (human in control). Run `handback` to resume.");
    return true;
  }
  return false;
}

function printStatus(): void {
  const s = loadState();
  console.log(`Engine status  [${isLive() ? "LIVE Claude API" : "OFFLINE deterministic"}]  autonomy: ${s.autonomy}`);
  console.log(`  Selected niche : ${s.selectedNiche ?? "(none)"}`);
  console.log(`  Creatives      : ${s.creatives.length}   Experiments: ${s.experiments.length}   Learnings: ${s.learnings.length}`);
  console.log(`  Pending actions: ${s.proposedActions.filter((a) => a.status === "pending").length}`);
  console.log(`  Tokens         : ${s.tokens.calls} calls, $${s.tokens.estCostUsd.toFixed(4)} est.`);
  console.log(`  Updated        : ${s.updatedAt}`);
}

const HELP = [
  "Lean Subscription Engine — AI-run business operating system",
  "",
  "Usage: node src/cli.ts <command>",
  "",
  "  dashboard                      Full control dashboard (workflow, needs, tokens, control)",
  "  status                         One-line state summary",
  "  cycle                          Run one full self-improving cycle (all loops)",
  "  niche | select-niche \"<name>\"  Score / commit a niche",
  "  creative <channel> [angle]     Generate guardrail-checked ad copy",
  "  analyze [metrics.csv]          Unit economics + scale gate",
  "  retention \"reason;reason\"      Churn analysis → fixes",
  "  experiment new \"<hyp>\" --variants a,b --metric trial_to_paid",
  "  experiment conclude <id> --winner a",
  "  actions | approve <id> | reject <id>",
  "  takeover | handback [auto|assist]   Human takeover / resume (whole engine)",
  "  components                     List modular agents/functions",
  "  hold <key> | resume <key>      Put one module on hold / resume (per-agent takeover)",
  "  model <key> <id> [--provider custom]   Change a module's model (Claude or non-Claude)",
  "  learnings",
];

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case undefined:
    case "help":
      console.log(HELP.join("\n") + `\n\nMode: ${isLive() ? "LIVE" : "OFFLINE"}`);
      break;

    case "dashboard":
      console.log(renderDashboard(loadState()));
      break;

    case "status":
      printStatus();
      break;

    case "cycle":
      console.log(await runCycle());
      break;

    case "takeover": {
      const s = loadState();
      s.autonomy = "paused";
      logActivity(s, "control", "control", "Human took control (engine paused).");
      saveState(s);
      console.log("⏸ Engine PAUSED. You have manual control. Inspect `dashboard`/`actions`, then `handback` to resume.");
      break;
    }

    case "handback": {
      const s = loadState();
      const mode = args[0] === "auto" ? "auto" : "assist";
      s.autonomy = mode;
      logActivity(s, "control", "control", `Control handed back to engine (${mode}).`);
      saveState(s);
      console.log(`▶ Engine resumed in ${mode} mode.`);
      break;
    }

    case "niche": {
      const s = loadState();
      if (blockedIfPaused(s)) break;
      console.log((await runNicheLoop(s)).join("\n"));
      persist(s);
      break;
    }

    case "select-niche": {
      const name = args[0];
      if (!name) return void console.log('Provide a name: select-niche "Sales/outbound copilot"');
      const s = loadState();
      s.selectedNiche = name;
      logActivity(s, "niche", "note", `Niche committed: ${name}.`);
      saveState(s);
      console.log(`Selected niche: ${name}.`);
      break;
    }

    case "creative": {
      const s = loadState();
      if (blockedIfPaused(s)) break;
      console.log((await runCreativeLoop(s, args[0] ?? "paid-social", args[1])).join("\n"));
      persist(s);
      break;
    }

    case "analyze": {
      const s = loadState();
      if (blockedIfPaused(s)) break;
      console.log((await runAnalysisLoop(s, args[0])).join("\n"));
      persist(s);
      break;
    }

    case "retention": {
      const s = loadState();
      if (blockedIfPaused(s)) break;
      const reasons = args[0] ? args.join(" ").split(";").map((r) => r.trim()).filter(Boolean) : undefined;
      console.log((await runRetentionLoop(s, reasons)).join("\n"));
      persist(s);
      break;
    }

    case "experiment": {
      const s = loadState();
      const sub = args[0];
      if (sub === "new") {
        const variants = (flag(args, "variants") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
        const metric = flag(args, "metric") ?? "trial_to_paid";
        if (!args[1] || variants.length < 2) {
          console.log('Usage: experiment new "<hypothesis>" --variants a,b --metric trial_to_paid');
          break;
        }
        console.log(registerExperiment(s, args[1], variants, metric).join("\n"));
      } else if (sub === "conclude") {
        console.log(concludeExperiment(s, args[1], flag(args, "winner") ?? "", flag(args, "result")).join("\n"));
      } else {
        console.log("Usage: experiment new ... | experiment conclude <id> --winner <variant>");
      }
      saveState(s);
      break;
    }

    case "experiments":
      console.log(experimentStatus(loadState()).join("\n"));
      break;

    case "actions": {
      const s = loadState();
      if (!s.proposedActions.length) return void console.log("No proposed actions.");
      for (const a of s.proposedActions) {
        console.log(`${a.id}  [${a.status}]  (${a.kind}) ${a.summary}`);
        console.log(`    ${a.detail.replace(/\n/g, "\n    ")}`);
      }
      break;
    }

    case "approve":
    case "reject": {
      const s = loadState();
      console.log(approveAction(s, args[0], cmd === "approve"));
      saveState(s);
      break;
    }

    case "components": {
      const s = loadState();
      for (const d of COMPONENTS) {
        const st = stateOf(s, d.key)!;
        const t = s.tokens.byLoop[d.key];
        console.log(`${st.status === "on-hold" ? "[on-hold]" : "[active] "} ${d.key.padEnd(20)} ${st.model} (${st.provider})  ${t ? "$" + t.estCostUsd.toFixed(4) : "$0"}`);
        if (st.lastAction) console.log(`    last: ${st.lastAction}`);
      }
      break;
    }

    case "hold":
    case "resume": {
      const key = args[0];
      const s = loadState();
      const st = key ? stateOf(s, key) : undefined;
      if (!st) return void console.log(`Unknown module: ${key}. Run \`components\`.`);
      st.status = cmd === "hold" ? "on-hold" : "active";
      mark(s, key, cmd === "hold" ? "Put on hold (human control)" : "Resumed");
      logActivity(s, key, "control", `${cmd === "hold" ? "Held" : "Resumed"} module ${key}.`);
      saveState(s);
      console.log(`Module ${key} is now ${st.status}.` + (cmd === "hold" ? " It will not make paid model calls (falls back to offline) until resumed." : ""));
      break;
    }

    case "model": {
      const key = args[0];
      const newModel = args[1];
      const provider = (flag(args, "provider") as Provider) ?? "anthropic";
      const s = loadState();
      const st = key ? stateOf(s, key) : undefined;
      if (!st || !newModel) return void console.log('Usage: model <key> <model-id> [--provider anthropic|custom]');
      st.model = newModel;
      st.provider = provider === "custom" ? "custom" : "anthropic";
      mark(s, key, `Model set to ${newModel} (${st.provider})`);
      logActivity(s, key, "control", `Model changed to ${newModel} (${st.provider}).`);
      saveState(s);
      let msg = `${key} now uses ${newModel} (${st.provider}).`;
      if (st.provider === "anthropic" && !CONFIG.pricing[newModel]) msg += " ⚠ Unknown Anthropic model id — cost won't be metered; verify the id.";
      if (st.provider === "custom") msg += " Set CUSTOM_LLM_BASE_URL (+ CUSTOM_LLM_API_KEY) for the OpenAI-compatible endpoint, or it falls back to offline.";
      console.log(msg);
      break;
    }

    case "learnings": {
      const s = loadState();
      if (!s.learnings.length) return void console.log("No learnings yet. Run a cycle.");
      for (const l of s.learnings.slice(0, 20)) console.log(`[${l.loop}] (${(l.confidence * 100).toFixed(0)}%) ${l.insight}`);
      break;
    }

    default:
      console.log(`Unknown command: ${cmd}. Run \`help\`.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
