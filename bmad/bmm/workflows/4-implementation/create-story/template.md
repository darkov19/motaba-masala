# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: drafted

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Windows Validation (WSL2 -> Windows Required)

- Script Path: `scripts/s{{epic_num}}-{{story_num}}-win-test.ps1`
- Minimum Coverage:
  - Build the relevant application target(s)
  - Launch and validate runtime behavior for this story
  - Return non-zero exit code on failure
  - Print explicit PASS/FAIL summary

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Windows Validation Script

`scripts/s{{epic_num}}-{{story_num}}-win-test.ps1`

### Windows Validation Evidence

- Command:
- Result:
- Notes:
