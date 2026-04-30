# Fermah Proof Network

A production-ready, full-stack Web3 platform for zero-knowledge proof coordination powered by the [Fermah](https://fermah.xyz) proving network and deployed on [Base Sepolia](https://sepolia.basescan.org).

---

## Vision

ZK proofs are the foundation of verifiable computation — but coordinating them across provers, circuits, and blockchains is hard. Fermah Proof Network is an open, community-owned platform that:

- **Accepts proof requests** for any circuit and proof system (Groth16, Plonk, Fflonk, RISC0)
- **Delegates proving** 100% to the Fermah network — no local prover setup needed
- **Preserves privacy** through CPD (Client-side Privacy Design) — private inputs never leave your browser; only their `keccak256` hash is transmitted
- **Logs every result onchain** — fully transparent via Basescan; every proof's lifecycle is permanently on Base Sepolia
- **Empowers community ownership** — governance-ready, open source, forkable

---

## Architecture

```
fermah-proof-network/
├── artifacts/
│   ├── api-server/          # Express 5 backend (TypeScript, Drizzle ORM)
│   └── fermah-app/          # React + Vite frontend (Tailwind, TanStack Query)
├── contracts/               # Solidity (Hardhat, Base Sepolia)
│   ├── contracts/
│   │   └── FermahProofLog.sol
│   ├── scripts/
│   │   └── deploy.ts
│   └── test/
│       └── FermahProofLog.test.ts
├── lib/
│   ├── api-client-react/    # Orval-generated React Query hooks
│   ├── api-spec/            # OpenAPI 3.1 spec (source of truth)
│   ├── api-zod/             # Orval-generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema + migrations
└── .env.example
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS v4, TanStack Query, Wouter |
| Backend | Node.js 24, Express 5, Drizzle ORM, PostgreSQL |
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 |
| Proving | Fermah Seek SDK (100% offchain proving) |
| Chain | Base Sepolia (testnet) / Base (mainnet) |
| API Contracts | OpenAPI 3.1 → Orval codegen (hooks + Zod schemas) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or use Replit's built-in DB)

### 1. Clone & install

```bash
git clone https://github.com/your-org/fermah-proof-network.git
cd fermah-proof-network
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in DATABASE_URL, SESSION_SECRET, etc.
```

### 3. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Regenerate API types (after any OpenAPI spec change)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### 5. Run the backend

```bash
pnpm --filter @workspace/api-server run dev
```

### 6. Run the frontend

```bash
pnpm --filter @workspace/fermah-app run dev
```

The app will be available at `http://localhost:3000` (or the port configured by your environment).

---

## Deploying Contracts to Base Sepolia

### 1. Fund your deployer wallet

Get Base Sepolia ETH from the [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet).

### 2. Set environment variables

In your `.env`:

```env
DEPLOYER_PRIVATE_KEY=your_private_key_without_0x
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### 3. Install contract dependencies

```bash
cd contracts
npm install
```

### 4. Compile contracts

```bash
npx hardhat compile
```

### 5. Run tests

```bash
npx hardhat test
```

Expected output: all 8 tests pass ✓

### 6. Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

This will:
- Deploy `FermahProofLog` with your address as owner
- Print the contract address and Basescan URL
- Save deployment metadata to `deployments/baseSepolia.json`

### 7. Verify on Basescan

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <YOUR_DEPLOYER_ADDRESS>
```

After verification, the contract source is publicly visible and verified at:
`https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>#code`

### 8. Update frontend config

Set `VITE_CONTRACT_ADDRESS` in your `.env` to the deployed address.

---

## Hosting the Frontend on Vercel

### 1. Connect your repository to Vercel

1. Push your repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)

### 2. Configure Vercel project settings

- **Framework Preset:** Vite
- **Root Directory:** `artifacts/fermah-app`
- **Build Command:** `cd ../.. && pnpm run build --filter @workspace/fermah-app`
- **Output Directory:** `dist/public`

### 3. Set environment variables in Vercel

Add all variables from `.env.example` in the Vercel project settings > Environment Variables.

### 4. Deploy

Push to `main` — Vercel deploys automatically.

---

## API Reference

The full API is described in `lib/api-spec/openapi.yaml`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| GET | `/api/proofs` | List proofs (paginated, filterable by status) |
| POST | `/api/proofs` | Submit a new proof request |
| GET | `/api/proofs/:id` | Get proof details |
| GET | `/api/proofs/:id/status` | Live status (poll every 5s while pending) |
| GET | `/api/stats` | Network statistics |
| GET | `/api/stats/recent-activity` | Recent activity feed |

