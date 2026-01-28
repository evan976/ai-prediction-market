# AI Prediction Market

A Solana-based prediction market app where users can create binary markets, place bets, and claim rewards on-chain. The UI includes a market list, detailed market view, and pool/odds visualization.

## Features
- Create yes/no markets with configurable duration.
- Browse active, ended, and all markets.
- Place bets, resolve markets (creator), and claim winnings.
- Market detail page with odds and pool breakdown.

## Tech Stack
- Next.js 16 + React 19
- Tailwind CSS + Radix UI
- Solana (@solana/kit, @solana/connector)
- Anchor (program + generated client)
- Recharts for charting

## Getting Started
```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## Environment
Optional RPC overrides:
```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_WSS_URL=wss://api.devnet.solana.com
```

## Scripts
```bash
bun dev
bun build
bun start
bun lint
bun format
bun anchor:build
bun anchor:test
```
