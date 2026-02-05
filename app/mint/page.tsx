'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usdcAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { LottieLoading, LottieSpinner } from '@/components/ui/LottieLoading';
import { useToast } from '@/components/ui/Toast';
import DashboardLayout from '@/components/DashboardLayout';
import { HiClock, HiLockClosed, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';
import { FaCoins, FaWallet, FaGift, FaFaucet, FaMagic } from 'react-icons/fa';
import { RiCoinsFill, RiExchangeDollarFill } from 'react-icons/ri';

export default function MintUSDCPage() {
  const router = useRouter();
  const toast = useToast();
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
      // Silent fail - balance will show 0
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
      toast.error('Not Logged In', 'Please log in to mint USDC.');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid amount');
      toast.warning('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (amountNumber > 1000) {
      setError('Maximum mint amount is 1000 USDC');
      toast.warning('Limit Exceeded', 'Maximum mint amount is 1000 USDC per request.');
      return;
    }

    // Convert to smallest unit (6 decimals)
    const amountInSmallestUnit = Math.floor(amountNumber * 1_000_000);

    setIsLoading(true);
    try {
      const result = await usdcAPI.mint(user.address, amountInSmallestUnit);

      if (result.success) {
        setSuccess(`Successfully minted ${amountNumber} USDC to your wallet!`);
        toast.success('Mint Successful!', `${amountNumber} USDC has been added to your wallet.`);
        setAmount('100'); // Reset to default

        // Refresh balance and cooldown info
        setTimeout(() => {
          fetchBalance();
          fetchCooldownInfo();
        }, 1000);
      } else {
        setError(result.error || 'Failed to mint USDC');
        toast.error('Mint Failed', result.error || 'Unable to mint USDC. Please try again later.');
      }
    } catch (err: any) {
      console.error('Mint error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to mint USDC';
      setError(errorMsg);
      toast.error('Error', 'Something went wrong during minting. Please try again.');
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#2A1810] to-[#1A0F0A]">
        <LottieLoading size="xl" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#2A1810] to-[#1A0F0A]">
        <div className="text-center max-w-md bg-[#F5EDD8] rounded-2xl p-8 border-2 border-[#D4A84B]/40 shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <HiLockClosed className="w-8 h-8 text-[#4A3000]" />
          </div>
          <h1 className="text-2xl font-bold text-[#4A3000] mb-4">
            Please Log In
          </h1>
          <p className="text-[#6B4F0F] mb-6">
            You need to be logged in to mint USDC tokens.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-[#D4A84B]"
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
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2
            className="text-[#4A3000] text-2xl font-bold tracking-wider mb-2"
            style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
          >
            MINT USDC
          </h2>
          <p className="text-[#6B4F0F] text-sm">
            Get free mock USDC tokens for testing
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-[#F5EDD8] rounded-2xl shadow-xl p-6 mb-6 border-2 border-[#D4A84B]/40">
          <h2 className="text-lg font-semibold text-[#8B6914] mb-2">
            Current Balance
          </h2>
          <div className="text-4xl font-bold text-[#4A3000]">
            {balanceFormatted} <span className="text-[#8B6914]">USDC</span>
          </div>
          <p className="text-sm text-[#8B6914]/70 mt-2">
            Address: {user.address.slice(0, 8)}...{user.address.slice(-6)}
          </p>
        </div>

        {/* Mint Card */}
        <div className="bg-[#F5EDD8] rounded-2xl shadow-xl p-6 mb-6 border-2 border-[#D4A84B]/40">
          <h2 className="text-xl font-bold text-[#4A3000] mb-4">
            Mint Tokens
          </h2>

          {/* Cooldown Warning */}
          {!canMint && cooldownRemaining > 0 && (
            <div className="bg-[#FFB347]/20 border-2 border-[#FFB347]/50 rounded-xl p-4 mb-4">
              <p className="text-[#4A3000] font-medium flex items-center gap-2">
                <HiClock className="w-5 h-5 text-[#8B6914]" /> Cooldown Active
              </p>
              <p className="text-[#6B4F0F] text-sm mt-1">
                You can mint again in {formatCooldown(cooldownRemaining)}
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#4A3000] mb-2">
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
              className="w-full px-4 py-3 bg-[#FBF7EC] border-2 border-[#D4A84B]/40 rounded-xl text-[#4A3000] focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              placeholder="Enter amount (max 1000)"
            />
            <p className="text-sm text-[#8B6914]/70 mt-1">
              Maximum: 1000 USDC per mint
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAmount('100')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-[#E8DCC0] text-[#4A3000] rounded-xl font-medium hover:bg-[#D4A84B]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4A84B]/30"
            >
              100 USDC
            </button>
            <button
              onClick={() => setAmount('500')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-[#E8DCC0] text-[#4A3000] rounded-xl font-medium hover:bg-[#D4A84B]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4A84B]/30"
            >
              500 USDC
            </button>
            <button
              onClick={() => setAmount('1000')}
              disabled={!canMint || isLoading}
              className="px-4 py-2 bg-[#E8DCC0] text-[#4A3000] rounded-xl font-medium hover:bg-[#D4A84B]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4A84B]/30"
            >
              1000 USDC
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-[#FDF2F2] border-2 border-[#E5A0A0] rounded-xl p-4 mb-4">
              <p className="text-[#8B3030] flex items-center gap-2">
                <HiExclamationCircle className="w-5 h-5" /> {error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-[#E8F4E8] border-2 border-[#9BC49B] rounded-xl p-4 mb-4">
              <p className="text-[#2D5A2D] flex items-center gap-2">
                <HiCheckCircle className="w-5 h-5" /> {success}
              </p>
            </div>
          )}

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={!canMint || isLoading}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-lg border-2 border-[#D4A84B]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LottieSpinner size={24} />
                Minting...
              </span>
            ) : !canMint ? (
              'Cooldown Active'
            ) : (
              <span className="flex items-center justify-center gap-2"><FaCoins className="w-5 h-5" /> Mint USDC</span>
            )}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-[#F0E6D0] border-2 border-[#C9A86C]/50 rounded-2xl p-6">
          <h3 className="font-bold text-[#4A3000] mb-3 flex items-center gap-2">
            <FaFaucet className="w-5 h-5 text-[#8B6914]" /> Faucet Information
          </h3>
          <ul className="space-y-2 text-sm text-[#6B4F0F]">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Maximum mint: 1000 USDC per transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Cooldown: 24 hours between mints</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>This is a mock token for testing purposes</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Transactions are sponsored (gasless)</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
