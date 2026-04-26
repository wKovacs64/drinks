# Development Workflow

This project uses a skill-driven workflow that scales by task size. Not every task needs every
skill, but every task should begin at the right point in the sequence so requirements, design, and
implementation stay aligned.

## Skill Sequence

The full sequence, in order:

| Step | Skill                           | Purpose                                                        |
| ---- | ------------------------------- | -------------------------------------------------------------- |
| 1    | `domain-model`                  | Clarify the domain, name concepts, and resolve design choices  |
| 2    | `to-prd`                        | Convert the agreed direction into a requirements/design issue  |
| 3    | `to-issues`                     | Split the PRD into independently shippable vertical slices     |
| 4    | `tdd`                           | Implement each slice with a red-green-refactor loop            |
| 5    | `improve-codebase-architecture` | Find deepening/refactoring opportunities after meaningful work |

## When to Use What

| Task type                                      | Recommended skills                               |
| ---------------------------------------------- | ------------------------------------------------ |
| New feature, new module, or ambiguous behavior | `domain-model` → `to-prd` → `to-issues` → `tdd`  |
| Complex bug fix or behavior change             | `domain-model` → `tdd`                           |
| Small, well-understood bug fix                 | `tdd`                                            |
| Documentation-only clarification               | Usually no skill; use the relevant docs directly |
| Architecture review after a larger change      | `improve-codebase-architecture`                  |

## Skill Guidance

- Use `domain-model` when the language, boundaries, user goals, or data relationships are unclear.
  Capture durable conclusions in `CONTEXT.md`, `docs/architecture.md`, or an ADR when appropriate.
- Use `to-prd` for work that needs an explicit requirements checkpoint before implementation.
- Use `to-issues` when the PRD should become independently grabbable implementation slices.
- Use `tdd` for implementation and bug fixes. Prefer module tests against public schemas and service
  factories, plus route/component tests where framework behavior matters.
- Use `improve-codebase-architecture` occasionally after major development sessions or when the
  codebase feels harder to navigate. Do not run it after every small change.

## Bailout Rule

If any step uncovers unresolved domain or architecture questions, stop moving forward and return to
`domain-model` before continuing.

## Related Docs

- `CONTEXT.md` — project language and domain notes
- `docs/architecture.md` — module boundaries, route conventions, and auth seams
- `docs/adr/` — durable architecture decisions
