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

## Environment

Copy `.env.example` to `.env.local` and fill in the required values.

Required:

- `INTUITION_PIN_API_KEY`

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

To exercise the verified activity ledger locally, run the app through the Netlify CLI instead so Netlify Database is available:

```bash
npx netlify dev
```

Ordinary `npm run dev` remains supported for product development. If no database connection is present, protocol publishing still works and activity tracking quietly stays unavailable.

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run typecheck
npm test
npm run build
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

### Verified activity ledger

The `@netlify/database` integration records only server-verified successful creation events for future analytics and leaderboards. Netlify provisions the database connection for deployed builds; do not add `NETLIFY_DB_URL` to the repository or expose it as a public environment variable. The schema migration is committed under `netlify/database/migrations` and is applied by Netlify's database tooling.

- A pre-wallet activity intent records the exact calldata hash, wallet, flow, and network.
- A local browser outbox retries receipt confirmation after refreshes and temporary service failures.
- Reverted, rejected, missing, or unverifiable transactions never create leaderboard items.
- Confirmed items remain separated as `atom`, specialized `list_entry` claims, and the reserved future standalone `claim` kind. Summary claim totals include both claim subtypes.
- Read-only data is available from `/api/activity/summary` and `/api/activity/items`.

## Follow-ups intentionally not implemented yet

- Create new list atom inside list flows
- Auto-create missing member atoms from CSV list rows
