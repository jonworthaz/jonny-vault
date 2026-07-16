---
description: Capture a quick idea into the Claude Ideas board dropbox
---

Dispatch this idea to the **Idea Dropbox** so it appears in Claude Ideas:

> $ARGUMENTS

Steps:

1. Read `claude-ideas/dropbox.json`.
2. Append one entry to its `dispatch` array:
   `{ "id": "<unique — e.g. YYYY-MM-DD-slug>", "text": "$ARGUMENTS", "ts": <epoch ms> }`.
   Never reuse an existing `id`.
3. Write the file back as valid JSON (keep the `_comment` and existing entries).
4. Confirm it's dispatched — it will appear in the **Dropbox** tab on next load. Do **not**
   analyse or score it unless the user asks (use `/fill-idea-board` for that).
