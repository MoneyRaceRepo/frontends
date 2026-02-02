/**
 * Sui Blockchain Utilities
 * Helper functions for interacting with Sui RPC
 */

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC || 'https://fullnode.testnet.sui.io';

/**
 * Make RPC call to Sui node
 */
async function rpcCall(method: string, params: any[]) {
  const response = await fetch(SUI_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC call failed');
  }
  return data.result;
}

/**
 * Get all coin objects owned by an address
 * @param address - Sui wallet address
 * @param coinType - Optional coin type (default: SUI)
 * @returns Array of coin objects with their IDs and balances
 */
export async function getUserCoins(
  address: string,
  coinType: string = '0x2::sui::SUI'
) {
  try {
    const result = await rpcCall('suix_getCoins', [address, coinType, null, null]);

    return result.data.map((coin: any) => ({
      objectId: coin.coinObjectId,
      balance: coin.balance,
      digest: coin.digest,
    }));
  } catch (error) {
    console.error('Failed to fetch coins:', error);
    return [];
  }
}

/**
 * Get the first available coin object with sufficient balance
 * @param address - Sui wallet address
 * @param minBalance - Minimum balance required (in smallest unit)
 * @param coinType - Coin type to query (default: SUI). For USDC mock, use your USDC package ID
 * @returns Coin object ID or null if not found
 */
export async function getAvailableCoin(
  address: string,
  minBalance: bigint = 1_000_000n, // Default 0.001 SUI or 0.001 USDC
  coinType: string = '0x2::sui::SUI'
): Promise<string | null> {
  const coins = await getUserCoins(address, coinType);

  // Find first coin with sufficient balance
  const suitableCoin = coins.find((coin) => BigInt(coin.balance) >= minBalance);

  return suitableCoin ? suitableCoin.objectId : null;
}

/**
 * Get total balance for an address
 * @param address - Sui wallet address
 * @param coinType - Optional coin type (default: SUI)
 * @returns Total balance in MIST
 */
export async function getTotalBalance(
  address: string,
  coinType: string = '0x2::sui::SUI'
): Promise<bigint> {
  const coins = await getUserCoins(address, coinType);
  return coins.reduce((total, coin) => total + BigInt(coin.balance), 0n);
}

/**
 * Format balance from MIST to SUI
 * @param balance - Balance in MIST
 * @returns Formatted balance in SUI (e.g., "1.5 SUI")
 */
export function formatBalance(balance: bigint): string {
  const sui = Number(balance) / 1_000_000_000;
  return `${sui.toFixed(4)} SUI`;
}

/**
 * Convert SUI to MIST
 * @param sui - Amount in SUI
 * @returns Amount in MIST
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * 1_000_000_000));
}

/**
 * Convert MIST to SUI
 * @param mist - Amount in MIST
 * @returns Amount in SUI
 */
export function mistToSui(mist: bigint): number {
  return Number(mist) / 1_000_000_000;
}
