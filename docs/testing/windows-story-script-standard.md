# Windows Story Script Standard

Date: 2026-02-25
Scope: Story-level validation for WSL2 development with Windows runtime testing

## Purpose

Every implemented story must include a Windows validation script so runtime behavior is checked in the real target environment, not only in WSL2.

## Required Naming

- Per-story script path: `scripts/s<epic>-<story>-win-test.ps1`
- Example: `scripts/s1-11-win-test.ps1`

## Script Contract (Mandatory)

1. Build relevant app target(s) (`server`, `client`, or both).
2. Execute runtime validation for story acceptance criteria.
3. Return non-zero exit code when any check fails.
4. Print explicit PASS/FAIL summary.
5. Support report output path when practical.

## Recommended Implementation Pattern

- Use shared helpers from `scripts/lib/win-story-common.ps1`.
- Start from `scripts/story-win-test-template.ps1`.
- Keep story-specific assertions in the per-story script.
- Keep scripts deterministic and idempotent where possible.

## Minimum Story Evidence

In each story markdown (`docs/stories/...`), fill:

- `Windows Validation Script`: script path
- `Windows Validation Evidence`:
    - command used
    - PASS/FAIL result
    - short notes

## Suggested Invocation

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sX-Y-win-test.ps1 -Mode user-auto
```

With report file:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sX-Y-win-test.ps1 -Mode user-auto -ReportPath docs/manual_testing/sX-Y-win-test-report.txt
```

## Review Gate

Before a story moves to review:

1. Script exists with the correct naming pattern.
2. Script was executed on Windows.
3. Evidence was added to the story file.
4. Script summary reports PASS.
