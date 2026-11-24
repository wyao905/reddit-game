# Working Agreement

## Workflow

- Build one small, reviewable slice at a time.
- Before implementation, clarify the product goal, system choices, tradeoffs, and acceptance criteria.
- Wait for user approval before implementation.
- Do not expand scope or invent requirements.

## Implementation

- Prefer the smallest solution that proves the approved behavior.
- Keep gameplay rules separate from UI and platform-specific code.
- Avoid premature APIs, persistence models, abstractions, and infrastructure.
- Preserve unrelated user changes.

## Verification

- Test the behavior changed by the slice.
- Report what was verified and any remaining risks.
- Do not commit, push, deploy, or perform destructive actions without explicit approval.

## Review Handoff

After each slice, provide:

- What changed
- Key design decisions
- Files changed
- Verification results
- Known limitations

Stop for user review before starting the next slice.
