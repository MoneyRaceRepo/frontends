/**
 * Transaction Builder Utilities
 * Build Move transactions on the frontend for user signing
 */

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { keccak_256 } from '@noble/hashes/sha3';

// Contract Package ID
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

/**
 * Build join_room transaction
 * User signs this tx, so tx_context::sender(ctx) will be the user's address
 * Splits coin to exact deposit amount before calling join_room
 */
export function buildJoinRoomTx(params: {
  roomId: string;
  vaultId: string;
  coinObjectId: string;
  clockId: string;
  depositAmount: number; // Amount to deposit (from room config)
  password?: string; // Password for private rooms (will be hashed with keccak256)
}): Transaction {
  const tx = new Transaction();

  // Split exact amount from user's coin
  const [depositCoin] = tx.splitCoins(tx.object(params.coinObjectId), [params.depositAmount]);

  // Hash password if provided, otherwise use empty vector
  let passwordBytes: Uint8Array;
  if (params.password) {
    passwordBytes = keccak_256(new TextEncoder().encode(params.password));
  } else {
    passwordBytes = new Uint8Array(0); // Empty Uint8Array for public rooms
  }

  // Use join_room with the split coin and password
  tx.moveCall({
    target: `${PACKAGE_ID}::money_race::join_room`,
    arguments: [
      tx.object(params.roomId),
      tx.object(params.vaultId),
      tx.object(params.clockId),
      depositCoin,
      tx.pure(bcs.vector(bcs.u8()).serialize(passwordBytes)),
    ],
  });

  return tx;
}

/**
 * Build deposit transaction
 * Matches: deposit(room, vault, player, clock, coin)
 * Splits coin to exact deposit amount before calling deposit
 */
export function buildDepositTx(params: {
  roomId: string;
  vaultId: string;
  playerPositionId: string;
  coinObjectId: string;
  clockId: string;
  depositAmount: number; // Amount to deposit (from room config)
}): Transaction {
  const tx = new Transaction();

  // Split exact amount from user's coin
  const [depositCoin] = tx.splitCoins(tx.object(params.coinObjectId), [params.depositAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::money_race::deposit`,
    arguments: [
      tx.object(params.roomId),
      tx.object(params.vaultId),
      tx.object(params.playerPositionId),
      tx.object(params.clockId),
      depositCoin,
    ],
  });

  return tx;
}

/**
 * Build claim transaction
 */
export function buildClaimTx(params: {
  roomId: string;
  vaultId: string;
  playerPositionId: string;
  clockId: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::money_race::claim_all`,
    arguments: [
      tx.object(params.roomId),
      tx.object(params.vaultId),
      tx.object(params.playerPositionId),
      tx.object(params.clockId),
    ],
  });

  return tx;
}
