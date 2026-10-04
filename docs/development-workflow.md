# Development Workflow

Scale the workflow to the task. Use relevant skills when they are available in the current session;
skills are agent tooling, not project dependencies.

## Skill Sequence

1. Clarify behavior and domain terms. Use `domain-modeling` when terminology or relationships need
   work; keep applicable definitions in `GLOSSARY.md` and decisions in `docs/adr/`.
2. Define ownership and public seams before changing module boundaries. Use `codebase-design` for
   interface design and deepening; update `docs/architecture.md` when the contract changes.
3. For substantial work needing a tracked spec or implementation slices, use the conventions in
   `docs/agents/issue-tracker.md` to capture the agreed scope.
4. Implement features and bug fixes with `tdd`, using the boundaries in `docs/testing.md`.
5. Complete the checks appropriate to the change. `pnpm validate` runs formatting, lint, types,
   and tests; `pnpm build` prepares assets and checks types. Documentation-only changes
   need formatting and verification of their references and claims.

## When to Use What

| Task type                          | Recommended skills                                    |
| ---------------------------------- | ----------------------------------------------------- |
| New domain behavior or terminology | `domain-modeling`, then `tdd` for implementation      |
| Module interface changes           | `codebase-design`, then `tdd` for implementation      |
| Small, well-understood bug fix     | `tdd`                                                 |
| Difficult bug or regression        | `diagnosing-bugs`, then `tdd`                         |
| Documentation-only clarification   | Consult the relevant docs and implementation directly |
| Requested review of changes        | `code-review`                                         |

## Bailout Rule

Resolve domain or ownership uncertainty before implementing dependent changes. Continue independent
work while clarification is pending.

## Related Docs

- `GLOSSARY.md` — project language and domain notes
- `docs/architecture.md` — module boundaries, route conventions, and auth seams
- `docs/testing.md` — test boundaries, tools, and conventions
- `docs/adr/` — durable architecture decisions
