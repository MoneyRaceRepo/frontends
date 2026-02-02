/**
 * Application Constants
 */

// Sui Network
export const SUI_COIN_TYPE = '0x2::sui::SUI';

// USDC Mock Coin Type
// TODO: Replace with your actual USDC mock package ID
// Format: 0x[package_id]::usdc::USDC
export const USDC_COIN_TYPE = process.env.NEXT_PUBLIC_USDC_COIN_TYPE || '0x2::sui::SUI';

// Default coin type to use for deposits
export const DEFAULT_COIN_TYPE = USDC_COIN_TYPE;

// Sui Clock object (standard across all networks)
export const SUI_CLOCK_ID = '0x6';

// Minimum balance required for transactions (in smallest unit)
// 1 USDC = 1,000,000 (6 decimals)
// 1 SUI = 1,000,000,000 (9 decimals)
export const MIN_BALANCE_USDC = 1_000_000n; // 1 USDC
export const MIN_BALANCE_SUI = 1_000_000n; // 0.001 SUI
