# Vendored skills

Third-party Claude Code skills installed **project-scoped** into this repo, so
they load automatically in any session working in the vault — including Claude
Code on the web, where `/plugin` isn't available.

| Skill | Source | Licence | Version |
|---|---|---|---|
| `framer-motion` | [mindrally/skills](https://github.com/mindrally/skills) (`framer-motion/`) | Apache-2.0 | commit `05a7130` |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (`.claude/skills/ui-ux-pro-max/`) | MIT | 2.13.0 (commit `a38d04c`) |

## Local changes

- **`ui-ux-pro-max`** — the upstream `SKILL.md` invokes its search tool via
  `${CLAUDE_PLUGIN_ROOT}/…`, which only resolves when installed as a *plugin*.
  Those 11 references were rewritten to the project-relative path
  `.claude/skills/ui-ux-pro-max/scripts/search.py` (and `python` → `python3`)
  so it works as a project skill. The upstream `scripts/tests/` directory was
  dropped — it isn't needed to run the skill.

Otherwise both are unmodified upstream content.

## Using the ui-ux-pro-max search tool

Its data is a local CSV database — no network, no external Python deps:

```bash
python3 ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <style|color|typography|ux|chart|icons|gsap|product>
python3 ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system -p "Project Name"
python3 ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --stack <react|nextjs|tailwind|…>
```

## Updating

Re-clone the upstream repo, copy the skill directory over, then re-apply the
local changes listed above.

## Note on scope

These are installed for **this repository only**. To have them available
everywhere on your own machine, install them globally in local Claude Code
instead:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max
```
