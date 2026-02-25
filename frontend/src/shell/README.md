# Shell Module Notes

## Authorization Boundary

- Frontend role/route/action guards in this module are UX-only controls.
- They drive navigation visibility and unauthorized messaging, but they are not a security boundary.
- Backend authorization is canonical and must enforce all permissions on every protected operation.
- Any frontend/backend mismatch must resolve in favor of backend denial.

