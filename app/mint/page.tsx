'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usdcAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function MintUSDCPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(true);
  const [amount, setAmount] = useState<string>('100');
  const [balance, setBalance] = useState<string>('0');
  const [balanceFormatted, setBalanceFormatted] = useState<string>('0.00');
  const [cooldownInfo, setCooldownInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set auth loading to false after mount
  useEffect(() => {
    setAuthLoading(false);
  }, []);

  // Fetch balance and cooldown info
  useEffect(() => {
    if (user?.address) {
      fetchBalance();
      fetchCooldownInfo();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user?.address) return;
    try {
      const data = await usdcAPI.getBalance(user.address);
      setBalance(data.balance);
      setBalanceFormatted(data.balanceFormatted);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const fetchCooldownInfo = async () => {
    if (!user?.address) return;
    try {
      const data = await usdcAPI.getFaucetInfo(user.address);
      setCooldownInfo(data);
    } catch (err: any) {
      console.error('Failed to fetch cooldown info:', err);
    }
  };

  const handleMint = async () => {
    setError(null);
    setSuccess(null);

    if (!user?.address) {
      setError('User address not found. Please log in again.');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNumber > 1000) {
      setError('Maximum mint amount is 1000 USDC');
      return;
    }

    // Convert to smallest unit (6 decimals)
    const amountInSmallestUnit = Math.floor(amountNumber * 1_000_000);

    setIsLoading(true);
    try {
      const result = await usdcAPI.mint(user.address, amountInSmallestUnit);

      if (result.success) {
        setSuccess(`Successfully minted ${amountNumber} USDC to your wallet!`);
        setAmount('100'); // Reset to default

        // Refresh balance and cooldown info
        setTimeout(() => {
          fetchBalance();
          fetchCooldownInfo();
        }, 1000);
      } else {
        setError(result.error || 'Failed to mint USDC');
      }
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to mint USDC');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Check if user is logged in
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please Log In
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to mint USDC tokens.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const canMint = cooldownInfo?.canMint !== false;
  const cooldownRemaining = cooldownInfo?.timeUntilNextMint || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mint USDC Tokens
          </h1>
          <p className="text-gray-600">
            Get free mock USDC tokens for testing
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Current Balance
          </h2>
          <div className="text-4xl font-bold text-blue-600">
            {balanceFormatted} USDC
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Address: {user.address.slice(0, 8)}...{user.address.slice(-6)}
          </p>
        </div>

        {/* Mint Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Mint Tokens
          </h2>

          {/* Cooldown Warning */}
          {!canMint && cooldownRemaining > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium">
                ⏳ Cooldown Active
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                You can mint again in {formatCooldown(cooldownRemaining)}
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              max="1000"
              step="0.01"
              disabled={!canMint || isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter amount (max 1000)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum: 1000 USDC per mint
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAmount('100')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              100 USDC
            </button>
            <button
              onClick={() => setAmount('500')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              500 USDC
            </button>
            <button
              onClick={() => setAmount('1000')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              1000 USDC
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={!canMint || isLoading}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                Minting...
              </span>
            ) : !canMint ? (
              'Cooldown Active'
            ) : (
              'Mint USDC'
            )}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            Faucet Information
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Maximum mint: 1000 USDC per transaction</li>
            <li>• Cooldown: 24 hours between mints</li>
            <li>• This is a mock token for testing purposes</li>
            <li>• Transactions are sponsored (gasless)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
