import { loadState, saveState } from "./store.ts";
import { isLive } from "./llm.ts";
import { runCycle, approveAction } from "./orchestrator.ts";
import { runNicheLoop } from "./loops/niche.ts";
import { runCreativeLoop } from "./loops/creative.ts";
import { runAnalysisLoop } from "./loops/analysis.ts";
import { runRetentionLoop } from "./loops/retention.ts";
import { registerExperiment, concludeExperiment, experimentStatus } from "./loops/experiment.ts";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function printStatus(): void {
  const s = loadState();
  console.log(`Engine status  [${isLive() ? "LIVE Claude API" : "OFFLINE deterministic"}]`);
  console.log(`  Selected niche : ${s.selectedNiche ?? "(none — run niche, then select-niche)"}`);
  console.log(`  Niche scores   : ${s.nicheScores.length}`);
  console.log(`  Creatives      : ${s.creatives.length} stored`);
  console.log(`  Experiments    : ${s.experiments.length} (${s.experiments.filter((e) => e.status === "running").length} running)`);
  console.log(`  Learnings      : ${s.learnings.length}`);
  const pending = s.proposedActions.filter((a) => a.status === "pending");
  console.log(`  Pending actions: ${pending.length}`);
  console.log(`  Updated        : ${s.updatedAt}`);
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case undefined:
    case "help": {
      console.log(
        [
          "Lean Subscription Engine — AI-run business operating system",
          "",
          "Usage: node src/cli.ts <command>",
          "",
          "  status                         Show engine state",
          "  cycle                          Run one full self-improving cycle (all loops)",
          "  niche                          Score candidate niches (Phase 0)",
          "  select-niche \"<name>\"          Commit to a niche after the validation sprint",
          "  creative <channel> [angle]     Generate guardrail-checked ad copy",
          "  analyze [path/to/metrics.csv]  Compute unit economics + scale gate",
          "  retention [reason;reason;...]  Analyse churn and propose fixes",
          "  experiment new \"<hypothesis>\" --variants a,b --metric trial_to_paid",
          "  experiment conclude <id> --winner a [--result \"...\"]",
          "  experiments                    List running experiments",
          "  actions                        List proposed actions (approval gates)",
          "  approve <id> | reject <id>     Resolve a proposed action",
          "  learnings                      Show recent learnings (the memory)",
          "",
          isLive() ? "Mode: LIVE (Claude API)" : "Mode: OFFLINE (set ANTHROPIC_API_KEY for live AI)",
        ].join("\n"),
      );
      break;
    }

    case "status":
      printStatus();
      break;

    case "cycle":
      console.log(await runCycle());
      break;

    case "niche": {
      const s = loadState();
      console.log((await runNicheLoop(s)).join("\n"));
      saveState(s);
      break;
    }

    case "select-niche": {
      const name = args[0];
      if (!name) return void console.log('Provide a niche name: select-niche "Sales/outbound copilot"');
      const s = loadState();
      s.selectedNiche = name;
      saveState(s);
      console.log(`Selected niche: ${name}. Future cycles build the product/funnel for this.`);
      break;
    }

    case "creative": {
      const channel = args[0] ?? "paid-social";
      const angle = args[1];
      const s = loadState();
      console.log((await runCreativeLoop(s, channel, angle)).join("\n"));
      saveState(s);
      break;
    }

    case "analyze": {
      const s = loadState();
      console.log((await runAnalysisLoop(s, args[0])).join("\n"));
      saveState(s);
      break;
    }

    case "retention": {
      const reasons = args[0] ? args.join(" ").split(";").map((r) => r.trim()).filter(Boolean) : undefined;
      const s = loadState();
      console.log((await runRetentionLoop(s, reasons)).join("\n"));
      saveState(s);
      break;
    }

    case "experiment": {
      const sub = args[0];
      const s = loadState();
      if (sub === "new") {
        const hypothesis = args[1] ?? "";
        const variants = (flag(args, "variants") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
        const metric = flag(args, "metric") ?? "trial_to_paid";
        if (!hypothesis || variants.length < 2) {
          console.log('Usage: experiment new "<hypothesis>" --variants a,b --metric trial_to_paid');
          break;
        }
        console.log(registerExperiment(s, hypothesis, variants, metric).join("\n"));
      } else if (sub === "conclude") {
        const expId = args[1];
        const winner = flag(args, "winner") ?? "";
        const result = flag(args, "result");
        console.log(concludeExperiment(s, expId, winner, result).join("\n"));
      } else {
        console.log('Usage: experiment new ... | experiment conclude <id> --winner <variant>');
      }
      saveState(s);
      break;
    }

    case "experiments": {
      console.log(experimentStatus(loadState()).join("\n"));
      break;
    }

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

    case "learnings": {
      const s = loadState();
      if (!s.learnings.length) return void console.log("No learnings yet. Run a cycle.");
      for (const l of s.learnings.slice(0, 20)) {
        console.log(`[${l.loop}] (${(l.confidence * 100).toFixed(0)}%) ${l.insight}`);
      }
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