---

## Smart Contract

### `FermahProofLog.sol`

A transparent, pausable, access-controlled onchain log of all proof lifecycles.

**Key functions:**

| Function | Access | Description |
|----------|--------|-------------|
| `logProofSubmission(...)` | Relayer | Log a new proof submission (inputHash only — CPD) |
| `logProofVerified(...)` | Relayer | Mark proof verified, store proofHash |
| `logProofFailed(...)` | Relayer | Mark proof failed with reason |
| `getProof(proofId)` | Public | Get full proof record |
| `getProofIds(offset, limit)` | Public | Paginated list of all proof IDs |
| `setRelayer(addr, bool)` | Owner | Grant/revoke relayer authorization |
| `pause()` / `unpause()` | Owner | Emergency pause |

**Privacy model (CPD):**
- Private inputs NEVER stored onchain or in the backend database
- Only `keccak256(privateInputs)` is stored as `inputHash`
- Anyone can verify their proof was included; no one can reverse the inputs

---

## Fermah Integration

Fermah's proving network is integrated via the **Seek SDK**:

```typescript
// The backend calls Fermah after receiving a proof request
const job = await fermahClient.seek({
  circuitId: "fibonacci-v1",
  publicInputs: ["42", "100"],
  proofType: "groth16",
});

// Fermah generates the proof — you poll for status
const status = await fermahClient.getJobStatus(job.jobId);
// { status: "verified", proofHash: "0x..." }
```

100% of proving is delegated to Fermah. The frontend/backend are coordination and transparency layers only.

---

## Tokenomics & Governance (Community Roadmap)

The Fermah Proof Network is designed for community ownership from day one:

### Phase 1 — Permissionless proving (current)
- Open proof submission — anyone can submit any circuit
- Fully onchain log — every proof permanently auditable
- No token required — proving is free on testnet

### Phase 2 — Governance token (planned)
- **FERMAH** governance token (ERC-20) for protocol decisions
- Token holders vote on: fee structures, circuit whitelisting, relayer authorization, treasury allocation
- Fair launch: no VC allocation, no premine; community earns tokens by submitting/verifying proofs

### Phase 3 — Mainnet + incentives
- Migration to Base mainnet
- Proof submission fees redistributed to token stakers
- Relayer rewards for onchain log maintenance
- DAO treasury for ecosystem grants

---

## Community Launch Strategy

### Week 1 — Testnet launch
- Deploy to Base Sepolia
- Public proof submission open to anyone
- Share Basescan contract link for transparency
- Post in: Fermah Discord, Base ecosystem Discord, r/ethereum, r/zkproofs

### Week 2 — Developer onboarding
- Post full tutorial: "Submit your first ZK proof in 5 minutes"
- Open GitHub Issues for circuit requests
- Reward early submitters with POAP NFTs

### Week 3 — Community governance prep
- Publish token design document (no promises — community vote decides)
- Open forum for circuit prioritization
- Host first community call

### Ongoing
- Weekly proof stats digest (Twitter/Farcaster)
- Leaderboard of top submitters
- Circuit library expansion (Groth16 → Risc0 → Plonk → Fflonk)

---

## Contribution Guidelines

We welcome contributions of all sizes. Please:

1. **Fork** this repository and create a feature branch
2. **Follow** the existing code style (TypeScript strict mode, Prettier, ESLint)
3. **Write tests** for all new contract functions
4. **Document** any new API endpoints in `lib/api-spec/openapi.yaml`
5. **Run codegen** after spec changes: `pnpm --filter @workspace/api-spec run codegen`
6. **Open a PR** with a clear description of what you changed and why

### Areas where we need help most

- [ ] Fermah Seek SDK full integration (replace simulation)
- [ ] RISC0 circuit examples
- [ ] Frontend mobile UX improvements
- [ ] Contract gas optimizations
- [ ] Governance token design
- [ ] More circuit templates

---

## Security

- All contracts use OpenZeppelin's audited base contracts
- `ReentrancyGuard` on all state-changing functions
- `Pausable` for emergency stop
- Relayer allow-list prevents unauthorized onchain logging
- CPD: private inputs cryptographically protected (never transmitted)
- Backend validates all inputs with Zod schemas before database writes

Found a vulnerability? Please email security@yourorg.com — do not open a public issue.

---

## License

MIT — see [LICENSE](LICENSE).

Built with love by the community, for the community.
