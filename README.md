# @guardian/automerge

A simple Github App that will approve and set automerge to true on PRs raised
by bots during office hours (9-5).

This means that PRs will \*_merge automatically_ for bots with a standard branch
protection setup (1 approval required). Only add to projects that are less
risky or where you have good CI and tests.

## Enable for your repo

To enable for your repo, go to the Guardian Organisation and then `Settings >
Github Apps` and add it to your repository. Nb. you will need to be an
organisation administrator to do this.

Your repository must meet the following requirements:

- branch protection configured and requiring at least one approval to merge PRs
- 'Allow auto-merge' must be enabled for the repository (`Settings` and then
  scroll to `Pull Requests`)
- Bots must be configured to raise PRs during working hours (9-5) - see below on
  how to do this

## Configuring Dependabot and Scala Steward to raise PRs during working hours

By default Dependabot runs at a random time, so you should schedule it for
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

## Deploy

Ensure you have Janus credentials for the Deploy Tools account and then run:

    $ DIST_BUCKET=my-dist-bucket ./deploy.sh

(Set the bucket to our dist bucket.)
