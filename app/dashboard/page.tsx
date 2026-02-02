"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roomAPI, usdcAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface Room {
  id: string;
  name: string;
  duration: number;
  weeklyTarget: number;
  currentPeriod: number;
  totalPeriods: number;
  participants: number;
  myDeposit: number;
  totalDeposit: number;
  strategy: string;
  status: "active" | "ended";
}

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Format address for display (0x1234...5678)
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    fetchRooms();
    if (user?.address) {
      fetchUSDCBalance();
    }
  }, [user]);

  const fetchUSDCBalance = async () => {
    if (!user?.address) return;
    try {
      setBalanceLoading(true);
      const data = await usdcAPI.getBalance(user.address);
      setUsdcBalance(data.balanceFormatted || "0.00");
    } catch (error) {
      console.error('Failed to fetch USDC balance:', error);
      setUsdcBalance("0.00");
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.listRooms();

      if (response.success && response.rooms) {
        // Map backend room data to frontend format
        const mappedRooms = response.rooms.map((room: any) => ({
          id: room.roomId, // Backend uses 'roomId'
          name: `Room #${room.roomId.slice(0, 8)}...`, // Generate name from ID
          duration: room.totalPeriods || 0,
          weeklyTarget: room.depositAmount / 1_000_000 || 0, // Convert from USDC decimals (6 decimals)
          currentPeriod: 0, // TODO: Query from blockchain
          totalPeriods: room.totalPeriods || 0,
          participants: 0, // TODO: Query from blockchain
          myDeposit: 0, // TODO: Calculate from user's position
          totalDeposit: 0, // TODO: Query from blockchain
          strategy: `Strategy ${room.strategyId}`,
          status: "active", // All created rooms are active by default
        }));
        setRooms(mappedRooms);
      } else {
        // Show message that no rooms exist yet
        console.log('No rooms found:', response.message);
        setRooms([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
      // On error, show empty state
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const activeRooms = rooms.filter((r) => r.status === "active");
  const endedRooms = rooms.filter((r) => r.status === "ended");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Money<span className="text-blue-600">Race</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">{user?.email || 'Guest'}</div>
              <div className="text-xs font-mono text-blue-600">
                {user?.address ? formatAddress(user.address) : 'No wallet'}
              </div>
              {user?.address && (
                <div className="text-sm font-semibold text-green-600 mt-1">
                  {balanceLoading ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : (
                    <span>💰 {usdcBalance} USDC</span>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Saved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$700</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Rooms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRooms.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">$45</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Consistency Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Button
            size="lg"
            onClick={() => router.push("/create-room")}
            className="w-full md:w-auto"
          >
            + Create New Saving Room
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/mint")}
            className="w-full md:w-auto"
          >
            💰 Mint USDC Tokens
          </Button>
        </div>

        {/* Rooms List */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Rooms ({activeRooms.length})
            </TabsTrigger>
            <TabsTrigger value="ended">
              Ended Rooms ({endedRooms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : activeRooms.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-600 mb-4">
                    You don't have any active saving rooms yet.
                  </p>
                  <Button onClick={() => router.push("/create-room")}>
                    Create Your First Room
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeRooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/room/${room.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{room.name}</CardTitle>
                        <CardDescription>
                          {room.participants} participants • {room.strategy} Strategy
                        </CardDescription>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          Week {room.currentPeriod} of {room.totalPeriods}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(room.currentPeriod / room.totalPeriods) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm pt-2">
                        <div>
                          <span className="text-gray-600">Your Deposit: </span>
                          <span className="font-semibold">${room.myDeposit}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Pool: </span>
                          <span className="font-semibold">${room.totalDeposit}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="ended" className="space-y-4 mt-4">
            {endedRooms.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">
                  No ended rooms yet.
                </CardContent>
              </Card>
            ) : (
              endedRooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/room/${room.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{room.name}</CardTitle>
                        <CardDescription>
                          {room.participants} participants • {room.strategy} Strategy
                        </CardDescription>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Ended
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-600">Your Deposit: </span>
                        <span className="font-semibold">${room.myDeposit}</span>
                      </div>
                      <Button size="sm" variant="outline">
                        Claim Rewards
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
