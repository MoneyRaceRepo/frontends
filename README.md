# MoneyRace Frontend

AI-Powered Saving Game on Sui Blockchain - Frontend Application

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Blockchain**: Sui.js SDK
- **State Management**: Zustand

## Features

### Implemented Pages

1. **Landing Page** (`/`)
   - Hero section with value proposition
   - Feature highlights
   - How it works section
   - CTA buttons

2. **Dashboard** (`/dashboard`)
   - User statistics overview
   - Active and ended rooms list
   - Create new room button
   - Quick actions

3. **Create Room** (`/create-room`)
   - Step 1: Basic information
   - Step 2: AI strategy recommendation
   - Step 3: Choose strategy
   - Step 4: Review and confirm

4. **Room Detail** (`/room/[id]`)
   - Room statistics
   - Deposit interface
   - Participants leaderboard
   - Claim rewards

## Setup

### Installation

```bash
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_PACKAGE_ID=0x...
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontends/
├── app/                  # Next.js App Router
│   ├── page.tsx         # Landing page
│   ├── dashboard/       # Dashboard
│   ├── create-room/     # Create room flow
│   └── room/[id]/       # Room detail
├── components/ui/       # UI components
├── lib/                 # Utilities
│   ├── api.ts          # API client
│   └── sui.ts          # Sui integration
└── types/              # TypeScript types
```

## User Flow

1. Land → Get Started
2. Dashboard → Create Room
3. AI Prompt → Choose Strategy
4. Review → Create (on-chain)
5. Deposit Weekly (gasless)
6. Claim Rewards

## MVP Scope

- Full UI/UX flow
- Ready for backend integration
- Blockchain interaction ready
- Mock data for demonstration

## License

MIT
