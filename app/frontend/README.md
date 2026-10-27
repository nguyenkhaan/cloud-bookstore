# Cloud Bookstore Frontend

React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, and Bun.

## Quick start

Run commands from `app/frontend`:

```bash
bun install
bun run dev
```

The app runs at `http://localhost:5173`. Set the backend origin in `.env`:

```dotenv
VITE_BASE_URL=http://localhost:4000
```

The API client appends `/api` when needed. Use `VITE_BASE_URL`; `VITE_API_BASE_URL` is not read by the current client.

## Source structure

```text
src/
├── api/                    # Shared HTTP client configuration
├── assets/                 # Fonts, icons, and images
├── components/
│   ├── common/             # Reusable, feature-agnostic UI components
│   └── layout/             # Application shell components
├── context/                # App-wide React context contracts and providers
├── contract/               # Generated OpenAPI TypeScript types
├── features/               # Domain modules such as auth and dashboard
│   └── <feature>/
│       ├── components/     # UI used only by this feature
│       ├── pages/          # Route-level feature screens
│       ├── *.hook.ts       # Feature queries, mutations, and hooks
│       ├── *.service.ts    # Feature API operations
│       └── *.type.ts       # Feature-owned types
├── hooks/                  # Hooks shared by multiple features
├── lib/                    # Small framework-independent utilities
├── pages/                  # App-level pages not owned by one feature
├── routes/                 # Route declarations and access boundaries
├── store/                  # Global client state; server state uses TanStack Query
├── App.tsx                 # Root application composition
└── main.tsx                # Browser entrypoint and root library providers
```

Placement rules:

- Keep feature-specific UI, API calls, hooks, and types inside `features/<feature>`.
- Put code in `components`, `hooks`, or `lib` only when multiple features reuse it.
- Keep shared Axios configuration in `api`; feature endpoints belong in feature services.
- Configure simple third-party root providers in `main.tsx`. Do not recreate `context/QueryProvider.tsx`.
- Do not create or import `src/tmp`; move code directly to its final owner.
- Prefer the `@/` alias for imports from `src`.

## Update the API contract

`src/contract/api-contract.ts` is generated. Never edit it manually.

1. Start the backend at `http://localhost:4000`.
2. Confirm `http://localhost:4000/openapi/v1.json` is available.
3. Run:

```bash
bun run generate:api
```

Regenerate the contract whenever backend endpoints or DTOs change, then review the generated diff and update affected feature types/services.

## Commands

| Command                  | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `bun run dev`          | Start the Vite development server           |
| `bun run generate:api` | Regenerate `src/contract/api-contract.ts` |
| `bun run test`         | Run frontend tests                          |
| `bun run lint`         | Run Oxlint                                  |
| `bun run build`        | Type-check and create a production build    |
