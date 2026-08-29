# Collate

Review-first community tools for creating atoms and lists on Intuition.

The app uses the current `@0xintuition/sdk` and `@0xintuition/graphql` packages for protocol writes and pinning-related server requests.

This standalone app currently supports:

- Batch atoms
- CSV atoms
- Batch lists
- CSV lists

All four flows are review-first: rows are previewed, validated, classified, and filtered before any protocol write is sent.

## Requirements

- Node.js 20.6+
- npm
- An Intuition pinning API key for rich atom metadata creation
- PostgreSQL for activity tracking and the community activity page

## Environment

Copy `.env.example` to `.env.local` and fill in the required values.

Required:

- `INTUITION_PIN_API_KEY`
- `DATABASE_URL` (server-only PostgreSQL connection string)

Optional overrides:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_APP_URL`
- `ETHEREUM_RPC_URL`
- `NEXT_PUBLIC_INTUITION_MAINNET_RPC_URL`
- `NEXT_PUBLIC_INTUITION_TESTNET_RPC_URL`
- `INTUITION_MAINNET_GRAPHQL_URL`
- `INTUITION_TESTNET_GRAPHQL_URL`
- `NEXT_PUBLIC_INTUITION_MAINNET_EXPLORER_URL`
- `NEXT_PUBLIC_INTUITION_TESTNET_EXPLORER_URL`

Built-in defaults exist for the Intuition RPC, graph, and explorer endpoints, but overriding them is helpful for custom environments or troubleshooting.

Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin for deployments. `ETHEREUM_RPC_URL` is optional and provides a preferred Ethereum mainnet RPC for ENS name and avatar resolution; public fallback RPCs are used when it is omitted.

If `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is omitted, browser-injected wallets such as MetaMask and Rabby still work locally. Only WalletConnect-based connection options are disabled.

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

To exercise activity tracking locally, point `DATABASE_URL` at a local PostgreSQL database and apply the schema:

```bash
npm run db:migrate
npm run dev
```

Ordinary `npm run dev` remains supported without PostgreSQL for work unrelated to activity tracking. Protocol publishing still works, while activity APIs remain unavailable until `DATABASE_URL` is configured.

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run db:migrate
```

## Notes

- `progress.md` is intentionally gitignored as a local continuity log.
- `tsconfig.typecheck.tsbuildinfo` is intentionally untracked and ignored.
- `next dev` writes to `.next-dev`, while `next build` writes to `.next-build`. Keeping these directories separate prevents a running Windows dev server from locking the production `trace` file.
- If an older dev process was started before this separation and `npm run build` reports `EPERM` for `.next-build/trace`, stop that dev process, close any stale repo-specific Node processes, then run `npm run build` again. Both directories are generated and gitignored.

## Netlify

Connect the repository as a Next.js site using these settings:

- Base directory: leave blank (repository root)
- Build command: `npm run build`
- Publish directory: `.next`
- Runtime handling: automatic Netlify OpenNext adapter; do not add a static export or legacy Next plugin

The committed `netlify.toml` sets Node.js 20, and `next.config.mjs` automatically uses Netlify's standard `.next` output whenever Netlify's built-in `NETLIFY=true` flag is present. In Netlify environment variables, set `INTUITION_PIN_API_KEY` with Functions scope and set `NEXT_PUBLIC_APP_URL` to the site's final HTTPS origin with Builds scope. WalletConnect, ENS RPC, Intuition endpoint, and explorer overrides remain optional as described above. Because `NEXT_PUBLIC_*` values are embedded at build time, redeploy after changing them.

Activity tracking is host-neutral and requires a PostgreSQL `DATABASE_URL`. Apply `npm run db:migrate` against that database before a Netlify deployment; Netlify's Next.js runtime does not invoke this repository's `npm start` command.

## Coolify

Deploy the application and a PostgreSQL resource in the same Coolify project and destination so the database stays on Coolify's private network.

- Build command: `npm run build`
- Start command: `npm start`
- Required runtime variables: `INTUITION_PIN_API_KEY`, `DATABASE_URL`
- Recommended public variable: `NEXT_PUBLIC_APP_URL=https://your-domain.example`

Use the PostgreSQL resource's internal Postgres URL as `DATABASE_URL`. Keep it server-only: enable Coolify's runtime and literal options, disable the build option, and never prefix it with `NEXT_PUBLIC_`. `npm start` applies pending migrations under an advisory lock before starting Next.js, so the schema is ready before the app accepts traffic.

### Activity ledger

The PostgreSQL activity ledger records only server-verified successful creation events for analytics and leaderboards. Its versioned schema lives under `database/migrations`; applied migration checksums are stored in `collate_schema_migrations`.

- A pre-wallet activity intent records the exact calldata hash, wallet, flow, and network.
- A local browser outbox retries receipt confirmation after refreshes and temporary service failures.
- Reverted, rejected, missing, or unverifiable transactions never create leaderboard items.
- Confirmed items remain separated as `atom`, specialized `list_entry` claims, and the reserved future standalone `claim` kind. Summary claim totals include both claim subtypes.
- Read-only data is available from `/api/activity/summary` and `/api/activity/items`.

## Follow-ups intentionally not implemented yet

- Create new list atom inside list flows
- Auto-create missing member atoms from CSV list rows
