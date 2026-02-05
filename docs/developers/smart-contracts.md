# Smart Contracts

## Overview

Money Race is powered by **Sui Move** smart contracts that handle all core protocol logic including room management, deposits, and reward distribution.

---

## Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Money Race Protocol                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Registry  │  │    Room     │  │   Rewards   │    │
│  │   Module    │  │   Module    │  │   Module    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │               │               │              │
│  ┌─────────────────────────────────────────────────┐  │
│  │                 Core Module                      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Modules

### 1. Registry Module

Manages protocol-level state:

```move
module money_race::registry {
    struct Registry has key {
        id: UID,
        rooms: Table<ID, Room>,
        total_rooms: u64,
        total_deposits: u64,
        protocol_fee: u64,
    }
}
```

**Functions:**
- `create_registry()` – Initialize protocol
- `get_stats()` – Fetch protocol statistics
- `update_fee()` – Admin fee management

---

### 2. Room Module

Handles savings room logic:

```move
module money_race::room {
    struct Room has key, store {
        id: UID,
        name: String,
        creator: address,
        duration_weeks: u8,
        weekly_target: u64,
        max_participants: u8,
        penalty_rate: u8,
        status: u8,
        participants: Table<address, Participant>,
        reward_pool: Balance<USDC>,
        created_at: u64,
    }
    
    struct Participant has store {
        address: address,
        deposits: vector<Deposit>,
        total_deposited: u64,
        streak: u8,
        strategy: u8,
    }
}
```

**Functions:**
- `create_room()` – Create new savings room
- `join_room()` – Join existing room
- `deposit()` – Make weekly deposit
- `leave_room()` – Exit before start
- `close_room()` – End challenge

---

### 3. Rewards Module

Calculates and distributes rewards:

```move
module money_race::rewards {
    struct RewardCalculation has drop {
        participant: address,
        consistency_score: u64,
        base_reward: u64,
        bonus_reward: u64,
        total_reward: u64,
    }
    
    fun calculate_rewards(room: &Room): vector<RewardCalculation>
    fun distribute_rewards(room: &mut Room)
}
```

---

## Events

The protocol emits events for indexing:

```move
struct RoomCreated has copy, drop {
    room_id: ID,
    creator: address,
    name: String,
    duration: u8,
}

struct DepositMade has copy, drop {
    room_id: ID,
    participant: address,
    amount: u64,
    week: u8,
}

struct RewardsDistributed has copy, drop {
    room_id: ID,
    total_distributed: u64,
    winner: address,
}
```

---

## Security Considerations

- ✅ **Object-centric design** – Each room is an owned object
- ✅ **Balance handling** – Proper USDC balance management
- ✅ **Access control** – Creator/admin permissions
- ✅ **Time locks** – Deposit windows enforced
- ✅ **Overflow protection** – Safe math operations

---

## Gas Optimization

| Operation | Estimated Gas |
|-----------|---------------|
| Create room | ~0.01 SUI |
| Join room | ~0.01 SUI |
| Weekly deposit | ~0.005 SUI |
| Claim rewards | ~0.01 SUI |

---

[Next: Deployments →](deployments.md)
