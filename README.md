# find-sha1-hulud-activity

GitHub Action to find potential Sha1-Hulud activity in GitHub Organization audit logs.

## Overview

The Sha1-Hulud worm exfiltrates secrets by running Actions workflows in repositories that a compromised user has access to. This action detects a characteristic pattern in the GitHub Organization audit logs:

1. A sequence of 3 events from the same actor, for the same workflow run:
   - `workflows.created_workflow_run`
   - `workflows.completed_workflow_run`
   - `workflows.delete_workflow_run`
2. These events occur close to one another (typically within 60 seconds)

## Usage

```yaml
- uses: pwideman/find-sha1-hulud-activity@v0
  with:
    # The name of the GitHub Organization to query
    org: 'my-org'

    # GitHub App authentication
    app-id: ${{ secrets.APP_ID }}
    app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
    app-private-key: ${{ secrets.APP_PRIVATE_KEY }}

    # Number of days to search back in audit logs (optional, default: 7)
    days-back: '7'

    # Time window in seconds within which all 3 events must occur (optional, default: 60)
    time-window: '60'

    # Directory to write the CSV file (optional, default: '.')
    output-dir: 'output'
```

## Inputs

| Input                 | Description                                                        | Required | Default |
| --------------------- | ------------------------------------------------------------------ | -------- | ------- |
| `org`                 | The name of the GitHub Organization to query audit logs for        | Yes      | -       |
| `app-id`              | GitHub App ID for authentication                                   | Yes      | -       |
| `app-installation-id` | GitHub App Installation ID for authentication                      | Yes      | -       |
| `app-private-key`     | GitHub App private key for authentication                          | Yes      | -       |
| `days-back`           | Number of days to search back in audit logs                        | No       | `7`     |
| `time-window`         | Time window in seconds within which all 3 events must occur        | No       | `60`    |
| `output-dir`          | Directory path to write the CSV file (can be relative or absolute) | No       | `.`     |

## Outputs

| Output                        | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `suspicious-actors-count`     | Number of actors with suspicious activity found |
| `suspicious-activities-count` | Total number of suspicious activity sequences   |

## Workflow Summary

The action produces a workflow summary containing:

- Scan parameters (days scanned, time window)
- Statistics (number of suspicious sequences, unique actors, affected repositories)
- A table with details of each suspicious activity (actor, repository, workflow run ID, timestamps, duration)

## CSV Output

When suspicious activity is found, the action writes a CSV file named `suspicious-activity-{org}.csv` to the directory specified by the `output-dir` input. The org name is included in the filename to support matrix workflows that scan multiple organizations.

## Example Workflow

```yaml
name: Scan for Sha1-Hulud Activity

on:
  schedule:
    - cron: '0 6 * * *' # Run daily at 6 AM
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        org: [org1, org2, org3]
    steps:
      - name: Scan Organization Audit Logs
        id: scan
        uses: pwideman/find-sha1-hulud-activity@v0
        with:
          org: ${{ matrix.org }}
          app-id: ${{ secrets.APP_ID }}
          app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
          app-private-key: ${{ secrets.APP_PRIVATE_KEY }}
          days-back: '7'
          time-window: '60'
          output-dir: 'output'

      - name: Upload CSV artifact
        if: steps.scan.outputs.suspicious-actors-count > 0
        uses: actions/upload-artifact@v4
        with:
          name: sha1-hulud-suspicious-activity-${{ matrix.org }}
          path: output/suspicious-activity-${{ matrix.org }}.csv

      - name: Check for suspicious activity
        if: steps.scan.outputs.suspicious-actors-count > 0
        run: |
          echo "Found ${{ steps.scan.outputs.suspicious-activities-count }} suspicious activities"
          echo "from ${{ steps.scan.outputs.suspicious-actors-count }} unique actors"
```

## GitHub App Permissions

The GitHub App used for authentication needs the following permissions:

- **Organization permissions:**
  - `Administration: Read-only` (for audit log access)

## License

MIT
