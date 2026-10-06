# Issue Tracker

Issues and specs live in GitHub Issues; use `gh` from the repository. When a skill says to publish
to the tracker, create a GitHub issue. Fetch tickets with `gh issue view <number> --comments` and
include their labels alongside the body and comments.

**PRs as a request surface: no.**

GitHub shares issue and PR numbers. Resolve a bare `#<number>` with `gh pr view <number>` first,
falling back to `gh issue view <number>`.

## Wayfinding operations

- A map is one issue labelled `wayfinder:map`.
- Link child tickets as GitHub sub-issues and label them `wayfinder:<type>` (`research`, `prototype`,
  `grilling`, or `task`). If sub-issues are unavailable, use a task list in the map and `Part of #<map>`
  in each child.
- Represent blockers with native issue dependencies. The `blocked_by` endpoint takes the blocker's
  numeric database ID, not its issue number or node ID. `issue_dependencies_summary.blocked_by`
  counts open blockers. If dependencies are unavailable, put `Blocked by: #<n>` at the top of the
  child body and check whether each blocker is closed.
- The frontier is the first open child in map order with no open blockers and no assignee. Claim it
  by assigning the driving developer before any other writes or work on the ticket.
- Resolve a ticket by commenting the answer, closing it, and adding a gist plus link to the map's
  Decisions so far.
