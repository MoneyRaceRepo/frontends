"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch rooms from API
    // Mock data for now
    setTimeout(() => {
      setRooms([
        {
          id: "1",
          name: "Emergency Fund",
          duration: 12,
          weeklyTarget: 100,
          currentPeriod: 3,
          totalPeriods: 12,
          participants: 5,
          myDeposit: 300,
          totalDeposit: 1500,
          strategy: "Stable",
          status: "active",
        },
        {
          id: "2",
          name: "Vacation Savings",
          duration: 8,
          weeklyTarget: 50,
          currentPeriod: 8,
          totalPeriods: 8,
          participants: 3,
          myDeposit: 400,
          totalDeposit: 1200,
          strategy: "Balanced",
          status: "ended",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

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
            <span className="text-sm text-gray-600">user@example.com</span>
            <Button variant="outline" size="sm">
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

        {/* Action Button */}
        <div className="mb-6">
          <Button
            size="lg"
            onClick={() => router.push("/create-room")}
            className="w-full md:w-auto"
          >
            + Create New Saving Room
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
