"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { roomAPI, usdcAPI, playerAPI, executeSponsoredTransaction, getSponsorAddress } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { getCoinsForAmount } from "@/lib/sui-utils";
import { DEFAULT_COIN_TYPE, MIN_BALANCE_USDC, SUI_CLOCK_ID } from "@/lib/constants";
import { buildJoinRoomTx, buildDepositTx, buildClaimTx } from "@/lib/tx-builder";
import { buildSponsoredTx } from "@/lib/zklogin-tx";
import { LottieLoading, LottieSpinner } from "@/components/ui/LottieLoading";

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
  const { user } = useAuthStore();

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
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const fetchHistory = async () => {
    if (!roomId) return;
    try {
      const response = await roomAPI.getHistory(roomId);
      if (response.success && response.history) {
        setHistory(response.history);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchUSDCBalance = async () => {
    if (!user?.address) return;
    try {
      const data = await usdcAPI.getBalance(user.address);
      setUsdcBalance(data.balanceFormatted || "0.00");
    } catch (error) {
      console.error('Failed to fetch USDC balance:', error);
      setUsdcBalance("0.00");
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
          totalDeposit: 0, // TODO: Get from blockchain
          rewardPool: 0, // TODO: Get from blockchain
          strategy: blockchainData.strategy_id === 0 ? "Stable" : blockchainData.strategy_id === 1 ? "Growth" : "Aggressive",
          status: roomStatus,
          participants: [], // TODO: Query from blockchain
          isPrivate: blockchainData.is_private || false,
        };

        setRoomData(transformedRoom);
        setError(""); // Clear any previous errors
      }
    } catch (err: any) {
      console.error("Failed to fetch room data:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to fetch room data";
      const hint = err.response?.data?.hint || "";
      setError(`${errorMsg}${hint ? ` - ${hint}` : ''}`);
      // Use mock data as fallback
    }
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

      // Sign with ephemeral keypair and get txBytes + signature
      console.log("Building and signing transaction...");
      const { txBytes, userSignature } = await buildSponsoredTx(tx, user.address);
      console.log("Transaction signed by user");

      // Send to backend for sponsor signature and execution
      console.log("Sending to backend for execution...");
      const response = await executeSponsoredTransaction(txBytes, userSignature);

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
          alert("Successfully joined the room!");
          fetchRoomData(); // Refresh room data
          fetchParticipants(); // Refresh participants
        } else {
          setError("Room joined but could not extract player position ID");
        }
      } else {
        setError(response.error || "Failed to join room");
      }
    } catch (err: any) {
      console.error("Join room error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to join room";
      setError(errorMsg);
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

      // Sign with ephemeral keypair
      console.log("Building and signing deposit transaction...");
      const { txBytes, userSignature } = await buildSponsoredTx(tx, user.address);
      console.log("Deposit transaction signed by user");

      // Send to backend for sponsor signature and execution
      console.log("Sending deposit to backend for execution...");
      const response = await executeSponsoredTransaction(txBytes, userSignature);

      if (response.success) {
        alert("Deposit successful!");
        window.location.reload(); // Refresh page to update all data
      } else {
        setError(response.error || "Failed to deposit");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to deposit";
      setError(errorMsg);
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

      // 3. Build sponsored transaction with user as sender
      const { txBytes, userSignature } = await buildSponsoredTx(
        claimTx,
        user.address,
        sponsorAddress
      );

      // 4. Send to backend for sponsor co-signature and execution
      const response = await roomAPI.claimReward({
        txBytes,
        userSignature,
      });

      if (response.success) {
        alert("Rewards claimed successfully!");
        window.location.reload(); // Refresh page to update all data
      } else {
        setError(response.error || "Failed to claim rewards");
      }
    } catch (err: any) {
      console.error("Claim error:", err);
      setError(err.response?.data?.error || err.message || "Failed to claim rewards");
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
        alert("Room finalized successfully! Page will refresh...");
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
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header with Mascot */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1
                className="text-[#4A3000] text-3xl font-bold tracking-wider"
                style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
              >
                {room.name}
              </h1>
              {room.isPrivate && (
                <span className="text-sm px-3 py-1.5 rounded-full bg-[#F0E6D0] text-[#6B4F0F] font-bold border-2 border-[#C9A86C]">
                  🔒 Private
                </span>
              )}
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 ${
                  room.currentPeriod >= room.totalPeriods
                    ? "bg-[#E8F4E8] text-[#2D5A2D] border-[#9BC49B]"
                    : room.status === "active"
                    ? "bg-[#E8F4E8] text-[#2D5A2D] border-[#9BC49B]"
                    : room.status === "pending"
                    ? "bg-[#FFF8E6] text-[#8B6914] border-[#D4A84B]"
                    : "bg-[#F0F0F0] text-[#606060] border-[#A0A0A0]"
                }`}
              >
                {room.currentPeriod >= room.totalPeriods
                  ? "✓ Completed"
                  : room.status === "active"
                  ? "⚡ Active"
                  : room.status === "pending"
                  ? "⏳ Pending"
                  : "🏁 Finished"}
              </span>
            </div>
            <p className="text-[#6B4F0F] flex items-center gap-2">
              <span className="font-semibold">{room.strategy} Strategy</span>
              <span>•</span>
              <span className="font-mono text-sm">{room.creator?.slice(0, 8)}...{room.creator?.slice(-6)}</span>
            </p>
            {user?.address && (
              <div className="mt-3 flex items-center gap-4">
                <div className="bg-gradient-to-r from-[#FFB347]/20 to-[#E89530]/20 px-4 py-2 rounded-xl border-2 border-[#D4A84B]/40">
                  <span className="text-sm font-bold text-[#4A3000]">
                    💰 {usdcBalance} USDC
                  </span>
                </div>
                <button
                  onClick={() => router.push("/mint")}
                  className="text-xs text-[#8B6914] hover:text-[#6B4F0F] underline font-semibold"
                >
                  Get more USDC →
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
              <span className="text-2xl">⚠️</span>
              Unable to Load Room Data
            </h3>
            <p className="text-yellow-800 text-sm mb-3">{error}</p>
            <div className="bg-yellow-50 rounded-xl p-3 border-2 border-yellow-300">
              <p className="text-xs text-yellow-700 mb-1">
                Room ID: <code className="bg-yellow-200 px-2 py-1 rounded font-mono">{roomId}</code>
              </p>
              <p className="text-xs text-yellow-700 flex items-start gap-2 mt-2">
                <span>💡</span>
                <span>Tip: Make sure the room has been created on the blockchain first. Using mock data for now.</span>
              </p>
            </div>
          </div>
        )}

        {/* Test Mode Banner */}
        {periodInfo?.isTestMode && (
          <div className="mb-6 bg-gradient-to-r from-orange-100 to-red-100 border-3 border-orange-400 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧪</span>
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
          <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-lg hover:shadow-xl transition-all">
            <div className="text-xs text-[#6B4F0F] font-semibold mb-2 uppercase tracking-wide">📊 Progress</div>
            <div className="text-2xl font-bold text-[#4A3000] mb-3">
              {room.currentPeriod >= room.totalPeriods ? (
                <span className="text-green-700">✓ Completed</span>
              ) : (
                <>{periodInfo?.isTestMode ? 'Period' : 'Week'} {room.currentPeriod}/{room.totalPeriods}</>
              )}
            </div>
            <div className="w-full bg-[#8B6914]/20 rounded-full h-3 overflow-hidden border border-[#8B6914]/30">
              <div
                className={`h-3 rounded-full transition-all ${
                  room.currentPeriod >= room.totalPeriods
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-[#FFB347] to-[#E89530]'
                }`}
                style={{ width: `${Math.min(100, (room.currentPeriod / room.totalPeriods) * 100)}%` }}
              />
            </div>
            {periodInfo && room.currentPeriod < room.totalPeriods && (
              <div className="mt-3 text-xs text-[#6B4F0F]">
                Next {periodInfo.isTestMode ? 'period' : 'week'} in:{' '}
                <span className={`font-bold ${periodInfo.timeUntilNextPeriod <= 10 ? 'text-green-600 animate-pulse' : 'text-[#4A3000]'}`}>
                  {formatCountdown(periodInfo.timeUntilNextPeriod)}
                </span>
              </div>
            )}
            {room.currentPeriod >= room.totalPeriods && (
              <div className="mt-3 text-xs text-green-700 font-bold">
                🎉 All {room.totalPeriods} periods completed!
              </div>
            )}
          </div>

          {/* Total Pool Card */}
          <div className="bg-gradient-to-br from-[#D4A84B]/20 to-[#8B6914]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-lg hover:shadow-xl transition-all">
            <div className="text-xs text-[#6B4F0F] font-semibold mb-2 uppercase tracking-wide">💎 Total Pool</div>
            <div className="text-2xl font-bold text-[#4A3000]">
              ${participants.reduce((sum, p) => sum + p.totalDeposit, 0).toFixed(2)}
            </div>
          </div>

          {/* Reward Pool Card */}
          <div className="bg-gradient-to-br from-[#E8DCC0] to-[#D4C4A0] rounded-2xl p-6 border-3 border-[#C9A86C]/60 shadow-lg hover:shadow-xl transition-all">
            <div className="text-xs text-[#6B4F0F] font-semibold mb-2 uppercase tracking-wide">🏆 Reward Pool</div>
            <div className="text-2xl font-bold text-[#4A3000]">${room.rewardPool}</div>
          </div>

          {/* Participants Card */}
          <div className="bg-gradient-to-br from-[#F0E6D0] to-[#E0D4B8] rounded-2xl p-6 border-3 border-[#C9A86C]/50 shadow-lg hover:shadow-xl transition-all">
            <div className="text-xs text-[#6B4F0F] font-semibold mb-2 uppercase tracking-wide">👥 Participants</div>
            <div className="text-2xl font-bold text-[#4A3000]">{participants.length}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Deposit & Actions */}
          <div className="md:col-span-1 space-y-4">
            {error && (
              <div className="bg-[#FDF2F2] border-3 border-[#E5A0A0] rounded-xl p-4 shadow-lg">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">❌</span>
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
                <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-xl">
                  <div className="mb-4">
                    <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                      <span className="text-2xl">🚪</span>
                      Join This Room
                    </h3>
                    <p className="text-sm text-[#6B4F0F] mt-1">
                      {room.isPrivate ? "🔒 Private Room - Password Required" : "Join to start saving and compete with others"}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Room Already Started Warning */}
                    {roomAlreadyStarted ? (
                      <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 rounded-xl p-4">
                        <p className="text-sm text-orange-900 font-bold flex items-center gap-2">
                          <span>⏰</span>
                          Room Already Started
                        </p>
                        <p className="text-xs text-orange-700 mt-2">
                          This room is currently in Period {room.currentPeriod}. You can only join rooms during Period 0.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#F0E6D0] border-2 border-[#C9A86C]/60 rounded-xl p-4">
                        <p className="text-sm text-[#4A3000] font-semibold flex items-center gap-2">
                          <span>💡</span>
                          Joining requires an initial deposit of <strong>${requiredAmount}</strong>
                        </p>
                      </div>
                    )}

                    {/* Balance Check Warning - only show if room hasn't started */}
                    {!roomAlreadyStarted && !hasEnoughBalance && (
                      <div className="bg-[#FDF2F2] border-2 border-[#E5A0A0] rounded-xl p-4">
                        <p className="text-sm text-[#8B3030] font-bold flex items-center gap-2">
                          <span>⚠️</span>
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
                        <label className="text-sm font-semibold text-[#4A3000] mb-2 block">🔑 Room Password</label>
                        <input
                          type="password"
                          placeholder="Enter room password"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-white border-2 border-[#D4A84B]/40 rounded-xl text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleJoinRoom}
                      disabled={loading || roomAlreadyStarted || !hasEnoughBalance || (room.isPrivate && !roomPassword)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
                    >
                      {roomAlreadyStarted
                        ? "🚫 Room Already Started"
                        : loading
                          ? (
                            <span className="flex items-center justify-center gap-2">
                              <LottieSpinner size={24} />
                              Joining...
                            </span>
                          )
                          : `🚀 Join Room + Deposit $${requiredAmount}`
                      }
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs text-[#6B4F0F] flex items-center gap-1">
                        <span>⚡</span>
                        <span>Gasless transaction powered by zkLogin</span>
                      </p>
                      <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                        <span>💰</span>
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
                    <span className="text-2xl">🎉</span>
                    Room Completed!
                  </h3>
                  <p className="text-sm text-[#3D6A3D] mt-1">All {room.totalPeriods} periods have been completed</p>
                </div>
                <div className="space-y-4">
                  {hasClaimed ? (
                    <div className="bg-[#F0F8F0] border-2 border-[#9BC49B] rounded-xl p-5 text-center">
                      <p className="text-[#2D5A2D] font-bold text-lg flex items-center justify-center gap-2">
                        <span className="text-2xl">✅</span>
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
                          ✅ Room has been finalized. You can now claim your rewards!
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
                        ) : "💰 Claim Rewards"}
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
                            <span>⚠️</span>
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
                        ) : "🔧 Finalize Room"}
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
              <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-xl">
                <div className="mb-4">
                  <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    Make Deposit
                  </h3>
                  <p className="text-sm text-[#6B4F0F] mt-1">
                    {periodInfo?.isTestMode ? 'Period' : 'Weekly'} target: <strong>${room.weeklyTarget}</strong>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#E8F4E8] border-2 border-[#9BC49B] rounded-xl p-3">
                    <p className="text-xs text-[#2D5A2D] font-semibold flex items-center gap-2">
                      <span>✓</span>
                      You have joined this room
                    </p>
                  </div>

                  {/* Period Info */}
                  {periodInfo && (
                    <div className={`border-2 rounded-xl p-4 ${
                      periodInfo.isTestMode
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
                          <span>🧪</span>
                          Test mode: 1 min periods
                        </div>
                      )}
                    </div>
                  )}

                  {/* Already Deposited Message */}
                  {hasDepositedThisPeriod ? (
                    <div className="bg-[#E8F4E8] border-2 border-[#9BC49B] rounded-xl p-5 text-center">
                      <p className="text-[#2D5A2D] font-bold text-lg flex items-center justify-center gap-2">
                        <span className="text-2xl">✅</span>
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
                              <span>⚠️</span>
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
                          ) : `💰 Deposit $${requiredAmount} for ${periodInfo?.isTestMode ? 'Period' : 'Week'} ${periodInfo?.currentPeriod || 0}`}
                        </button>
                      </>
                    );
                  })()}

                  <div className="space-y-1 pt-2">
                    <p className="text-xs text-[#6B4F0F] flex items-center gap-1">
                      <span>⚡</span>
                      <span>Gasless transaction powered by zkLogin</span>
                    </p>
                    <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                      <span>✓</span>
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
                    <span className="text-2xl">🏁</span>
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
            <div className="bg-gradient-to-br from-[#F0E6D0] to-[#E8DCC0] rounded-2xl p-6 border-3 border-[#C9A86C]/50 shadow-xl">
              <div className="mb-4">
                <h3 className="text-[#4A3000] font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">📤</span>
                  Share Room
                </h3>
                <p className="text-sm text-[#6B4F0F] mt-1">Invite friends to join</p>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : `/room/${roomId}`}
                  className="flex-1 px-4 py-3 bg-white border-2 border-[#C9A86C]/40 rounded-xl text-sm text-[#4A3000] font-mono focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/room/${roomId}`
                      );
                      alert("Link copied!");
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
              <div className="flex gap-2 bg-[#8B6914]/10 p-2 rounded-xl border-2 border-[#8B6914]/30">
                {['participants', 'details', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      const content = document.querySelectorAll('[data-tab-content]');
                      content.forEach(c => c.classList.add('hidden'));
                      document.querySelector(`[data-tab-content="${tab}"]`)?.classList.remove('hidden');

                      const buttons = document.querySelectorAll('[data-tab-button]');
                      buttons.forEach(b => b.classList.remove('active-tab'));
                      document.querySelector(`[data-tab-button="${tab}"]`)?.classList.add('active-tab');
                    }}
                    data-tab-button={tab}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                      tab === 'participants'
                        ? 'bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] shadow-lg active-tab'
                        : 'bg-[#8B6914]/20 text-[#6B4F0F] hover:bg-[#8B6914]/30'
                    }`}
                  >
                    {tab === 'participants' ? '👥 Participants' : tab === 'details' ? '📋 Details' : '📜 History'}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants Tab */}
            <div data-tab-content="participants">
              <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
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
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-102 ${
                            index === 0
                              ? 'bg-gradient-to-r from-[#F5E6C8] to-[#EDD9A8] border-[#D4A84B] shadow-lg'
                              : index === 1
                              ? 'bg-gradient-to-r from-[#E8E8E8] to-[#D8D8D8] border-[#B0B0B0]'
                              : index === 2
                              ? 'bg-gradient-to-r from-[#F0DCC8] to-[#E8D0B8] border-[#C9A86C]'
                              : 'bg-[#F8F4EC] border-[#D4A84B]/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`font-bold text-2xl ${
                              index === 0 ? 'text-[#8B6914]' : index === 1 ? 'text-[#707070]' : index === 2 ? 'text-[#A07030]' : 'text-[#6B4F0F]'
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
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
                      <span className="text-5xl">🐜</span>
                      <p className="text-[#6B4F0F] font-semibold mt-4">No participants yet</p>
                      <p className="text-sm text-[#8B6914] mt-2">Be the first to join this room!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Tab */}
            <div data-tab-content="details" className="hidden">
              <div className="bg-gradient-to-br from-[#D4A84B]/20 to-[#8B6914]/10 rounded-2xl p-6 border-3 border-[#D4A84B]/40 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <span className="text-2xl">📋</span>
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
            </div>

            {/* History Tab */}
            <div data-tab-content="history" className="hidden">
              <div className="bg-gradient-to-br from-[#F0E6D0] to-[#E8DCC0] rounded-2xl p-6 border-3 border-[#C9A86C]/50 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-[#4A3000] font-bold text-xl flex items-center gap-2">
                    <span className="text-2xl">📜</span>
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
                                <span className="text-[#2D5A2D]">🎉 Joined Room</span>
                              ) : (
                                <span className="text-[#4A3000]">💰 Deposit</span>
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
                      <span className="text-5xl">📭</span>
                      <p className="text-[#4A3000] font-semibold mt-4">No transactions yet</p>
                      <p className="text-sm text-[#6B4F0F] mt-2">Join this room to start!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
