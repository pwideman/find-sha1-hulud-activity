# find-sha1-hulud-activity

GitHub Action to find potential Sha1-Hulud activity in Enterprise Organization audit logs.

## Overview

The Sha1-Hulud worm exfiltrates secrets by running Actions workflows in repositories that a compromised user has access to. This action detects a characteristic pattern in the GitHub Enterprise audit logs:

1. A sequence of 3 events from the same actor, for the same workflow run:
   - `workflows.created_workflow_run`
   - `workflows.completed_workflow_run`
   - `workflows.delete_workflow_run`
2. These events occur close to one another (typically within 60 seconds)

## Usage

```yaml
- uses: pwideman/find-sha1-hulud-activity@v0
  with:
    # GitHub token with admin:enterprise scope for audit log access
    token: ${{ secrets.ENTERPRISE_AUDIT_TOKEN }}

    # The slug of the GitHub Enterprise to query
    enterprise: 'my-enterprise'

    # Number of days to search back in audit logs (optional, default: 7)
    days-back: '7'

    # Time window in seconds within which all 3 events must occur (optional, default: 60)
    time-window: '60'
```

## Inputs

| Input         | Description                                                     | Required | Default |
| ------------- | --------------------------------------------------------------- | -------- | ------- |
| `token`       | GitHub token with `admin:enterprise` scope for audit log access | Yes      | -       |
| `enterprise`  | The slug of the GitHub Enterprise to query audit logs for       | Yes      | -       |
| `days-back`   | Number of days to search back in audit logs                     | No       | `7`     |
| `time-window` | Time window in seconds within which all 3 events must occur     | No       | `60`    |

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

## Artifacts

When suspicious activity is found, the action uploads a CSV artifact named `sha1-hulud-suspicious-activity` containing the detailed findings.

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
    steps:
      - name: Scan Enterprise Audit Logs
        uses: pwideman/find-sha1-hulud-activity@v0
        with:
          token: ${{ secrets.ENTERPRISE_AUDIT_TOKEN }}
          enterprise: 'my-enterprise'
          days-back: '7'
          time-window: '60'

      - name: Check for suspicious activity
        if: steps.scan.outputs.suspicious-actors-count > 0
        run: |
          echo "Found ${{ steps.scan.outputs.suspicious-activities-count }} suspicious activities"
          echo "from ${{ steps.scan.outputs.suspicious-actors-count }} unique actors"
```

## License

MIT
