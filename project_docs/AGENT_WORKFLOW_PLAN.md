# Agent workflow plan

Date: 2026-10-26. Source: [Claude Code best practices](https://code.claude.com/docs/en/best-practices), applied to what went wrong on EduPlan so far.

## 1. What slowed us down

| Problem we hit | Example | Best-practice fix |
|---|---|---|
| Design rounds with no target | 5 rounds on the teacher home before the references arrived | Give the visual target first. Verify by screenshot against it |
| Context lost between tools | The Devin session could not be read here. The summary was rebuilt from files on disk | One written source of truth per workstream, updated at the end of each session |
| Nothing committed | Old app changes and all new design work are mixed in one uncommitted diff | Branch per workstream. Commit at each milestone |
| One long session for everything | Research, product plan, design, workflow in one conversation | `/clear` between unrelated tasks. One named session per workstream |
| No project instructions | `AGENTS.md` only holds the Next.js notice. Commands and rules live in global files | A short project `CLAUDE.md` |
| No automatic checks for app code | No tests. Lint and build run by hand | A check the agent can run, and a hook that runs it |

## 2. Do now (about 1 hour in total)

1. **Commit the current state on a branch (10 min).**
   - `git switch -c design/teacher-home`
   - Commit 1: the old app changes already in the tree (`chore: ...`).
   - Commit 2: product docs (`PRODUCT.md`, `project_docs/MVP_REWORK_PLAN.md`, this file).
   - Commit 3: design mocks (`.impeccable/mocks/teacher-home/`, the handover doc).
2. **Write a short project `CLAUDE.md` (15 min).** Keep it under 40 lines. Each line must prevent a real mistake:
   - Commands: `bun run dev`, `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run db:*`.
   - Stack notes: Next.js version with breaking changes (read `node_modules/next/dist/docs/` first), Drizzle on Neon Postgres, Neon Auth (D49).
   - UI copy is French. French school vocabulary (trimestre, coef., conseil de classe).
   - Sources of truth: `@PRODUCT.md`, `project_docs/MVP_REWORK_PLAN.md`, `project_docs/DESIGN_HANDOVER_TEACHER_HOME.md`.
   - "When compacting, keep the list of modified files and the check commands."
3. **Add one verification command for app code (10 min).** A `check` script in `package.json`: `bun run lint && bunx tsc --noEmit`. Every coding prompt ends with "run `bun run check` and fix failures".
4. **Add one verification script for UI mocks (15 min).** `scripts/shot.sh <file.html> <width>x<height>` renders a mock with headless Chromium into `.impeccable/review/`. The agent compares the screenshot to the reference and lists differences before it reports. Both of this session's design passes used this loop by hand.
5. **Name sessions by workstream (1 min each).** `/rename design-teacher-home`, `/rename mvp-schema`, and so on. Resume with `claude --resume`.

## 3. How each kind of task runs

### Design (one screen at a time)

1. Paste the references first. Name what to take from each one (layout, type, colour, components).
2. Agent builds the mock, then runs `scripts/shot.sh` and `impeccable detect`.
3. Agent compares the screenshot to the references and lists the differences, then fixes them. Two rounds at most, then it shows you.
4. You choose. The agent records the choice in the surface brief and in the handover doc.
5. After two rejected rounds: `/clear`, then start again with a better prompt that says what was wrong.

### Feature (MVP plan, section 8)

1. **Spec (new session, 20 min).** "Interview me with AskUserQuestion about <feature>. Write `project_docs/specs/<feature>.md`." The spec names the files, what is out of scope, and an end-to-end check.
2. **Plan (new session, plan mode).** Agent reads the spec and the code, proposes the diff. You edit the plan with `Ctrl+G` if needed.
3. **Build.** Agent implements, then runs `bun run check`, then `/run` to see it in the app.
4. **Review.** `/code-review` in the same session. It uses a fresh subagent, so it is not biased by the code it wrote. Fix only the findings that affect correctness or the spec.
5. **Commit and PR.** Conventional commit, PR with Summary and Test plan.

### Research

Ask for subagents: "use a subagent to research X and write the result to `project_docs/research/X.md`". The main session keeps only the conclusion.

## 4. Later (after the first MVP feature ships)

1. **Stop hook (30 min).** Runs `bun run check` before a turn can end on app code. It replaces the "remember to run the check" line.
2. **Project skills (30 min each).**
   - `eduplan-feature`: the five feature steps above, as `/eduplan-feature <name>`.
   - `mock-review`: render, detect, compare to references, list differences.
3. **Worktrees for parallel work.** One worktree per feature when two features run at the same time (for example attendance and grading).
4. **Tests on the risky logic first.** Auto-scheduler, grade averages with coefficients, attendance counts. One small test file each, run by `bun test`.
5. **Monthly `CLAUDE.md` prune (10 min).** Delete any line the agent already follows without it.

## 5. Rules of thumb

- If you can describe the diff in one sentence, skip the plan. Ask for it directly.
- If you corrected the agent twice on the same thing, `/clear` and rewrite the prompt.
- Ask for evidence, not claims: the command output, or the screenshot.
- One workstream per session. A finished workstream ends with a commit and an updated progress log.
