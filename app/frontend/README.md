# Old Bookstore Frontend

React 19, TypeScript, Vite, Tailwind CSS, and Bun.

```bash
bun install
bun run dev
```

The development server runs at `http://localhost:5173` and proxies `/api` to the backend HTTP profile at `http://localhost:4000`.

For a separately deployed API, set `VITE_API_BASE_URL` at build time, for example `https://api.example.com`. Leave it unset when the frontend and API share an origin.
