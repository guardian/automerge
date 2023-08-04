# @guardian/automerge

A simple Github App that will set automerge to true on PRs raised by bots during
office hours (9-5).

Note, by default Dependabot runs at a random time, so you should schedule it for
a specific time to ensure it runs during office hours. e.g.

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      time: "09:30"
      timezone: "Europe/London"
```

p.s. Github's Typescript APIs are horrible and no one will convince me otherwise
:0.

Conditions to work:

- branch protection must be configured requiring at least one approval to merge
  PRs
- 'Allow auto-merge' must be enabled for the repository (under `Settings >
(scroll to) Pull Requests`).

## TODOs

- [ ] validate signature (see https://gist.github.com/n9iels/311734835e2ea4719cdbf6ca0d0ab78c)
- [ ] deploy as lambda with function URL (might require some further changes)
- [ ] raise a comment if the PR is opened at wrong time of day
- [ ] raise a comment on failure, suggesting possible reasons
