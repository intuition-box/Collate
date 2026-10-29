# Collate

Review-first community tools for creating atoms and lists on Intuition.

The app uses `@0xintuition/sdk` and `@0xintuition/graphql` for its established protocol and pinning paths. Unchained atom creation uses pinned alpha versions of `@0xintuition/classifications`, `@0xintuition/primitives`, and `@0xintuition/ids` to prepare canonical atom bytes.

This standalone app currently supports:

- Single and batch atoms
- CSV atoms
- Batch lists
- CSV lists

Single, batch, and CSV atom creation support two explicit formats: Classic creation for established image-rich atoms and existing files, plus Early access Unchained classifications with package-driven fields for all 37 types. Classic rich atoms publish pinned IPFS metadata URIs; Unchained entries publish canonical classification bytes. Never assume that the two formats produce the same atom ID.

Classic is the primary atom format and is available on Mainnet and Testnet. Unchained remains available as an Early access option, with canonical publishing temporarily limited to Testnet until an actual creation and graph-indexing check confirms that newly published classifications display correctly.

All four flows are review-first: rows are previewed, validated, classified, and filtered before any protocol write is sent.

## Requirements

- Node.js 20.6+
- npm
- An Intuition pinning API key for rich atom metadata creation
- PostgreSQL for production publishing, activity, and admin-managed batch limits

## Environment

Copy `.env.example` to `.env.local` and fill in the required values.

Required:

- `INTUITION_PIN_API_KEY`

Required for admin access in any environment:

- `ADMIN_PASSWORD_HASH` and `ADMIN_AUTH_SECRET`

Required for production publishing and persistent settings:

- `DATABASE_URL` (apply the existing migrations with `npm run db:migrate`)

Optional overrides:

- `ACTIVITY_READ_ORIGIN` (development-only activity read source; defaults to `https://collate.intuition.box`)
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

`ETHEREUM_RPC_URL` provides a preferred Ethereum mainnet RPC for ENS name and avatar resolution; public fallback RPCs are used when it is omitted.

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

Without `DATABASE_URL`, the local Activity page reads the deployed Collate feed and leaderboard. This is read-only: creations published from localhost are not added to the live activity totals. Set `ACTIVITY_READ_ORIGIN` only if the deployed site moves.

Without `DATABASE_URL`, local Settings uses an ignored `.collate-local-settings.json` file. You can sign in and preview navigation and batch-limit changes locally; these settings do not change the deployed site. The admin password hash and secret are still required.

To record activity from local publishes, point `DATABASE_URL` at a separate development PostgreSQL database and apply the schema:

```bash
npm run db:migrate
npm run dev
```

The development database path takes priority whenever `DATABASE_URL` is set. Production never falls back to the remote read source.

In local development without a database, publishing remains possible but activity is not recorded. In production, an activity intent must be stored before a wallet request is sent. The admin settings page controls normal atom and list-entry limits (default 50 each) and a wallet allowlist with a higher limit (default 150). The server rechecks the connected wallet's current limit before every publish.

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
npm run check:unchained:testnet
```

## User guides

- [Detailed creation guide](docs/collate-creation-guide.md)
- [Condensed poster copy](docs/collate-poster-copy.md)

## Development notes

- `progress.md` is intentionally gitignored as a local continuity log.
- `tsconfig.typecheck.tsbuildinfo` is intentionally untracked and ignored.
- `next dev` writes to `.next-dev`, while `next build` writes to `.next-build`. Keeping these directories separate prevents a running Windows dev server from locking the production `trace` file.
- If an older dev process was started before this separation and `npm run build` reports `EPERM` for `.next-build/trace`, stop that dev process, close any stale repo-specific Node processes, then run `npm run build` again. Both directories are generated and gitignored.
