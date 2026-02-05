# Developers

## Overview

Welcome to the Money Race developer documentation. This section provides technical resources for integrating with or building on top of Money Race.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Sui |
| Smart Contracts | Move |
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS |
| Wallet | @mysten/dapp-kit |
| Auth | zkLogin (Google OAuth) |
| State | Zustand |
| AI | Custom recommendation engine |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm or npm
- Sui CLI (for contract development)

### Clone & Install

```bash
git clone https://github.com/[ORG]/money-race
cd money-race/frontends
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Required variables:
```
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
frontends/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard pages
│   └── room/[id]/         # Room detail pages
├── components/
│   ├── ui/                # Reusable UI components
│   └── DashboardLayout.tsx
├── lib/
│   ├── api.ts             # API functions
│   └── keypair.ts         # Sui keypair management
├── store/
│   └── auth.store.ts      # Authentication state
└── docs/                  # This documentation
```

---

## Documentation

| Section | Description |
|---------|-------------|
| [Smart Contracts](smart-contracts.md) | Contract architecture and code |
| [Deployments](deployments.md) | Contract addresses per network |
| [API Reference](api-reference.md) | Backend API documentation |
| [Integration Guide](integration.md) | How to integrate Money Race |

---

## Contributing

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Support

- **GitHub Issues:** Report bugs and feature requests
- **Discord:** Join our developer community
- **Twitter:** Follow for updates

---

[Next: Smart Contracts →](smart-contracts.md)
