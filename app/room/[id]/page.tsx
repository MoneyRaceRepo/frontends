"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { roomAPI, usdcAPI, playerAPI, executeSponsoredTransaction, getSponsorAddress } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { getCoinsForAmount } from "@/lib/sui-utils";
import { DEFAULT_COIN_TYPE, MIN_BALANCE_USDC, SUI_CLOCK_ID } from "@/lib/constants";
import { buildJoinRoomTx, buildDepositTx, buildClaimTx } from "@/lib/tx-builder";
import { buildSponsoredTx } from "@/lib/zklogin-tx";
import { loadKeypair } from "@/lib/keypair";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { LottieLoading, LottieSpinner } from "@/components/ui/LottieLoading";
import { useToast } from "@/components/ui/Toast";
import { HiUserGroup, HiClock, HiLockClosed, HiCheckCircle, HiExclamationCircle, HiCurrencyDollar, HiArrowRight, HiArrowLeft, HiTrendingUp, HiCalendar, HiRefresh, HiKey, HiSparkles, HiLightBulb, HiShare, HiClipboardCopy, HiDocumentText } from "react-icons/hi";
import { HiBeaker, HiBan, HiPlay, HiOutlineClipboardCopy } from "react-icons/hi";
import { FaUsers, FaPiggyBank, FaTrophy, FaWallet, FaCoins, FaCheckCircle, FaUserPlus, FaGift, FaChartLine, FaBolt, FaDoorOpen, FaMedal } from "react-icons/fa";
import { RiCoinsFill, RiVipCrownFill, RiTimeFill, RiHistoryFill, RiMedal2Fill, RiMedal2Line } from "react-icons/ri";

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Helper function to format countdown time
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Now!';

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const mins = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// Helper function to get APY based on strategy
function getApyFromStrategy(strategy: string): number {
  switch (strategy) {
    case 'Aggressive': return 0.15;
    case 'Growth': return 0.08;
    case 'Stable':
    default: return 0.04;
  }
}

