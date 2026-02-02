"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roomAPI, usdcAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { getAvailableCoin } from "@/lib/sui-utils";
import { DEFAULT_COIN_TYPE, MIN_BALANCE_USDC, SUI_CLOCK_ID } from "@/lib/constants";

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

  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [roomData, setRoomData] = useState<any>(null);
  const [playerPositionId, setPlayerPositionId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");

  // Fetch room data on mount and check if user already joined
  useEffect(() => {
    if (roomId) {
      fetchRoomData();
      // Check if user already joined this room
      const storedPositionId = localStorage.getItem(`playerPosition_${roomId}`);
      if (storedPositionId) {
        setPlayerPositionId(storedPositionId);
        setIsJoined(true);
      }
    }
    if (user?.address) {
      fetchUSDCBalance();
    }
  }, [roomId, user]);

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

        // Transform blockchain data to frontend format
        const transformedRoom = {
          id: roomId,
          name: `Room #${roomId.slice(0, 8)}`,
          creator: response.room.objectId || "Unknown",
          vaultId: response.room.vaultId || null, // ✓ Store vaultId from database
          duration: 12, // TODO: Get from blockchain
          weeklyTarget: 100, // TODO: Get from blockchain
          currentPeriod: 0, // TODO: Get from blockchain
          totalPeriods: 12, // TODO: Get from blockchain
          totalDeposit: 0, // TODO: Get from blockchain
          rewardPool: 0, // TODO: Get from blockchain
          strategy: "Stable",
          status: "active" as const,
          participants: [], // TODO: Query from blockchain
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
      // Get USDC coin object from user's wallet
      console.log("Fetching USDC coin objects for address:", user.address);
      console.log("Coin type:", DEFAULT_COIN_TYPE);
      const coinObjectId = await getAvailableCoin(user.address, MIN_BALANCE_USDC, DEFAULT_COIN_TYPE);

      if (!coinObjectId) {
        setError("No USDC coins found in your wallet. Please make sure you have USDC mock tokens.");
        setLoading(false);
        return;
      }

      console.log("Using USDC coin object:", coinObjectId);

      const joinData = {
        roomId: roomId,
        vaultId: roomData.vaultId,
        coinObjectId: coinObjectId, // ✓ Real USDC coin object from user's wallet
        clockId: SUI_CLOCK_ID,
        userAddress: user?.address,
      };

      const response = await roomAPI.joinRoom(joinData);

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
          // Store player position ID in localStorage
          localStorage.setItem(`playerPosition_${roomId}`, positionId);
          setPlayerPositionId(positionId);
          setIsJoined(true);
          alert("Successfully joined the room!");
          fetchRoomData(); // Refresh room data
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
    if (!depositAmount || Number(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

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
      // Get USDC coin object from user's wallet
      console.log("Fetching USDC coin objects for deposit from:", user.address);
      console.log("Coin type:", DEFAULT_COIN_TYPE);
      const coinObjectId = await getAvailableCoin(user.address, MIN_BALANCE_USDC, DEFAULT_COIN_TYPE);

      if (!coinObjectId) {
        setError("No USDC coins found in your wallet. Please make sure you have USDC mock tokens.");
        setLoading(false);
        return;
      }

      console.log("Using USDC coin object for deposit:", coinObjectId);

      const depositData = {
        roomId: roomId,
        vaultId: roomData.vaultId, // ✓ Real vaultId from database
        playerPositionId: playerPositionId, // ✓ Real playerPositionId from join room
        coinObjectId: coinObjectId, // ✓ Real USDC coin object from user's wallet
        clockId: SUI_CLOCK_ID,
      };

      const response = await roomAPI.deposit(depositData);

      if (response.success) {
        alert("Deposit successful!");
        setDepositAmount("");
        fetchRoomData(); // Refresh room data
        fetchUSDCBalance(); // Refresh USDC balance
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

    setLoading(true);
    setError("");

    try {
      // Get vaultId from fetched room data
      // Get playerPositionId from stored state after join
      const claimData = {
        roomId: roomId,
        vaultId: roomData.vaultId, // ✓ Real vaultId from database
        playerPositionId: playerPositionId, // ✓ Real playerPositionId from join room
      };

      const response = await roomAPI.claimReward(claimData);

      if (response.success) {
        alert("Rewards claimed successfully!");
        fetchRoomData(); // Refresh room data
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Money<span className="text-blue-600">Race</span>
          </h1>
          <div className="flex items-center gap-4">
            {user?.address && (
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  💰 {usdcBalance} USDC
                </div>
                <button
                  onClick={() => router.push("/mint")}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Get more USDC
                </button>
              </div>
            )}
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Error Alert - Show at top if there's an API error */}
        {error && !roomData && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Unable to Load Room Data</h3>
            <p className="text-yellow-700 text-sm mb-2">{error}</p>
            <p className="text-xs text-yellow-600">
              Room ID: <code className="bg-yellow-100 px-2 py-1 rounded">{roomId}</code>
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              💡 Tip: Make sure the room has been created on the blockchain first. Using mock data for now.
            </p>
          </div>
        )}

        {/* Room Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-3xl font-bold mb-2">{room.name}</h2>
              <p className="text-gray-600">
                {room.strategy} Strategy • Created by {room.creator}
              </p>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded ${
                room.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {room.status === "active" ? "Active" : "Ended"}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Week {room.currentPeriod}/{room.totalPeriods}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(room.currentPeriod / room.totalPeriods) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${room.totalDeposit}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reward Pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${room.rewardPool}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{room.participants?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Deposit & Actions */}
          <div className="md:col-span-1 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Join Room Button - Show if not joined yet */}
            {room.status === "active" && !isJoined && (
              <Card>
                <CardHeader>
                  <CardTitle>Join This Room</CardTitle>
                  <CardDescription>
                    Join to start saving and compete with others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      💡 By joining, you'll get a player position and can start making deposits.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleJoinRoom}
                    disabled={loading}
                  >
                    {loading ? "Joining..." : "Join Room"}
                  </Button>
                  <p className="text-xs text-gray-500">
                    ⚠️ Gasless transaction powered by zkLogin
                  </p>
                  <p className="text-xs text-blue-600">
                    ℹ️ Make sure you have USDC mock tokens in your wallet for joining and deposits.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Deposit Card - Show only if joined */}
            {room.status === "active" && isJoined && (
              <Card>
                <CardHeader>
                  <CardTitle>Make Deposit</CardTitle>
                  <CardDescription>Weekly target: ${room.weeklyTarget}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                    <p className="text-xs text-green-800">
                      ✓ You have joined this room
                    </p>
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Amount ($)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleDeposit}
                    disabled={!depositAmount || loading}
                  >
                    {loading ? "Processing..." : "Deposit"}
                  </Button>
                  <p className="text-xs text-gray-500">
                    ⚠️ Gasless transaction powered by zkLogin
                  </p>
                  <p className="text-xs text-green-600">
                    ✓ Your wallet is connected. USDC tokens will be used automatically for this deposit.
                  </p>
                </CardContent>
              </Card>
            )}

            {room.status === "ended" && (
              <Card>
                <CardHeader>
                  <CardTitle>Claim Rewards</CardTitle>
                  <CardDescription>Room has ended</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Your Deposit</span>
                      <span className="font-semibold">$300</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Your Reward</span>
                      <span className="font-semibold text-green-600">$30</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-blue-600">$330</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleClaimReward} disabled={loading}>
                    {loading ? "Processing..." : "Claim Rewards"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Share Room</CardTitle>
                <CardDescription>Invite friends to join</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/room/${roomId}`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/room/${roomId}`
                      );
                      alert("Link copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Details & Participants */}
          <div className="md:col-span-2">
            <Tabs defaultValue="participants">
              <TabsList>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription>Ranked by consistency score</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {room.participants && room.participants.length > 0 ? (
                        room.participants
                          .sort((a: Participant, b: Participant) => b.consistencyScore - a.consistencyScore)
                          .map((participant: Participant, index: number) => (
                          <div
                            key={participant.address}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-400">#{index + 1}</span>
                              <div>
                                <div className="font-mono text-sm">
                                  {participant.address}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {participant.depositsCount} deposits
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${participant.totalDeposit}</div>
                              <div className="text-xs text-gray-600">
                                {participant.consistencyScore}% score
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No participants data available yet</p>
                          <p className="text-sm mt-2">This room is from blockchain but participant data is not indexed</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Room Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Strategy</span>
                      <span className="font-semibold">{room.strategy}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-semibold">{room.duration} weeks</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Weekly Target</span>
                      <span className="font-semibold">${room.weeklyTarget}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Total Goal</span>
                      <span className="font-semibold">
                        ${room.weeklyTarget * room.totalPeriods}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Contract Address</span>
                      <span className="font-mono text-sm">0xabc...def</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                        <div>
                          <div className="font-semibold">Deposit</div>
                          <div className="text-gray-600">Week 3</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">$100</div>
                          <div className="text-gray-600 text-xs">2 days ago</div>
                        </div>
                      </div>
                      <div className="text-center py-4 text-gray-600 text-sm">
                        More transactions...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
