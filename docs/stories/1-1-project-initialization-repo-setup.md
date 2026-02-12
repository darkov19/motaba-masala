# Story 1.1: Project Initialization & Repo Setup

Status: ready-for-dev

## Story

As a Developer,
I want to set up the project repository with the correct tech stack and directory structure,
so that the team has a solid, consistent foundation for development.

## Acceptance Criteria

1. **Project Init**: Application initializes successfully as a Wails project (Go + React + Vite). [Source: docs/tech-spec-epic-1.md#L152]
2. **Directory Structure**: Separate Client/Server entry points are established in `cmd/` as per the dual-binary architecture. [Source: docs/architecture.md#L57-65]
3. **Frontend Setup**: React frontend is initialized with Ant Design 6.2.1 using pure CSS variables (token-based theming). [Source: docs/architecture.md#L17-21, L103-118]
4. **Backend Foundation**: Go backend follows Hexagonal Architecture patterns with `internal/app`, `internal/domain`, and `internal/infrastructure`. [Source: docs/architecture.md#L37-56]
5. **Dependency Management**: Core dependencies (Wails v2.11+, React, AntD, React Query) are correctly tracked in relevant manifests. [Source: docs/tech-spec-epic-1.md#L140-149]
6. **Persistence of bmad**: The `bmad` directory is preserved during project initialization and configuration. [Source: docs/epics.md#L78]

## Tasks / Subtasks

- [ ] Initialize Wails project (AC: 1, 2)
    - [ ] Run `wails init` with React-TS template
    - [ ] Configure `wails_server.json` and `wails_client.json`
- [ ] Establish Backend structure (AC: 4)
    - [ ] Create `internal/app`, `internal/domain`, `internal/infrastructure` directories
    - [ ] Create `cmd/server/main.go` and `cmd/client/main.go`
- [ ] Configure Frontend environment (AC: 3, 5)
    - [ ] Install `antd`, `@ant-design/icons`, `@tanstack/react-query`, `axios`
    - [ ] Implement `ConfigProvider` with Motaba Deep Maroon (`#7D1111`) theme
- [ ] Verify baseline build (AC: 1)
    - [ ] Run `wails build` for both server and client configurations

## Dev Notes

- **Architecture Patterns**: Follow Hexagonal Architecture to keep Go logic independent of Wails.
- **Project Structure**: Client/Server binaries share the same React frontend but have different Go proxies/services.
- **Theming**: Ant Design 6.0 tokens must be used; avoid legacy LESS variables.

### Project Structure Notes

- Alignment with `architecture.md` project structure is mandatory to ensure LAN discovery and RPC communication patterns can be implemented in subsequent stories.

### References

- [tech-spec-epic-1.md](file:///home/darko/Code/masala_inventory_managment/docs/tech-spec-epic-1.md)
- [architecture.md](file:///home/darko/Code/masala_inventory_managment/docs/architecture.md)
- [epics.md](file:///home/darko/Code/masala_inventory_managment/docs/epics.md)

## Dev Agent Record

### Context Reference

- [1-1-project-initialization-repo-setup.context.xml](file:///home/darko/Code/masala_inventory_managment/docs/stories/1-1-project-initialization-repo-setup.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