// Live Yield Display Component
function LiveYieldDisplay({ totalPool, strategy, startTime, realizedYield, storageKey }: {
  totalPool: number;
  strategy: string;
  startTime: Date;
  realizedYield: number;
  storageKey: string;
}) {
  const [yieldAmount, setYieldAmount] = useState(realizedYield);
  const lastRealizedYieldRef = useRef(realizedYield);
  const lastPersistRef = useRef(0);

  useEffect(() => {
    if (totalPool <= 0 && realizedYield <= 0) {
      setYieldAmount(0);
      return;
    }

    const apy = getApyFromStrategy(strategy);
    // Calculate per-second yield: TotalPool * APY / (365 * 24 * 60 * 60)
    const yieldPerSecond = (totalPool * apy) / 31536000;

    const now = Date.now();
    const yieldStorageKey = `liveYield_${storageKey}`;
    const yieldTsKey = `liveYieldTs_${storageKey}`;

    let baseYield = realizedYield;
    if (typeof window !== 'undefined') {
      const storedYield = parseFloat(localStorage.getItem(yieldStorageKey) || "");
      const storedTs = parseInt(localStorage.getItem(yieldTsKey) || "", 10);
      if (!Number.isNaN(storedYield) && !Number.isNaN(storedTs) && storedTs > 0) {
        const elapsedSec = Math.max(0, (now - storedTs) / 1000);
        const accrued = storedYield + (yieldPerSecond * elapsedSec);
        baseYield = Math.max(baseYield, accrued);
      }
    }

    // If realizedYield from backend increased, sync with it
    if (realizedYield > lastRealizedYieldRef.current) {
      console.log('???? Syncing yield with backend:', realizedYield.toFixed(6));
      baseYield = Math.max(baseYield, realizedYield);
      lastRealizedYieldRef.current = realizedYield;
    } else if (lastRealizedYieldRef.current === 0) {
      // First load - start from backend value
      lastRealizedYieldRef.current = realizedYield;
    }

    setYieldAmount(baseYield);
    if (typeof window !== 'undefined') {
      localStorage.setItem(yieldStorageKey, baseYield.toString());
      localStorage.setItem(yieldTsKey, now.toString());
      lastPersistRef.current = now;
    }

    // Increment by yieldPerSecond / 10 every 100ms
    const interval = setInterval(() => {
      setYieldAmount(prev => {
        const next = prev + (yieldPerSecond / 10);
        if (typeof window !== 'undefined') {
          const persistNow = Date.now();
          if (persistNow - lastPersistRef.current >= 1000) {
            localStorage.setItem(yieldStorageKey, next.toString());
            localStorage.setItem(yieldTsKey, persistNow.toString());
            lastPersistRef.current = persistNow;
          }
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [totalPool, strategy, realizedYield, storageKey, startTime]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="font-mono tabular-nums">
      ${yieldAmount.toFixed(6)}
    </span>
  );
}

interface Participant {
  address: string;
  totalDeposit: number;
  depositsCount: number;
  consistencyScore: number;
}

export default function RoomDetail() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const { user, setUser } = useAuthStore();
  const toast = useToast();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const currentWalletAccount = useCurrentAccount();

  // Auto-fix loginMethod if wallet is connected but loginMethod is missing
  useEffect(() => {
    if (currentWalletAccount?.address && user?.address === currentWalletAccount.address && !user.loginMethod) {
      console.log('⚠️ Wallet detected but loginMethod missing! Auto-fixing user object...');
      setUser({
        ...user,
        loginMethod: 'wallet',
      });
      console.log('✅ LoginMethod updated to: wallet');
    }
  }, [currentWalletAccount, user, setUser]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [roomData, setRoomData] = useState<any>(null);
  const [playerPositionId, setPlayerPositionId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [periodInfo, setPeriodInfo] = useState<{
    currentPeriod: number;
    timeUntilNextPeriod: number; // in seconds
    periodLengthMs: number;
    isTestMode: boolean;
  } | null>(null);
  const [hasDepositedThisPeriod, setHasDepositedThisPeriod] = useState(false);
  const [showFinalizeButton, setShowFinalizeButton] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'details' | 'history'>('participants');

  // Fetch room data on mount and check if user already joined
  useEffect(() => {
    if (roomId) {
      fetchRoomData();
      fetchParticipants();
      fetchHistory();
    }
    if (user?.address) {
      fetchUSDCBalance();
      // Check if current user already joined this room (using address-specific key)
      const storedPositionId = localStorage.getItem(`playerPosition_${roomId}_${user.address}`);
      if (storedPositionId) {
        setPlayerPositionId(storedPositionId);
        setIsJoined(true);
        // Fetch player position to check claimed status
        fetchPlayerPosition(storedPositionId);
      } else {
        // Reset if no stored position for this address
        setPlayerPositionId(null);
        setIsJoined(false);
        setHasClaimed(false);
      }
    }
  }, [roomId, user]);

  // Countdown timer for next period
  useEffect(() => {
    if (!periodInfo) return;

    const timer = setInterval(() => {
      setPeriodInfo(prev => {
        if (!prev) return null;
        if (prev.timeUntilNextPeriod <= 0) {
          // Period changed, refresh room data and history
          setHasDepositedThisPeriod(false); // Reset deposit status for new period
          fetchRoomData();
          fetchHistory(); // Refresh history to check deposit status for new period
          return prev;
        }
        return {
          ...prev,
          timeUntilNextPeriod: prev.timeUntilNextPeriod - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [periodInfo?.currentPeriod]);

  // Periodic refresh to sync yield with backend database (every 30 seconds)
  useEffect(() => {
    if (!roomId || !roomData?.status) return;
    
    // Only sync when room is active
    if (roomData?.status !== 'active') return;

    const syncInterval = setInterval(() => {
      console.log('⏰ Syncing yield with backend...');
      fetchRoomData();
    }, 30000); // Every 30 seconds

    return () => clearInterval(syncInterval);
  }, [roomId, roomData?.status]);

  // Refetch participants when roomData becomes available to recalculate scores correctly
  useEffect(() => {
    if (roomId && roomData?.totalPeriods !== undefined) {
      fetchParticipants();
    }
  }, [roomData?.totalPeriods]);

  // Also check from participants list after fetching
  useEffect(() => {
    if (user?.address && participants.length > 0) {
      const isUserJoined = participants.some(
        p => p.address.toLowerCase() === user.address.toLowerCase()
      );
      if (isUserJoined && !isJoined) {
        // User is in participants but we don't have position ID locally
        // This means they joined from blockchain but localStorage was cleared
        setIsJoined(true);
        console.log('User found in participants list, marking as joined');
      }
    }
  }, [participants, user?.address]);

  // Check if user has deposited for the current period
  useEffect(() => {
    if (!user?.address || !history.length || periodInfo?.currentPeriod === undefined) {
      setHasDepositedThisPeriod(false);
      return;
    }

    // Check if there's a deposit from this user for the current period
    const currentPeriod = periodInfo.currentPeriod;
    const userDeposits = history.filter(tx =>
      tx.type === 'deposit' &&
      tx.player?.toLowerCase() === user.address.toLowerCase() &&
      tx.period === currentPeriod
    );

    // Also check for join transaction (join counts as first deposit, period 0)
    const userJoins = history.filter(tx =>
      tx.type === 'join' &&
      tx.player?.toLowerCase() === user.address.toLowerCase()
    );

    // If current period is 0, check if user has joined (join = first deposit)
    // If current period > 0, check if user has deposited for this period
    const hasDeposited = currentPeriod === 0
      ? userJoins.length > 0
      : userDeposits.length > 0;

    setHasDepositedThisPeriod(hasDeposited);
    console.log(`User deposit check - Period: ${currentPeriod}, Has deposited: ${hasDeposited}`);
  }, [history, user?.address, periodInfo?.currentPeriod]);

  // Show finalize button with 3 second delay when room periods are complete
  useEffect(() => {
    const shouldShowFinalize =
      roomData?.status === "active" &&
      isJoined &&
      roomData?.currentPeriod >= roomData?.totalPeriods;

    if (shouldShowFinalize && !showFinalizeButton) {
      // 3 second delay before showing finalize button
      const timer = setTimeout(() => {
        setShowFinalizeButton(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [roomData?.status, roomData?.currentPeriod, roomData?.totalPeriods, isJoined, showFinalizeButton]);

  const fetchParticipants = async () => {
    if (!roomId) return;
    try {
      // Fetch both participants and history together
      const [participantsResponse, historyResponse] = await Promise.all([
        roomAPI.getParticipants(roomId),
        roomAPI.getHistory(roomId)
      ]);

      // Process history first to count deposits per user
      const historyData = historyResponse.success ? historyResponse.history : [];
      setHistory(historyData);

      // Count deposits (including join as first deposit) per participant
      const depositCounts: Record<string, number> = {};
      const totalAmounts: Record<string, number> = {};
      const USDC_DECIMALS = 1_000_000;

      historyData.forEach((tx: any) => {
        const addr = tx.player?.toLowerCase();
        if (!addr) return;

        // Count both 'join' and 'deposit' - join is the first deposit (period 0)
        if (tx.type === 'join' || tx.type === 'deposit') {
          depositCounts[addr] = (depositCounts[addr] || 0) + 1;
          totalAmounts[addr] = (totalAmounts[addr] || 0) + (tx.amount / USDC_DECIMALS);
        }
      });

      if (participantsResponse.success && participantsResponse.participants) {
        // Expected deposits = total periods (join at period 0 counts as first deposit)
        const totalPeriods = roomData?.totalPeriods || 3;

        const formattedParticipants = participantsResponse.participants.map((p: any) => {
          const addr = p.address.toLowerCase();
          const depositsCount = depositCounts[addr] || 1; // At least 1 for joining
          const totalDeposit = totalAmounts[addr] || (p.amount / USDC_DECIMALS);

          // Consistency score = (actual deposits / total periods) * 100
          const consistencyScore = totalPeriods > 0
            ? Math.min(100, Math.round((depositsCount / totalPeriods) * 100))
            : 100;

          return {
            address: p.address,
            totalDeposit,
            depositsCount,
            consistencyScore,
          };
        });
        setParticipants(formattedParticipants);
      }
    } catch (error: any) {
      console.error('Failed to fetch participants:', error);
      // Silent fail - participants list will be empty
    }
  };

  const fetchHistory = async () => {
    if (!roomId) return;
    try {
      const response = await roomAPI.getHistory(roomId);
      if (response.success && response.history) {
        setHistory(response.history);
      }
    } catch (error: any) {
      console.error('Failed to fetch history:', error);
      // Silent fail - history will be empty
    }
  };

  const fetchUSDCBalance = async () => {
    if (!user?.address) return;
    try {
      const data = await usdcAPI.getBalance(user.address);
      setUsdcBalance(data.balanceFormatted || "0.00");
    } catch (error: any) {
      console.error('Failed to fetch USDC balance:', error);
      setUsdcBalance("0.00");
      // Silent fail - balance will show 0.00
    }
  };

  const fetchPlayerPosition = async (positionId: string) => {
    try {
      const response = await playerAPI.getPosition(positionId);
      if (response.success && response.position?.fields) {
        const claimed = response.position.fields.claimed === true;
        setHasClaimed(claimed);
        console.log('Player position fetched:', { positionId, claimed });
      }
    } catch (error) {
      console.error('Failed to fetch player position:', error);
    }
  };

  const fetchRoomData = async () => {
    try {
      // Validasi Room ID sebelum fetch
      if (!roomId || roomId.length < 10) {
        console.warn("Invalid Room ID:", roomId);
        setError(`Invalid Room ID format. Received: ${roomId || 'undefined'}`);
        return;
      }

      console.log("Fetching room data for ID:", roomId);
      const response = await roomAPI.getRoom(roomId);

      if (response.success && response.room) {
        console.log("Room data from blockchain:", response.room);

        // Extract blockchain fields from response - check multiple possible paths
        const blockchainData = response.room.content?.fields || response.room.fields || response.room;
        console.log("Blockchain data fields:", blockchainData);

        // Parse status - can be number or string
        const statusValue = parseInt(blockchainData.status);
        console.log("Room status value:", statusValue, "raw:", blockchainData.status);

        let roomStatus: "pending" | "active" | "finished";
        if (statusValue === 1) {
          roomStatus = "active";
        } else if (statusValue === 2) {
          roomStatus = "finished";
        } else {
          roomStatus = "pending";
        }
        console.log("Parsed room status:", roomStatus);

        // USDC has 6 decimals
        const USDC_DECIMALS = 1_000_000;
        const rawDepositAmount = parseInt(blockchainData.deposit_amount) || 10;

        // Get period timing info
        const startTimeMs = parseInt(blockchainData.start_time_ms) || Date.now();
        const periodLengthMs = parseInt(blockchainData.period_length_ms) || (7 * 24 * 60 * 60 * 1000);
        const now = Date.now();
        const elapsedMs = now - startTimeMs;
        const currentPeriod = Math.max(0, Math.floor(elapsedMs / periodLengthMs));
        const nextPeriodStart = startTimeMs + ((currentPeriod + 1) * periodLengthMs);
        const timeUntilNextPeriod = Math.max(0, Math.floor((nextPeriodStart - now) / 1000));

        // Detect test mode (period length < 1 hour)
        const isTestMode = periodLengthMs < (60 * 60 * 1000);

        // Set period info for countdown
        setPeriodInfo({
          currentPeriod,
          timeUntilNextPeriod,
          periodLengthMs,
          isTestMode,
        });

        // Transform blockchain data to frontend format
        const transformedRoom = {
          id: roomId,
          name: `Room #${roomId.slice(0, 8)}`,
          creator: response.room.objectId || "Unknown",
          vaultId: response.room.vaultId || null, // ✓ Store vaultId from database
          deposit_amount: rawDepositAmount, // ✓ Store raw deposit amount for transactions
          duration: parseInt(blockchainData.total_periods) || 12,
          weeklyTarget: rawDepositAmount / USDC_DECIMALS, // Convert to USDC display value
          currentPeriod: currentPeriod, // Calculated from start_time
          totalPeriods: parseInt(blockchainData.total_periods) || 12,
          totalDeposit: response.room.totalDeposit || 0, // ✓ Get from vault balance (backend)
          rewardPool: response.room.rewardPool || 0, // ✓ Get from vault balance (backend)
          strategy: blockchainData.strategy_id === 0 ? "Stable" : blockchainData.strategy_id === 1 ? "Growth" : "Aggressive",
          status: roomStatus,
          participants: [], // TODO: Query from blockchain
          isPrivate: blockchainData.is_private || false,
          startTimeMs: startTimeMs, // Stable timestamp for live yield calculation
        };

        // Persist blockchain startTimeMs to localStorage for stable live yield
        if (typeof window !== 'undefined' && startTimeMs) {
          localStorage.setItem(`roomStartTime_${roomId}`, startTimeMs.toString());
        }

        setRoomData(transformedRoom);
        setError(""); // Clear any previous errors
      }
    } catch (err: any) {
      console.error("Failed to fetch room data:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to fetch room data";
      const hint = err.response?.data?.hint || "";
      setError(`${errorMsg}${hint ? ` - ${hint}` : ''}`);
      toast.error("Connection Error", "Unable to load room data. Please check your connection.");
      // Use mock data as fallback
    }
  };

  // Helper function to get stable start time for live yield (persisted in localStorage)
  const getStableStartTime = (roomIdParam: string): number => {
    if (typeof window === 'undefined') return Date.now();
    
    const storageKey = `roomStartTime_${roomIdParam}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return parseInt(stored, 10);
    }
    
    // First visit - create stable start time (now) and persist it
    const newStartTime = Date.now();
    localStorage.setItem(storageKey, newStartTime.toString());
    return newStartTime;
  };

  // Mock data - replace with API call
  const room = roomData || {
    id: roomId,
    name: "Emergency Fund",
    creator: "0x123...abc",
    duration: 12,
    weeklyTarget: 100,
    currentPeriod: 3,
    totalPeriods: 12,
    totalDeposit: 1500,
    rewardPool: 150,
    strategy: "Stable",
    status: "active" as const,
    isPrivate: false,
    startTimeMs: getStableStartTime(roomId), // Use stable persisted time
    participants: [
      { address: "0x123...abc", totalDeposit: 300, depositsCount: 3, consistencyScore: 100 },
      { address: "0x456...def", totalDeposit: 300, depositsCount: 3, consistencyScore: 100 },
      { address: "0x789...ghi", totalDeposit: 200, depositsCount: 2, consistencyScore: 67 },
      { address: "0xabc...jkl", totalDeposit: 300, depositsCount: 3, consistencyScore: 100 },
      { address: "0xdef...mno", totalDeposit: 400, depositsCount: 4, consistencyScore: 133 },
    ],
  };

  const handleJoinRoom = async () => {
    if (!roomData?.vaultId) {
      setError("Vault ID not found. Please refresh the page.");
      return;
    }

    if (!user?.address) {
      setError("Please log in first to join a room.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get deposit amount from room data (already in raw blockchain format with decimals)
      const depositAmount = BigInt(roomData?.deposit_amount || 10_000_000); // Default 10 USDC
      console.log("Deposit amount (raw blockchain format):", depositAmount.toString());

      // Get coins that can be merged to meet the deposit amount
      console.log("Fetching USDC coins for address:", user.address);
      const coinResult = await getCoinsForAmount(user.address, depositAmount, DEFAULT_COIN_TYPE);
      console.log("Coin result:", {
        totalBalance: coinResult.totalBalance.toString(),
        canMeetAmount: coinResult.canMeetAmount,
        primaryCoin: coinResult.primaryCoin,
        coinsToMerge: coinResult.coinsToMerge.length
      });

      if (!coinResult.canMeetAmount || !coinResult.primaryCoin) {
        const weeklyTarget = roomData?.deposit_amount ? Number(roomData.deposit_amount) / 1_000_000 : 10;
        const totalUsdc = Number(coinResult.totalBalance) / 1_000_000;
        setError(`Insufficient USDC balance. Need $${weeklyTarget} but only have $${totalUsdc.toFixed(2)} total.`);
        setLoading(false);
        return;
      }

      console.log("Primary coin:", coinResult.primaryCoin);
      if (coinResult.coinsToMerge.length > 0) {
        console.log("Merging", coinResult.coinsToMerge.length, "additional coins");
      }

      const depositAmountNumber = Number(depositAmount);

      // Build the transaction with coin merging support
      const tx = buildJoinRoomTx({
        roomId: roomId,
        vaultId: roomData.vaultId,
        coinObjectId: coinResult.primaryCoin,
        coinsToMerge: coinResult.coinsToMerge,
        clockId: SUI_CLOCK_ID,
        depositAmount: depositAmountNumber,
        password: roomPassword || undefined, // Pass password if room is private
      });

      // Auto-detect loginMethod if undefined
      let detectedLoginMethod = user.loginMethod;
      if (!detectedLoginMethod) {
        // Check if ephemeral keypair exists (Google login) or wallet connected
        const hasKeypair = loadKeypair() !== null;
        const hasWallet = currentWalletAccount?.address === user.address;

        if (hasWallet) {
          detectedLoginMethod = 'wallet';
          console.log('🔧 Auto-detected loginMethod: wallet (wallet connected)');
        } else if (hasKeypair) {
          detectedLoginMethod = 'google';
          console.log('🔧 Auto-detected loginMethod: google (ephemeral keypair found)');
        } else {
          detectedLoginMethod = 'google'; // Default fallback
          console.log('⚠️ Could not detect loginMethod, defaulting to google');
        }

        // Update user object in store
        setUser({
          ...user,
          loginMethod: detectedLoginMethod,
        });
      }

      console.log("Building and signing transaction...");
      console.log("Login method:", detectedLoginMethod);

      const { txBytes, userSignature, executeDirectly } = await buildSponsoredTx(
        tx,
        user.address,
        detectedLoginMethod,
        detectedLoginMethod === 'wallet' ? signAndExecuteTransaction : undefined
      );

      let response: any;

      if (executeDirectly) {
        // Wallet executed directly, txBytes contains digest
        console.log("✅ Wallet executed directly, digest:", txBytes);

        // Validate digest
        if (!txBytes || txBytes.length === 0) {
          throw new Error('Transaction executed but no digest returned from wallet');
        }

        // Wait for transaction to be confirmed on blockchain (2 seconds)
        console.log("Waiting for transaction confirmation...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch transaction details from blockchain to get created objects
        const { suiClient } = await import('@/lib/sui');

        try {
          const txDetails = await suiClient.getTransactionBlock({
            digest: txBytes,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });

          console.log("Transaction details fetched:", txDetails);

          response = {
            success: true,
            digest: txBytes,
            effects: {
              created: txDetails.objectChanges
                ?.filter((change: any) => change.type === 'created')
                .map((change: any) => ({
                  reference: { objectId: change.objectId },
                  objectType: change.objectType,
                })) || [],
            },
          };
        } catch (fetchError: any) {
          console.error("Failed to fetch transaction details:", fetchError);
          // If fetch fails, still mark as success but without detailed effects
          // User can manually refresh to see if they're in the room
          response = {
            success: true,
            digest: txBytes,
            effects: { created: [] },
            warning: 'Transaction executed but details could not be fetched. Please refresh the page.',
          };
        }
      } else {
        // Google/zkLogin: Send to backend for sponsored execution
        console.log("Sending to backend for execution...");
        response = await executeSponsoredTransaction(txBytes, userSignature);
      }

      if (response.success) {
        // Extract player position ID from transaction effects
        let positionId: string | undefined;

        if (response.effects?.created && response.effects.created.length > 0) {
          // The PlayerPosition object should be in the created objects
          const playerPosition = response.effects.created.find((obj: any) =>
            obj.objectType?.includes("PlayerPosition")
          );

          if (playerPosition) {
            positionId = playerPosition.reference.objectId;
          } else if (response.effects.created[0]) {
            // Fallback: use first created object
            positionId = response.effects.created[0].reference.objectId;
          }
        }

        if (positionId) {
          // Store player position ID in localStorage (include user address in key)
          localStorage.setItem(`playerPosition_${roomId}_${user.address}`, positionId);
          setPlayerPositionId(positionId);
          setIsJoined(true);
          toast.success("Welcome!", "Successfully joined the room!");
          fetchRoomData(); // Refresh room data
          fetchParticipants(); // Refresh participants
        } else if (response.warning) {
          // Transaction succeeded but couldn't fetch details
          setIsJoined(true);
          toast.success("Room Joined!", "Transaction confirmed. Refreshing page to update details...");
          setTimeout(() => {
            window.location.reload(); // Refresh to fetch updated data
          }, 2000);
        } else {
          // Transaction succeeded but PlayerPosition ID not found
          toast.success("Room Joined!", "Transaction confirmed. Please refresh the page if needed.");
          setIsJoined(true);
          fetchRoomData();
          fetchParticipants();
        }
      } else {
        setError(response.error || "Failed to join room");
      }
    } catch (err: any) {
      console.error("Join room error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to join room";
      setError(errorMsg);
      toast.error("Join Failed", "Unable to join room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    // Check if vaultId is available from room data
    if (!roomData?.vaultId) {
      setError("Vault ID not found. Please refresh the page or try again.");
      return;
    }

    // Check if user has joined the room
    if (!playerPositionId) {
      setError("You need to join this room first before making a deposit.");
      return;
    }

    if (!user?.address) {
      setError("Please log in first to make a deposit.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get deposit amount from room data (already in raw blockchain format with decimals)
      const depositAmountValue = roomData?.deposit_amount || 10_000_000; // Default 10 USDC
      console.log("Deposit amount (raw blockchain format):", depositAmountValue);

      // Get coins that can be merged to meet the deposit amount
      console.log("Fetching USDC coins for deposit from:", user.address);
      const coinResult = await getCoinsForAmount(user.address, BigInt(depositAmountValue), DEFAULT_COIN_TYPE);
      console.log("Coin result:", {
        totalBalance: coinResult.totalBalance.toString(),
        canMeetAmount: coinResult.canMeetAmount,
        primaryCoin: coinResult.primaryCoin,
        coinsToMerge: coinResult.coinsToMerge.length
      });

      if (!coinResult.canMeetAmount || !coinResult.primaryCoin) {
        const weeklyTarget = depositAmountValue / 1_000_000;
        const totalUsdc = Number(coinResult.totalBalance) / 1_000_000;
        setError(`Insufficient USDC balance. Need $${weeklyTarget} but only have $${totalUsdc.toFixed(2)} total.`);
        setLoading(false);
        return;
      }

      console.log("Primary coin:", coinResult.primaryCoin);
      if (coinResult.coinsToMerge.length > 0) {
        console.log("Merging", coinResult.coinsToMerge.length, "additional coins");
      }

      // Build the deposit transaction with coin merging support
      const tx = buildDepositTx({
        roomId: roomId,
        vaultId: roomData.vaultId,
        playerPositionId: playerPositionId,
        coinObjectId: coinResult.primaryCoin,
        coinsToMerge: coinResult.coinsToMerge,
        clockId: SUI_CLOCK_ID,
        depositAmount: depositAmountValue,
      });

      // Auto-detect loginMethod if undefined
      let detectedLoginMethod = user.loginMethod;
      if (!detectedLoginMethod) {
        const hasKeypair = loadKeypair() !== null;
        const hasWallet = currentWalletAccount?.address === user.address;
        detectedLoginMethod = hasWallet ? 'wallet' : hasKeypair ? 'google' : 'google';
        console.log('🔧 Auto-detected loginMethod:', detectedLoginMethod);
        setUser({ ...user, loginMethod: detectedLoginMethod });
      }

      console.log("Building and signing deposit transaction...");
      const { txBytes, userSignature, executeDirectly } = await buildSponsoredTx(
        tx,
        user.address,
        detectedLoginMethod,
        detectedLoginMethod === 'wallet' ? signAndExecuteTransaction : undefined
      );

      let response: any;

      if (executeDirectly) {
        // Wallet executed directly
        console.log("✅ Wallet executed deposit directly, digest:", txBytes);
        response = { success: true, digest: txBytes };
      } else {
        // Google/zkLogin: Send to backend
        console.log("Sending deposit to backend for execution...");
        response = await executeSponsoredTransaction(txBytes, userSignature);
      }

      if (response.success) {
        toast.success("Deposit Successful!", "Your deposit has been recorded.");
        window.location.reload(); // Refresh page to update all data
      } else {
        setError(response.error || "Failed to deposit");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to deposit";
      setError(errorMsg);
      toast.error("Deposit Failed", "Unable to process deposit. Please check your balance and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    // Check if vaultId is available from room data
    if (!roomData?.vaultId) {
      setError("Vault ID not found. Please refresh the page or try again.");
      return;
    }

    // Check if user has joined the room
    if (!playerPositionId) {
      setError("You need to join this room first before claiming rewards.");
      return;
    }

    // Check if user is logged in
    if (!user?.address) {
      setError("Please login first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Get sponsor address
      const sponsorData = await getSponsorAddress();
      const sponsorAddress = sponsorData.sponsorAddress;

      // 2. Build claim transaction
      const claimTx = buildClaimTx({
        roomId: roomId,
        vaultId: roomData.vaultId,
        playerPositionId: playerPositionId,
      });

      // Auto-detect loginMethod if undefined
      let detectedLoginMethod = user.loginMethod;
      if (!detectedLoginMethod) {
        const hasKeypair = loadKeypair() !== null;
        const hasWallet = currentWalletAccount?.address === user.address;
        detectedLoginMethod = hasWallet ? 'wallet' : hasKeypair ? 'google' : 'google';
        console.log('🔧 Auto-detected loginMethod:', detectedLoginMethod);
        setUser({ ...user, loginMethod: detectedLoginMethod });
      }

      // 3. Build sponsored transaction with user as sender
      const { txBytes, userSignature, executeDirectly } = await buildSponsoredTx(
        claimTx,
        user.address,
        detectedLoginMethod,
        detectedLoginMethod === 'wallet' ? signAndExecuteTransaction : undefined
      );

      let response: any;

      if (executeDirectly) {
        // Wallet executed directly
        console.log("✅ Wallet executed claim directly, digest:", txBytes);
        response = { success: true, digest: txBytes };
      } else {
        // Google/zkLogin: Send to backend
        response = await roomAPI.claimReward({
          txBytes,
          userSignature,
        });
      }

      if (response.success) {
        toast.success("Congratulations! 🎉", "Rewards claimed successfully!");
        window.location.reload(); // Refresh page to update all data
      } else {
        setError(response.error || "Failed to claim rewards");
      }
    } catch (err: any) {
      console.error("Claim error:", err);
      setError(err.response?.data?.error || err.message || "Failed to claim rewards");
      toast.error("Claim Failed", "Unable to claim rewards. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeRoom = async () => {
    if (!roomId) {
      setError("Room ID not found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await roomAPI.finalizeRoom(roomId);

      if (response.success) {
        toast.success("Room Finalized!", "Page will refresh shortly...");
        // Refresh the page to get updated room status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(response.error || "Failed to finalize room");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Finalize error:", err);
      setError(err.response?.data?.error || err.message || "Failed to finalize room");
      toast.error("Finalize Failed", "Unable to finalize room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header with Mascot */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              {/* Back Button */}
              <button
                onClick={() => router.push("/dashboard")}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/20"
              >
                <HiArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1
                  className="text-white text-2xl font-bold tracking-wider"
                  style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                >
                  {room.name}
                </h1>
                <p className="text-white/60 text-sm font-mono mt-1">#{roomId?.slice(0, 10)}...{roomId?.slice(-6)}</p>
              </div>
              {room.isPrivate && (
                <span className="text-sm px-3 py-1.5 rounded-full bg-[#F0E6D0] text-[#6B4F0F] font-bold border-2 border-[#C9A86C] flex items-center gap-1">
                  <HiLockClosed className="w-4 h-4" /> Private
                </span>
              )}
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 flex items-center gap-1 ${room.currentPeriod >= room.totalPeriods
                  ? "bg-[#E8F4E8] text-[#2D5A2D] border-[#9BC49B]"
                  : room.status === "active"
                    ? "bg-[#E8F4E8] text-[#2D5A2D] border-[#9BC49B]"
                    : room.status === "pending"
                      ? "bg-[#FFF8E6] text-[#8B6914] border-[#D4A84B]"
                      : "bg-[#F0F0F0] text-[#606060] border-[#A0A0A0]"
                  }`}
              >
                {room.currentPeriod >= room.totalPeriods
                  ? <><FaCheckCircle className="w-3 h-3" /> Completed</>
                  : room.status === "active"
                    ? <><HiSparkles className="w-3 h-3" /> Active</>
                    : room.status === "pending"
                      ? <><HiClock className="w-3 h-3" /> Pending</>
                      : <><FaTrophy className="w-3 h-3" /> Finished</>}
              </span>
            </div>
            <p className="text-white/80 flex items-center gap-2">
              <span className="font-semibold">{room.strategy} Strategy</span>
              <span>•</span>
              <span className="font-mono text-sm">{room.creator?.slice(0, 8)}...{room.creator?.slice(-6)}</span>
            </p>
            {user?.address && (
              <div className="mt-3 flex items-center gap-4">
                <div className="bg-gradient-to-r from-[#FFB347]/30 to-[#E89530]/30 px-4 py-2 rounded-xl border-2 border-white/20">
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <FaWallet className="w-4 h-4" /> {usdcBalance} USDC
                  </span>
                </div>
                <button
                  onClick={() => router.push("/mint")}
                  className="text-xs text-white/80 hover:text-white underline font-semibold flex items-center gap-1"
                >
                  Get more USDC <HiArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="animate-float">
            <Image
              src="/mascotsemut.png"
              alt="Ant Mascot"
              width={100}
              height={100}
              className="drop-shadow-lg"
            />
            <style jsx>{`
              @keyframes float {
                0%, 100% {
                  transform: translateY(0) rotate(-5deg);
                }
                50% {
                  transform: translateY(-10px) rotate(5deg);
                }
              }
              .animate-float {
                animation: float 3s ease-in-out infinite;
              }
            `}</style>
          </div>
        </div>
        {/* Error Alert - Show at top if there's an API error */}
        {error && !roomData && (
          <div className="mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 border-3 border-yellow-400 rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-yellow-900 mb-2 text-lg flex items-center gap-2">
              <HiExclamationCircle className="w-6 h-6 text-yellow-700" />
              Unable to Load Room Data
            </h3>
            <p className="text-yellow-800 text-sm mb-3">{error}</p>
            <div className="bg-yellow-50 rounded-xl p-3 border-2 border-yellow-300">
              <p className="text-xs text-yellow-700 mb-1">
                Room ID: <code className="bg-yellow-200 px-2 py-1 rounded font-mono">{roomId}</code>
              </p>
              <p className="text-xs text-yellow-700 flex items-start gap-2 mt-2">
                <HiLightBulb className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <span>Tip: Make sure the room has been created on the blockchain first. Using mock data for now.</span>
              </p>
            </div>
          </div>
        )}

        {/* Test Mode Banner */}
        {periodInfo?.isTestMode && (
          <div className="mb-6 bg-gradient-to-r from-orange-100 to-red-100 border-3 border-orange-400 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <HiBeaker className="w-10 h-10 text-orange-600" />
              <div>
                <span className="text-orange-900 font-bold text-lg">TEST MODE</span>
                <p className="text-sm text-orange-800 mt-1">
                  Each period is 1 minute (instead of 1 week) for testing purposes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-slate-600/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="text-xs text-amber-400 font-semibold mb-2 uppercase tracking-wide flex items-center gap-1"><FaChartLine className="w-3 h-3" /> Progress</div>
            <div className="text-2xl font-bold text-white mb-3">
              {room.currentPeriod >= room.totalPeriods ? (
                <span className="text-green-400 flex items-center gap-1"><HiCheckCircle className="w-5 h-5" /> Completed</span>
              ) : (
                <>
                  {(() => {
                    if (periodInfo?.isTestMode) return 'Period';
                    // Check if daily (1 day = 86,400,000 ms) or weekly (7 days = 604,800,000 ms)
                    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                    const isDaily = periodInfo?.periodLengthMs && periodInfo.periodLengthMs <= ONE_DAY_MS * 2; // Allow some tolerance
                    return isDaily ? 'Day' : 'Week';
                  })()} {room.currentPeriod}/{room.totalPeriods}
                </>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 relative shadow-sm ${room.currentPeriod >= room.totalPeriods
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : 'bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500'
                  }`}
                style={{ width: `${Math.min(100, (room.currentPeriod / room.totalPeriods) * 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
            {periodInfo && room.currentPeriod < room.totalPeriods && (
              <div className="mt-3 text-xs text-slate-300">
                Next {(() => {
                  if (periodInfo.isTestMode) return 'period';
                  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                  const isDaily = periodInfo.periodLengthMs <= ONE_DAY_MS * 2;
                  return isDaily ? 'day' : 'week';
                })()} in:{' '}
                <span className={`font-bold ${periodInfo.timeUntilNextPeriod <= 10 ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                  {formatCountdown(periodInfo.timeUntilNextPeriod)}
                </span>
              </div>
            )}
            {room.currentPeriod >= room.totalPeriods && (
              <div className="mt-3 text-xs text-green-400 font-bold flex items-center gap-1">
                <HiSparkles className="w-4 h-4" /> All {room.totalPeriods} periods completed!
              </div>
            )}
          </div>

          {/* Total Pool Card */}
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-6 border-2 border-emerald-500/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="text-xs text-emerald-300 font-semibold mb-2 uppercase tracking-wide flex items-center gap-1"><RiCoinsFill className="w-3 h-3" /> Total Pool</div>
            <div className="text-2xl font-bold text-white">
              ${participants.reduce((sum, p) => sum + p.totalDeposit, 0).toFixed(2)}
            </div>
          </div>

          {/* Live Reward Pool Card */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 border-2 border-amber-400/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="text-xs text-amber-200 font-semibold mb-2 uppercase tracking-wide flex items-center gap-1"><FaTrophy className="w-3 h-3" /> Live Reward</div>
            <div className="text-2xl font-bold text-white">
              {roomData?.status === 'active' && room.totalDeposit > 0 ? (
                <LiveYieldDisplay
                  totalPool={room.totalDeposit || 0}
                  strategy={room.strategy}
                  startTime={new Date(room.startTimeMs || getStableStartTime(roomId))}
                  realizedYield={room.rewardPool || 0}
                  storageKey={roomId}
                />
              ) : (
                <span>${(room.rewardPool || 0).toFixed(2)}</span>
              )}
            </div>
            <div className="text-xs text-amber-200/70 mt-1">Accruing at {getApyFromStrategy(room.strategy) * 100}% APY</div>
          </div>

          {/* Participants Card */}
          <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-2xl p-6 border-2 border-purple-500/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="text-xs text-purple-300 font-semibold mb-2 uppercase tracking-wide flex items-center gap-1"><HiUserGroup className="w-3 h-3" /> Participants</div>
            <div className="text-2xl font-bold text-white">{participants.length}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Deposit & Actions */}
          <div className="md:col-span-1 space-y-4">
            {error && (
              <div className="bg-[#FDF2F2] border-3 border-[#E5A0A0] rounded-xl p-4 shadow-lg">
                <div className="flex items-start gap-2">
                  <HiExclamationCircle className="w-6 h-6 text-[#8B3030] flex-shrink-0" />
                  <p className="text-[#8B3030] text-sm font-medium flex-1">{error}</p>
                </div>
              </div>
            )}

            {/* Join Room Button - Show if not joined yet */}
            {room.status === "active" && !isJoined && (() => {
              const userBalance = parseFloat(usdcBalance) || 0;
              const requiredAmount = room.weeklyTarget || 10;
              const hasEnoughBalance = userBalance >= requiredAmount;
              const roomAlreadyStarted = room.currentPeriod > 0;

              return (
                <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
                  <div className="mb-4">
                    <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                      <FaUserPlus className="w-6 h-6 text-[#D4A84B]" />
                      Join This Room
                    </h3>
                    <p className="text-sm text-[#6B4F0F] mt-1">
                      {room.isPrivate ? <><HiLockClosed className="inline w-4 h-4" /> Private Room - Password Required</> : "Join to start saving and compete with others"}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Room Already Started Warning */}
                    {roomAlreadyStarted ? (
                      <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 rounded-xl p-4">
                        <p className="text-sm text-orange-900 font-bold flex items-center gap-2">
                          <HiClock className="w-5 h-5" />
                          Room Already Started
                        </p>
                        <p className="text-xs text-orange-700 mt-2">
                          This room is currently in Period {room.currentPeriod}. You can only join rooms during Period 0.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#F0E6D0] border-2 border-[#C9A86C]/60 rounded-xl p-4">
                        <p className="text-sm text-[#4A3000] font-semibold flex items-center gap-2">
                          <HiLightBulb className="w-5 h-5 text-[#D4A84B]" />
                          Joining requires an initial deposit of <strong>${requiredAmount}</strong>
                        </p>
                      </div>
                    )}

                    {/* Balance Check Warning - only show if room hasn't started */}
                    {!roomAlreadyStarted && !hasEnoughBalance && (
                      <div className="bg-[#FDF2F2] border-2 border-[#E5A0A0] rounded-xl p-4">
                        <p className="text-sm text-[#8B3030] font-bold flex items-center gap-2">
                          <HiExclamationCircle className="w-5 h-5" />
                          Insufficient Balance
                        </p>
                        <p className="text-xs text-[#A04040] mt-2">
                          You need at least <strong>${requiredAmount}</strong> USDC but only have <strong>${usdcBalance}</strong>
                        </p>
                      </div>
                    )}

                    {/* Password input for private rooms - only show if room hasn't started */}
                    {!roomAlreadyStarted && room.isPrivate && (
                      <div>
                        <label className="text-sm font-semibold text-[#4A3000] mb-2 flex items-center gap-1"><HiKey className="w-4 h-4" /> Room Password</label>
                        <input
                          type="password"
                          placeholder="Enter room password"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-[#FBF7EC] border-2 border-[#D4A84B]/40 rounded-xl text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleJoinRoom}
                      disabled={loading || roomAlreadyStarted || !hasEnoughBalance || (room.isPrivate && !roomPassword)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
                    >
                      {roomAlreadyStarted
                        ? <><HiBan className="inline w-5 h-5" /> Room Already Started</>
                        : loading
                          ? (
                            <span className="flex items-center justify-center gap-2">
                              <LottieSpinner size={24} />
                              Joining...
                            </span>
                          )
                          : <><FaUserPlus className="inline w-5 h-5 mr-1" /> Join Room + Deposit ${requiredAmount}</>
                      }
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs text-[#6B4F0F] flex items-center gap-1">
                        <FaBolt className="w-3 h-3" />
                        <span>Gasless transaction powered by zkLogin</span>
                      </p>
                      <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                        <FaWallet className="w-3 h-3" />
                        <span>Your balance: <strong>${usdcBalance} USDC</strong></span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Room Completed Card - Show when all periods are done (active or finished status) */}
            {isJoined && room.currentPeriod >= room.totalPeriods && (room.status === "active" || room.status === "finished") && (
              <div className="bg-gradient-to-br from-[#E8F4E8] to-[#D8E8D8] rounded-2xl p-6 border-3 border-[#9BC49B] shadow-xl">
                <div className="mb-4">
                  <h3 className="text-[#2D5A2D] font-bold text-lg flex items-center gap-2">
                    <FaGift className="w-6 h-6 text-green-600" />
                    Room Completed!
                  </h3>
                  <p className="text-sm text-[#3D6A3D] mt-1">All {room.totalPeriods} periods have been completed</p>
                </div>
                <div className="space-y-4">
                  {hasClaimed ? (
                    <div className="bg-[#F0F8F0] border-2 border-[#9BC49B] rounded-xl p-5 text-center">
                      <p className="text-[#2D5A2D] font-bold text-lg flex items-center justify-center gap-2">
                        <FaCheckCircle className="w-6 h-6 text-green-600" />
                        Rewards Claimed!
                      </p>
                      <p className="text-sm text-[#3D6A3D] mt-2">
                        You have successfully claimed your principal and rewards.
                      </p>
                    </div>
                  ) : room.status === "finished" ? (
                    // Room is finalized, show claim button only
                    <>
                      <div className="bg-[#F8F4EC] border-2 border-[#C9A86C]/50 rounded-xl p-4">
                        <p className="text-sm text-[#4A3000] mb-2 font-semibold">
                          <strong>Congratulations!</strong> You have completed this saving room.
                        </p>
                        <p className="text-xs text-[#6B4F0F]">
                          <HiCheckCircle className="inline w-4 h-4 text-green-600 mr-1" /> Room has been finalized. You can now claim your rewards!
                        </p>
                      </div>

                      <button
                        onClick={handleClaimReward}
                        disabled={loading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <LottieSpinner size={24} />
                            Processing...
                          </span>
                        ) : <><FaGift className="inline w-5 h-5 mr-1" /> Claim Rewards</>}
                      </button>
                    </>
                  ) : !showFinalizeButton ? (
                    // Waiting for 3 second delay before showing finalize button
                    <div className="bg-[#F0E6D0] border-2 border-[#C9A86C]/60 rounded-xl p-5 text-center">
                      <LottieLoading size="sm" />
                      <p className="text-[#4A3000] font-bold mt-2">Please wait...</p>
                      <p className="text-sm text-[#6B4F0F] mt-2">
                        Preparing finalize option...
                      </p>
                    </div>
                  ) : (
                    // Room not finalized yet, show manual finalize button
                    <>
                      <div className="bg-[#F8F4EC] border-2 border-[#C9A86C]/50 rounded-xl p-4">
                        <p className="text-sm text-[#4A3000] mb-2 font-semibold">
                          <strong>Congratulations!</strong> You have completed this saving room.
                        </p>
                        <p className="text-xs text-[#6B4F0F]">
                          Click the button below to finalize and claim your rewards.
                        </p>
                      </div>

                      {error && (
                        <div className="bg-[#FDF2F2] border-2 border-[#E5A0A0] rounded-xl p-3">
                          <p className="text-xs text-[#8B3030] font-semibold flex items-center gap-2">
                            <HiExclamationCircle className="w-4 h-4" />
                            {error}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleFinalizeRoom}
                        disabled={loading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <LottieSpinner size={24} />
                            Finalizing...
                          </span>
                        ) : <><HiRefresh className="inline w-5 h-5 mr-1" /> Finalize Room</>}
                      </button>

                      <p className="text-xs text-green-700 text-center font-medium">
                        After finalizing, the claim button will appear
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Deposit Card - Show only if joined AND periods not completed */}
            {room.status === "active" && isJoined && room.currentPeriod < room.totalPeriods && (
              <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
                <div className="mb-4">
                  <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                    <FaCoins className="w-6 h-6 text-[#D4A84B]" />
                    Make Deposit
                  </h3>
                  <p className="text-sm text-[#6B4F0F] mt-1">
                    {periodInfo?.isTestMode ? 'Period' : 'Weekly'} target: <strong>${room.weeklyTarget}</strong>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#E8F4E8] border-2 border-[#9BC49B] rounded-xl p-3">
                    <p className="text-xs text-[#2D5A2D] font-semibold flex items-center gap-2">
                      <HiCheckCircle className="w-4 h-4" />
                      You have joined this room
                    </p>
                  </div>

                  {/* Period Info */}
                  {periodInfo && (
                    <div className={`border-2 rounded-xl p-4 ${periodInfo.isTestMode
                      ? 'bg-[#FFF4E6] border-[#D4A84B]/60'
                      : 'bg-[#F0E6D0] border-[#C9A86C]/60'
                      }`}>
                      <div className="text-sm font-bold mb-2 text-[#4A3000]">
                        Current {periodInfo.isTestMode ? 'Period' : 'Week'}: {periodInfo.currentPeriod}
                      </div>
                      <div className="text-xs text-[#6B4F0F]">
                        Next {periodInfo.isTestMode ? 'period' : 'week'} in:{' '}
                        <span className={`font-bold ${periodInfo.timeUntilNextPeriod <= 10 ? 'text-[#2D5A2D] animate-pulse' : 'text-[#4A3000]'}`}>
                          {formatCountdown(periodInfo.timeUntilNextPeriod)}
                        </span>
                      </div>
                      {periodInfo.isTestMode && (
                        <div className="text-xs text-[#8B6914] mt-2 font-semibold flex items-center gap-1">
                          <HiBeaker className="w-4 h-4" />
                          Test mode: 1 min periods
                        </div>
                      )}
                    </div>
                  )}

                  {/* Already Deposited Message */}
                  {hasDepositedThisPeriod ? (
                    <div className="bg-[#E8F4E8] border-2 border-[#9BC49B] rounded-xl p-5 text-center">
                      <p className="text-[#2D5A2D] font-bold text-lg flex items-center justify-center gap-2">
                        <FaCheckCircle className="w-6 h-6 text-green-600" />
                        Deposit Complete!
                      </p>
                      <p className="text-sm text-[#3D6A3D] mt-2">
                        You have already deposited for {periodInfo?.isTestMode ? 'Period' : 'Week'} {periodInfo?.currentPeriod || 0}
                      </p>
                      <p className="text-xs text-[#4D7A4D] mt-3 font-semibold">
                        Next deposit available in: <span className="font-bold">{formatCountdown(periodInfo?.timeUntilNextPeriod || 0)}</span>
                      </p>
                    </div>
                  ) : (() => {
                    const userBalance = parseFloat(usdcBalance) || 0;
                    const requiredAmount = room.weeklyTarget || 10;
                    const hasEnoughBalance = userBalance >= requiredAmount;

                    return (
                      <>
                        <div className="bg-[#F0E6D0] border-2 border-[#C9A86C]/60 rounded-xl p-4 text-center">
                          <p className="text-sm text-[#4A3000] font-semibold">
                            Deposit amount: <span className="font-bold">${requiredAmount}</span>
                          </p>
                          <p className="text-xs text-[#6B4F0F] mt-2">
                            Your balance: <span className="font-bold">${usdcBalance} USDC</span>
                          </p>
                        </div>

                        {!hasEnoughBalance && (
                          <div className="bg-[#FDF2F2] border-2 border-[#E5A0A0] rounded-xl p-4">
                            <p className="text-sm text-[#8B3030] font-bold flex items-center gap-2">
                              <HiExclamationCircle className="w-5 h-5" />
                              Insufficient Balance
                            </p>
                            <p className="text-xs text-[#A04040] mt-2">
                              You need <strong>${requiredAmount}</strong> USDC but only have <strong>${usdcBalance}</strong>
                            </p>
                          </div>
                        )}

                        <button
                          onClick={handleDeposit}
                          disabled={loading || !hasEnoughBalance}
                          className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <LottieSpinner size={24} />
                              Processing...
                            </span>
                          ) : <><FaCoins className="inline w-5 h-5 mr-1" /> Deposit ${requiredAmount} for ${periodInfo?.isTestMode ? 'Period' : 'Week'} ${periodInfo?.currentPeriod || 0}</>}
                        </button>
                      </>
                    );
                  })()}

                  <div className="space-y-1 pt-2">
                    <p className="text-xs text-[#6B4F0F] flex items-center gap-1">
                      <FaBolt className="w-3 h-3" />
                      <span>Gasless transaction powered by zkLogin</span>
                    </p>
                    <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                      <HiCheckCircle className="w-3 h-3" />
                      <span>Your wallet is connected. USDC tokens will be used automatically</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback claim card for finished rooms when user hasn't joined via this UI */}
            {room.status === "finished" && !isJoined && (
              <div className="bg-gradient-to-br from-gray-200/60 to-gray-300/40 rounded-2xl p-6 border-3 border-gray-400 shadow-xl">
                <div className="mb-4">
                  <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                    <FaTrophy className="w-6 h-6 text-gray-500" />
                    Claim Rewards
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">Room has ended</p>
                </div>
                <div className="bg-white/80 border-2 border-gray-300 rounded-xl p-5 text-center">
                  <p className="text-gray-700 font-semibold">You did not join this room</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Only participants who joined can claim rewards
                  </p>
                </div>
              </div>
            )}

            {/* Share Room Card */}
            <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
              <div className="mb-4">
                <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                  <HiShare className="w-6 h-6 text-[#D4A84B]" />
                  Share Room
                </h3>
                <p className="text-sm text-[#6B4F0F] mt-1">Invite friends to join</p>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : `/room/${roomId}`}
                  className="flex-1 px-4 py-3 bg-[#FBF7EC] border-2 border-[#C9A86C]/40 rounded-xl text-sm text-[#4A3000] font-mono focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/room/${roomId}`
                      );
                      toast.success("Copied!", "Room link copied to clipboard");
                    }
                  }}
                  className="px-5 py-3 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Right: Details & Participants */}
          <div className="md:col-span-2">
            {/* Custom Tab System */}
            <div className="mb-4">
              <div className="flex gap-2 bg-[#FDF8EC] p-2 rounded-xl border-2 border-[#D4A84B]">
                {(['participants', 'details', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${activeTab === tab
                      ? 'bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] shadow-lg'
                      : 'bg-[#E8DCC0] text-[#6B4F0F] hover:bg-[#D4A84B]/30'
                      }`}
                  >
                    {tab === 'participants' ? <><HiUserGroup className="inline w-4 h-4 mr-1" /> Participants</> : tab === 'details' ? <><HiClipboardCopy className="inline w-4 h-4 mr-1" /> Details</> : <><RiHistoryFill className="inline w-4 h-4 mr-1" /> History</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants Tab */}
            {activeTab === 'participants' && (
              <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <FaTrophy className="w-6 h-6 text-[#D4A84B]" />
                    Leaderboard
                  </h3>
                  <p className="text-sm text-[#6B4F0F] mt-1">Ranked by consistency score ({participants.length} participants)</p>
                </div>
                <div className="space-y-3">
                  {participants && participants.length > 0 ? (
                    participants
                      .sort((a: Participant, b: Participant) => b.consistencyScore - a.consistencyScore)
                      .map((participant: Participant, index: number) => (
                        <div
                          key={participant.address}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-102 ${index === 0
                            ? 'bg-gradient-to-r from-[#F5E6C8] to-[#EDD9A8] border-[#D4A84B] shadow-lg'
                            : index === 1
                              ? 'bg-gradient-to-r from-[#E8E8E8] to-[#D8D8D8] border-[#B0B0B0]'
                              : index === 2
                                ? 'bg-gradient-to-r from-[#F0DCC8] to-[#E8D0B8] border-[#C9A86C]'
                                : 'bg-[#F8F4EC] border-[#D4A84B]/30'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white shadow-lg'
                              : index === 1 ? 'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0] text-white shadow-md'
                                : index === 2 ? 'bg-gradient-to-br from-[#CD7F32] to-[#A0522D] text-white shadow-md'
                                  : 'bg-[#E8D5A8] text-[#6B4F0F]'
                              }`}>
                              {index === 0 ? <RiVipCrownFill className="w-5 h-5" /> : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                            </div>
                            <div>
                              <div className="font-mono text-sm font-semibold text-[#4A3000]">
                                {participant.address.slice(0, 8)}...{participant.address.slice(-6)}
                              </div>
                              <div className="text-xs text-[#6B4F0F] mt-1">
                                {participant.depositsCount} deposits
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#4A3000] text-lg">${participant.totalDeposit.toFixed(2)}</div>
                            <div className="text-xs text-[#6B4F0F] font-semibold mt-1">
                              {participant.consistencyScore}% score
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-12 bg-white/60 rounded-xl border-2 border-dashed border-[#D4A84B]/40">
                      <HiUserGroup className="w-12 h-12 text-[#D4A84B]/60 mx-auto" />
                      <p className="text-[#6B4F0F] font-semibold mt-4">No participants yet</p>
                      <p className="text-sm text-[#8B6914] mt-2">Be the first to join this room!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <HiClipboardCopy className="w-6 h-6 text-[#D4A84B]" />
                    Room Details
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b-2 border-[#D4A84B]/30">
                    <span className="text-[#6B4F0F] font-semibold">Strategy</span>
                    <span className="font-bold text-[#4A3000]">{room.strategy}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-[#D4A84B]/30">
                    <span className="text-[#6B4F0F] font-semibold">Duration</span>
                    <span className="font-bold text-[#4A3000]">{room.duration} weeks</span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-[#D4A84B]/30">
                    <span className="text-[#6B4F0F] font-semibold">Weekly Target</span>
                    <span className="font-bold text-[#4A3000]">${room.weeklyTarget}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-[#D4A84B]/30">
                    <span className="text-[#6B4F0F] font-semibold">Total Goal</span>
                    <span className="font-bold text-[#4A3000]">
                      ${room.weeklyTarget * room.totalPeriods}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-[#D4A84B]/30">
                    <span className="text-[#6B4F0F] font-semibold">Contract Address</span>
                    <span className="font-mono text-sm font-bold text-[#4A3000]">0xabc...def</span>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-[#FDF8EC] rounded-2xl p-6 border-2 border-[#D4A84B] shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <RiHistoryFill className="w-6 h-6 text-[#D4A84B]" />
                    Transaction History
                  </h3>
                  <p className="text-sm text-[#6B4F0F] mt-1">{history.length} transactions</p>
                </div>
                <div className="space-y-3">
                  {history.length > 0 ? (
                    history.map((tx, index) => {
                      const USDC_DECIMALS = 1_000_000;
                      const amount = (tx.amount / USDC_DECIMALS).toFixed(2);
                      const date = new Date(tx.timestamp);
                      const timeAgo = getTimeAgo(date);

                      return (
                        <div
                          key={`${tx.txDigest}-${index}`}
                          className="flex justify-between p-4 bg-[#F8F4EC] rounded-xl border-2 border-[#D4A84B]/30 hover:shadow-lg transition-all"
                        >
                          <div>
                            <div className="font-bold flex items-center gap-2 mb-1">
                              {tx.type === 'join' ? (
                                <span className="text-[#2D5A2D] flex items-center gap-1"><FaUserPlus className="w-4 h-4" /> Joined Room</span>
                              ) : (
                                <span className="text-[#4A3000] flex items-center gap-1"><FaCoins className="w-4 h-4" /> Deposit</span>
                              )}
                            </div>
                            <div className="text-[#6B4F0F] font-mono text-xs mb-1">
                              {tx.player?.slice(0, 8)}...{tx.player?.slice(-6)}
                            </div>
                            {tx.type === 'deposit' && (
                              <div className="text-[#8B6914] text-xs font-semibold">Week {tx.period + 1}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#4A3000] text-lg">${amount}</div>
                            <div className="text-[#6B4F0F] text-xs mb-1">{timeAgo}</div>
                            <a
                              href={`https://suiscan.xyz/testnet/tx/${tx.txDigest}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#8B6914] text-xs hover:underline font-semibold"
                            >
                              View →
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-[#F8F4EC] rounded-xl border-2 border-dashed border-[#D4A84B]/40">
                      <RiHistoryFill className="w-12 h-12 text-[#D4A84B]/60 mx-auto" />
                      <p className="text-[#4A3000] font-semibold mt-4">No transactions yet</p>
                      <p className="text-sm text-[#6B4F0F] mt-2">Join this room to start!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout >
  );
}
