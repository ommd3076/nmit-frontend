---
name: agent-workflow
description: Use at the start of every Codex or Gemini session.
---
# Agent workflow (own rules)
1. Paste START-PROMPT.md; AGENTS.md stays at repo root. Update AGENTS.md, not per-tool notes.
2. Load ≤ 3 skills per task (ui-skills-root rule from ui-skills.com).
3. Codex: backend gate, API client, jobs, maps, tests. Gemini Flash: presentational components, fixtures, copy.
4. One phase step per prompt. Ask for the file list. Reject diffs outside `frontend/`, `apps/driver-mobile/`, `packages/shared-types/`, `contract/`, `docs/` (backend changes only in phases 0 and D, with team approval).
5. `make verify` after every step; commit when green.
6. No untested claims: no "works on device/emulator/live backend" without pasted output.
7. Invented route or field → stop, point at ENDPOINTS.md.
8. Before shipping a screen: remove one thing.
