# Light Review Existing Diffs

Perform a quick, lightweight review of the current uncommitted changes (staged and unstaged) in the working directory. This is a fast sanity check — not a deep audit.

## Scope

- Review only the current git diff (both staged and unstaged changes)
- Focus on obvious bugs, typos, and accidental changes
- Skip formatting, style, and naming nitpicks — the linter handles those
- Do NOT review the entire codebase, only what has changed

## Steps

1. Run `git diff` and `git diff --cached` to gather all current changes
2. Identify which files were modified, added, or deleted
3. Scan each diff for:
   - Obvious bugs or logic errors
   - Leftover debug code (`console.log`, commented-out code, `TODO` markers)
   - Accidentally committed files (env files, build artifacts, large binaries)
   - Missing error handling in new code paths
   - Broken imports or references to things that don't exist
4. Check that the changes look intentional and complete (no half-finished work)
5. Summarize findings in the output format below

## Output Format

### Overview

- **Files changed**: [number]
- **Nature of changes**: [1-sentence summary of what the diff is doing overall]

### Issues Found

List any problems, grouped by severity. If none found in a category, skip it.

**Must Fix**
- `filename:line` — Description of the issue

**Worth a Look**
- `filename:line` — Description of the concern

**Nitpick**
- `filename:line` — Minor suggestion (only include if genuinely helpful)

### Verdict

[One sentence: "Looks good to commit" or "A few things to address first" with a brief reason]

## Constraints

- Do NOT modify any files — this is a review only
- Do NOT suggest refactors or rewrites — focus on the diff as-is
- Keep the review brief and scannable — this is a light review, not a deep audit
- If the diff is clean, just say so — don't invent issues to fill the report
