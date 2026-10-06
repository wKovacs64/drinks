# Development Workflow

Scale the workflow to the task. Use the relevant skills available in the session:

- Domain terminology or relationships: `domain-modeling`; record terms in `GLOSSARY.md` and durable
  decisions in `docs/adr/`.
- Module interfaces or ownership: `codebase-design`; resolve the boundary before implementing it.
- Substantial work needing a tracked spec or slices: use [issue tracker conventions](agents/issue-tracker.md).
- Difficult bugs or regressions: `diagnosing-bugs`, then `tdd` for the fix.
- Features and well-understood fixes: `tdd`.
- Requested reviews: `code-review`.
- Documentation changes: consult the relevant docs and implementation directly.

Resolve domain or ownership uncertainty before dependent implementation; continue independent work
while clarification is pending. Keep [architecture](architecture.md) current when conventions change.

Run the checks appropriate to the change using the scripts in `package.json`. Documentation-only
changes need formatting and verification of references and claims.
