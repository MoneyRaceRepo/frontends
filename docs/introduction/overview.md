# Overview

## What is Money Race?

**Money Race** is an AI-powered social savings game built on the **Sui blockchain** that turns saving money into a fun, competitive experience. Players create or join "savings rooms," commit to depositing a fixed amount of USDC periodically (daily or weekly), and race against each other to stay consistent. Funds are allocated to optimized DeFi yield strategies recommended by **EigenAI**, so your savings work harder while you play.

Consistent savers earn proportional yield rewards. Those who miss deposits simply receive a smaller share — your principal is always safe, and rewards are distributed fairly based on consistency. It's saving meets gaming meets DeFi.

---

## 🐜 Meet Our Mascot: Anto

<img src="mascotsemut.png" alt="Anto the Ant - Money Race Mascot" width="200"/>

**Anto the Ant** embodies the core philosophy of Money Race.

We chose an ant as our mascot because ants exemplify the values we champion:

- 🎯 **Consistency** — Ants work steadily every single day, never giving up
- 📦 **Preparation** — They gather and save resources for the future, not just today
- 🤝 **Teamwork** — Individual ants are small, but colonies achieve incredible feats together
- 💪 **Long-term Focus** — Ants prioritize survival and growth over short-term risks

Just like ants, Money Race participants succeed by saving little by little, working together as a community, and focusing on sustainable financial habits rather than risky speculation.

**Anto reminds us:** *Real progress comes from small, consistent actions done together.*

---

## The Vision

Saving money shouldn't feel like a chore. Traditional methods lack motivation, accountability, and fun. Money Race reimagines savings as a **competitive social game** where:

- **Community drives accountability** — You save alongside real people, not alone
- **Competition creates motivation** — Race to the top of the leaderboard
- **Rewards incentivize discipline** — Consistent savers earn proportional yield rewards
- **AI optimizes your strategy** — EigenAI recommends the best Sui DeFi protocols for your goals
- **Gamification keeps you engaged** — Leaderboards and social features make every deposit exciting

---

## How It Works

<img src="flowchart.png" alt="Money Race - How It Works Flowchart" width="100%"/>

### Step 1: Login (Gasless)
Sign in with **Google (zkLogin)** or connect a **Sui Wallet**. No crypto wallet setup required for new users — just your Google account. All transactions are **100% gasless**, you only need USDC.

### Step 2: Create or Join a Room
Browse active savings rooms on the dashboard, or create your own. Set your deposit amount, period (daily or weekly), duration (minimum 7 days), and choose a strategy. Private rooms can be shared with a password.

### Step 3: AI Strategy Recommendation
**EigenAI** analyzes your savings goals and recommends one of three strategies — Conservative (~4% APY), Balanced (~8% APY), or Aggressive (~15% APY). Each strategy allocates funds to different Sui DeFi protocols for optimal yield.

### Step 4: Deposit Periodically
Make your USDC deposit each period (daily or weekly) to stay in the race. Every deposit is **gasless** — the backend sponsors all gas fees. Each successful deposit increases your `deposited_count`, which determines your share of the reward pool.

### Step 5: Yield Accumulates
While you save, the Vault earns yield from DeFi protocols. Your **principal is always safe**. The reward pool grows over time based on your chosen strategy.

### Step 6: Claim Rewards
When the room ends, claim your proportional share of principal + yield:

> **your_reward = (your_deposits / total_deposits) × total_yield**

The more consistent you are, the bigger your share. No penalties — miss a deposit and you simply receive a smaller portion.

---

## AI-Powered DeFi Strategy

Money Race uses **EigenAI** (deepseek-v31-terminus model) to analyze your savings goals and recommend the optimal strategy:

| Strategy | Risk | Target APY | Sui DeFi Protocols |
|----------|------|------------|-------------------|
| **Conservative** | Low | ~4% | Scallop, Navi Protocol, Aftermath Finance |
| **Balanced** | Medium | ~8% | Scallop, Cetus, Turbos, Navi |
| **Aggressive** | High | ~15% | Cetus, Kriya, Turbos, Aftermath |

The AI doesn't just pick a risk level — it explains *why* a strategy suits you, with detailed protocol allocations and reasoning. Supports both English and Indonesian prompts.

> **Note:** Current testnet version uses simulated yield based on real protocol APY rates. Mainnet will integrate directly with Sui DeFi protocols for real yield generation.

---

## Target Users

| User Type | Why Money Race? |
|-----------|----------------|
| **Casual Savers** | Fun gamification makes saving feel effortless |
| **Communities** | Save together with friends through group accountability |
| **Gamers** | Competitive rooms, leaderboards, and mini-games |
| **DeFi Users** | AI-optimized yield strategies on Sui protocols |
| **Web2 Users** | No wallet needed — just Google login and zero gas fees |

---

## Built on Sui

Money Race leverages the power of **Sui blockchain** for:

- **Gasless UX** — Backend sponsors all transaction fees, users pay nothing
- **zkLogin** — Sign in with Google, no crypto wallet required
- **Sub-second finality** — Instant deposits and claims
- **Move language** — Smart contract safety guarantees
- **Scalability** — Handle thousands of concurrent rooms

---

## Key Differentiators

| Feature | Money Race | Traditional Savings | Other DeFi |
|---------|------------|--------------------|----|
| Gamification | ✅ | ❌ | ❌ |
| AI Strategy (EigenAI) | ✅ | ❌ | ❌ |
| Social Saving Rooms | ✅ | ❌ | ⚠️ |
| Gasless Transactions | ✅ | N/A | ❌ |
| Web2 Login (zkLogin) | ✅ | ✅ | ❌ |
| On-chain Yield Rewards | ✅ | ❌ | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Sui Network (Move) |
| **AI Engine** | EigenAI (deepseek-v31-terminus) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Frontend** | Next.js 16, React 18, Tailwind CSS |
| **Auth** | Google OAuth + Sui zkLogin |
| **Database** | SQLite + Prisma ORM |
| **State** | Zustand |

---

[Next: Problem and Solution →](problem-and-solution.md)
