# AGENTS.md

## Repository Architecture & Fork Strategy

This repository is a downstream personal customization fork of [`mengxi-ream/read-frog`](https://github.com/mengxi-ream/read-frog).

- **`main`**: Pure upstream mirror. Strictly tracks `upstream/main`. Never commit personal modifications directly to `main`.
- **`custom`**: The primary working branch containing all personal customizations, builds, and features.
- **`upstream` remote**: Points to `https://github.com/mengxi-ream/read-frog.git`.

## Customization & Decoupling Conventions (Plug-in Pattern)

To ensure zero/minimal merge conflicts when syncing upstream updates:

1. **Isolate Custom Implementations**:
   - Place all custom features, algorithms, and helpers in dedicated new files (e.g., `src/utils/subtitles/processor/pipeline-optimizer.ts`).
   - Keep upstream source files as close to original as possible.
   - When overriding upstream behavior, use the upstream file as a lightweight mount point/adapter (e.g., `optimizer.ts` delegates to `pipeline-optimizer.ts` while preserving original author implementations).
   - Keep custom constants, patterns, and types inside custom files rather than polluting upstream shared tables (e.g., keep `src/utils/constants/subtitles.ts` untouched).

2. **Upstream Sync Protocol**:
   - Fetch upstream: `git fetch upstream`.
   - Update main: `git checkout main && git merge upstream/main --ff-only && git push origin main`.
   - Integrate into custom: `git checkout custom && git merge main`.
   - Resolve any conflicts, run type-check and tests, then commit.

## Testing & Quality Gates

- `src/utils/host/translate/api/__tests__/free-api.test.ts` depends on live external translation services.
- When running tests locally as an AI agent, set `SKIP_FREE_API=true`.
- Treat `free-api.test.ts` as intentionally skipped during local validation when `SKIP_FREE_API=true`.
- Always verify changes with `pnpm type-check` and `pnpm test`.

## Commit & PR Conventions

- Commit messages must follow conventional commit format: `feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`. Avoid tool-specific prefixes like `[codex]`.
- User-facing fixes and features intended for release must include a `.changeset/*.md` file for `@read-frog/extension`.
- To contribute bug fixes upstream: branch from pure `main` (or `git cherry-pick` the isolated fix commit from `custom`), verify against clean upstream, and submit a PR to `mengxi-ream/read-frog`.

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` at root, ADRs in `docs/adr/`). See `docs/agents/domain.md`.
