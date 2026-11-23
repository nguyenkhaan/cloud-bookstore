# Shared Components Refactor Design

## Intent

Move reusable UI primitives and the application shell out of `src/tmp/components` without changing their behavior.

## Classification

- Shared primitives: Badge, Button, Card, StatCard, and Icons are domain-neutral React/HTML components.
- Shared shell: MainLayout, Header, Sidebar, and Footer compose the authenticated application shell and are not owned by Dashboard.
- Not migrated: Modal has no implementation, only a placeholder.

## Constraints

- Preserve public component exports and runtime behavior.
- Update every consumer to the non-temporary path.
- Preserve unrelated user changes in API/package files.
