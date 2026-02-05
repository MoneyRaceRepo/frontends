# Deployments

## Contract Addresses

All Money Race smart contracts are deployed on the Sui blockchain.

---

## Mainnet

> ⚠️ **Coming Soon** – Mainnet deployment pending audit completion.

| Contract | Address | Status |
|----------|---------|--------|
| Registry | `0x...` | Pending |
| Room Factory | `0x...` | Pending |
| Rewards | `0x...` | Pending |

---

## Testnet

> ✅ **Active** – Use testnet for development and testing.

| Contract | Address | Status |
|----------|---------|--------|
| Registry | `0xTBD...` | ✅ Active |
| Room Factory | `0xTBD...` | ✅ Active |
| Rewards | `0xTBD...` | ✅ Active |

**Network:** Sui Testnet  
**Explorer:** [Sui Explorer (Testnet)](https://suiexplorer.com/?network=testnet)

---

## Package ID

```
Package ID: 0x[PACKAGE_ID_HERE]
```

---

## Verification

Verify contract source code:

```bash
# Clone repository
git clone https://github.com/[ORG]/money-race-contracts

# Build
sui move build

# Test
sui move test
```

---

## Integration

### Install Dependencies

```bash
npm install @mysten/sui.js
```

### Connect to Contracts

```typescript
import { SuiClient } from '@mysten/sui.js/client';

const client = new SuiClient({
  url: 'https://fullnode.testnet.sui.io',
});

// Package ID
const PACKAGE_ID = '0x...';

// Call function
const tx = new TransactionBlock();
tx.moveCall({
  target: `${PACKAGE_ID}::room::create_room`,
  arguments: [
    tx.pure('My Room'),
    tx.pure(8), // weeks
    tx.pure(50_000_000), // $50 USDC (6 decimals)
  ],
});
```

---

## USDC Token

| Network | Contract | Decimals |
|---------|----------|----------|
| Testnet | Mock USDC | 6 |
| Mainnet | Official USDC | 6 |

---

## Faucet

Get testnet SUI for development:

```bash
sui client faucet
```

Or visit: [Sui Faucet](https://faucet.testnet.sui.io/)

---

[Back to Developers →](README.md)
