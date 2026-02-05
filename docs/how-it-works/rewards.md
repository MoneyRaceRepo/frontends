# Rewards System

## Overview

Money Race rewards consistent savers with bonus earnings from the penalty pool. The more consistent you are, the more you earn!

---

## Reward Sources

### 1. Penalty Pool

When participants miss their weekly deposits, a penalty fee is charged. This fee goes into the room's reward pool.

```
Missed Deposit → Penalty Applied → Reward Pool Grows
```

### 2. Performance Bonuses

Top performers receive additional bonuses:

| Position | Bonus |
|----------|-------|
| 🥇 1st Place | 10% extra |
| 🥈 2nd Place | 5% extra |
| 🥉 3rd Place | 3% extra |

---

## Reward Calculation

### Formula

```
Your Reward = (Your Consistency Score / Total Consistency) × Reward Pool
```

**Consistency Score** is based on:
- ✅ On-time deposits (+10 points)
- ⏰ Late deposits (+5 points)
- ❌ Missed deposits (0 points)

---

## Distribution Breakdown

At challenge end, the reward pool is distributed:

```
Total Reward Pool: $500

Distribution:
├── 80% → Consistent Savers: $400
│   ├── User A (100%): $150
│   ├── User B (95%): $140
│   └── User C (90%): $110
├── 15% → Top 3 Bonuses: $75
│   ├── 1st Place: $40
│   ├── 2nd Place: $25
│   └── 3rd Place: $10
└── 5% → Protocol Fee: $25
```

---

## Example Scenario

**Room Details:**
- 10 participants
- $50 weekly target
- 8 weeks duration
- 10% penalty rate

**Outcomes:**
- 7 participants completed all 8 weeks
- 2 participants missed 2 weeks each
- 1 participant missed 4 weeks

**Penalty Pool:**
```
(2 participants × 2 missed × $50 × 10%) + 
(1 participant × 4 missed × $50 × 10%)
= $20 + $20 = $40
```

**Your Reward (if you completed 100%):**
```
$40 × 0.80 × (100/770) = ~$4.16 + bonuses
```

---

## Withdrawal

After challenge completion:

1. Navigate to Room → "Claim Rewards"
2. View your final breakdown
3. Click "Withdraw"
4. Funds sent to your wallet

**Processing Time:** Instant on Sui blockchain

---

[Back to How It Works →](README.md)
