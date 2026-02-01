"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roomAPI } from "@/lib/api";

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

  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [roomData, setRoomData] = useState<any>(null);

  // Fetch room data on mount
  useEffect(() => {
    if (roomId) {
      fetchRoomData();
    }
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const response = await roomAPI.getRoom(roomId);
      if (response.success) {
        setRoomData(response.room);
      }
    } catch (err: any) {
      console.error("Failed to fetch room data:", err);
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

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Get these values from user state/wallet
      // For MVP, these should be obtained from:
      // - vaultId: from room data
      // - playerPositionId: from user's position in this room
      // - coinObjectId: from user's wallet/balance
      // - clockId: from Sui network (0x6)

      const depositData = {
        roomId: roomId,
        vaultId: "PLACEHOLDER_VAULT_ID", // TODO: Get from room data
        playerPositionId: "PLACEHOLDER_POSITION_ID", // TODO: Get from user state
        coinObjectId: "PLACEHOLDER_COIN_ID", // TODO: Get from wallet
        clockId: "0x6", // Sui Clock object
      };

      const response = await roomAPI.deposit(depositData);

      if (response.success) {
        alert("Deposit successful!");
        setDepositAmount("");
        fetchRoomData(); // Refresh room data
      } else {
        setError(response.error || "Failed to deposit");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.response?.data?.error || err.message || "Failed to deposit");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    setLoading(true);
    setError("");

    try {
      // TODO: Get these values from user state
      const claimData = {
        roomId: roomId,
        vaultId: "PLACEHOLDER_VAULT_ID", // TODO: Get from room data
        playerPositionId: "PLACEHOLDER_POSITION_ID", // TODO: Get from user state
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

  const isMyRoom = room.participants[0].address === "0x123...abc"; // Mock check

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Money<span className="text-blue-600">Race</span>
          </h1>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
              <div className="text-2xl font-bold">{room.participants.length}</div>
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

            {room.status === "active" && (
              <Card>
                <CardHeader>
                  <CardTitle>Make Deposit</CardTitle>
                  <CardDescription>Weekly target: ${room.weeklyTarget}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <p className="text-xs text-yellow-600">
                    Note: This requires vault ID and player position. Complete zkLogin setup first.
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
                      {room.participants
                        .sort((a, b) => b.consistencyScore - a.consistencyScore)
                        .map((participant, index) => (
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
                        ))}
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
