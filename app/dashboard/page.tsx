"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { roomAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import DashboardLayout from "@/components/DashboardLayout";
import { LottieLoading } from "@/components/ui/LottieLoading";
import { HiSearch, HiUserGroup, HiLockClosed, HiCurrencyDollar, HiCheckCircle, HiArrowRight, HiSparkles, HiTrendingUp, HiPlus, HiClock } from "react-icons/hi";
import { RiCoinsFill, RiVipCrownFill, RiGamepadFill } from "react-icons/ri";
import { FaUsers, FaPiggyBank, FaTrophy, FaGift } from "react-icons/fa";

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
  isPrivate?: boolean;
}

interface MyRoom {
  roomId: string;
  vaultId: string | null;
  playerPositionId: string;
  joinedAt: number;
  myDeposit: number;
  depositsCount: number;
  totalPeriods: number;
  depositAmount: number;
  strategyId: number;
  isPrivate: boolean;
  status: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRoomsLoading, setMyRoomsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "my-rooms" | "ended">("active");
  const [activeRoomId, setActiveRoomId] = useState<string>("");

  useEffect(() => {
    fetchRooms();
    if (user?.address) {
      fetchMyRooms();
    }
  }, [user?.address]);

  const fetchMyRooms = async () => {
    if (!user?.address) return;
    try {
      setMyRoomsLoading(true);
      const response = await roomAPI.getMyRooms(user.address);
      if (response.success && response.rooms) {
        setMyRooms(response.rooms);
      } else {
        setMyRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch my rooms:', error);
      setMyRooms([]);
    } finally {
      setMyRoomsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.listRooms();

      if (response.success && response.rooms) {
        const mappedRooms = response.rooms.map((room: any) => {
          const startTimeMs = Number(room.startTimeMs) || Date.now();
          const periodLengthMs = Number(room.periodLengthMs) || (7 * 24 * 60 * 60 * 1000);
          const now = Date.now();
          const elapsedMs = now - startTimeMs;

          let currentPeriod = 0;
          if (elapsedMs > 0) {
            currentPeriod = Math.floor(elapsedMs / periodLengthMs);
          }

          const totalPeriods = room.totalPeriods || 0;
          const displayPeriod = Math.min(currentPeriod, totalPeriods);
          const isEnded = currentPeriod >= totalPeriods;

          return {
            id: room.roomId,
            name: `Room #${room.roomId.slice(0, 8)}...`,
            duration: totalPeriods,
            weeklyTarget: room.depositAmount / 1_000_000 || 0,
            currentPeriod: displayPeriod,
            totalPeriods: totalPeriods,
            participants: 0,
            myDeposit: 0,
            totalDeposit: 0,
            strategy: `Strategy ${room.strategyId}`,
            status: isEnded ? "ended" : "active",
          };
        });

        setRooms(mappedRooms);
      } else {
        setRooms([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (myRooms.length > 0 && rooms.length > 0) {
      setRooms(prevRooms => prevRooms.map(room => {
        const myRoom = myRooms.find(mr => mr.roomId === room.id);
        if (myRoom) {
          return {
            ...room,
            myDeposit: myRoom.myDeposit
          };
        }
        return room;
      }));
    }
  }, [myRooms]);

  const activeRooms = rooms.filter((r) => r.status === "active");
  const endedRooms = rooms.filter((r) => r.status === "ended");

  const handleRoomClick = (roomId: string) => {
    setActiveRoomId(roomId);
    router.push(`/room/${roomId}`);
  };

  return (
    <DashboardLayout activeRoomId={activeRoomId}>
      {/* Search Bar - Full width, prominent */}
      <div className="mb-6">
        <div className="relative w-full">
          <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-[#8B7040]">
            <HiSearch className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-3.5 bg-[#5A4520]/20 rounded-xl text-[#4A3000] placeholder-[#8B7040] focus:outline-none focus:ring-2 focus:ring-[#8B6914]/50 transition-all border border-[#8B6914]/30"
          />
        </div>
      </div>

      {/* Tabs - Cleaner, more prominent */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "active"
              ? 'bg-[#8B6914]/50 text-white shadow-md'
              : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
          }`}
        >
          Active Rooms ({activeRooms.length})
        </button>
        <button
          onClick={() => setActiveTab("my-rooms")}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "my-rooms"
              ? 'bg-[#8B6914]/50 text-white shadow-md'
              : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
          }`}
        >
          My Rooms ({myRooms.length})
        </button>
        <button
          onClick={() => setActiveTab("ended")}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "ended"
              ? 'bg-[#8B6914]/50 text-white shadow-md'
              : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
          }`}
        >
          Ended ({endedRooms.length})
        </button>
      </div>

      {/* Room Cards */}
      <div className="min-h-[300px]">
        {activeTab === "active" && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <LottieLoading size="lg" text="Loading rooms..." />
            </div>
          ) : activeRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              {/* Animated Ant Mascot */}
              <div className="relative mb-8 animate-bounce-slow">
                <Image
                  src="/mascotsemut.png"
                  alt="Ant Mascot"
                  width={200}
                  height={200}
                  className="drop-shadow-2xl"
                />
                <style jsx>{`
                  @keyframes bounce-slow {
                    0%, 100% {
                      transform: translateY(0);
                    }
                    50% {
                      transform: translateY(-20px);
                    }
                  }
                  .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                  }
                `}</style>
              </div>
              <p className="text-white text-xl font-semibold mb-3">No active rooms available.</p>
              <p className="text-[#FFE4A0]/70 text-sm mb-10">Start your savings journey by creating your first room!</p>
              <button
                onClick={() => router.push("/create-room")}
                className="px-12 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-base"
              >
                Create Your First Room
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  className="group bg-[#F5EDD8] rounded-2xl p-5 cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-[#D4A84B]/40 hover:border-[#D4A84B] relative overflow-hidden"
                >
                  {/* Decorative gradient on hover */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#FFB347]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                  
                  <div className="flex justify-between items-start mb-4 relative">
                    <div className="flex items-start gap-3">
                      {/* Room Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <FaPiggyBank className="w-6 h-6 text-[#4A3000]" />
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-[#4A3000] text-lg group-hover:text-[#8B6914] transition-colors">{room.name}</h3>
                        <p className="text-[#8B6914]/70 text-sm"><FaUsers className="inline w-3 h-3 mr-1" />{room.participants} participants • {room.strategy}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                      <HiSparkles className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                  
                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#8B6914] text-xs font-medium">Progress</span>
                      <span className="text-[#4A3000] text-xs font-semibold">Week {room.currentPeriod} of {room.totalPeriods}</span>
                    </div>
                    <div className="w-full bg-[#D4A84B]/30 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#FFB347] via-[#FF9500] to-[#FF8C00] h-full rounded-full transition-all duration-500 relative shadow-sm"
                        style={{ width: `${(room.currentPeriod / room.totalPeriods) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#E8DCC0] rounded-xl p-3 text-center border border-[#D4A84B]/30">
                      <span className="text-[#8B6914] text-xs font-medium block mb-1">Your Deposit</span>
                      <span className="text-[#4A3000] text-lg font-bold">${room.myDeposit}</span>
                    </div>
                    <div className="bg-[#E8DCC0] rounded-xl p-3 text-center border border-[#D4A84B]/30">
                      <span className="text-[#8B6914] text-xs font-medium block mb-1">Total Pool</span>
                      <span className="text-[#4A3000] text-lg font-bold">${room.totalDeposit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "my-rooms" && (
          myRoomsLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <LottieLoading size="lg" text="Loading your rooms..." />
            </div>
          ) : myRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              {/* Animated Ant Mascot with Wave */}
              <div className="relative mb-8 animate-float">
                <Image
                  src="/mascotsemut.png"
                  alt="Ant Mascot"
                  width={180}
                  height={180}
                  className="drop-shadow-2xl"
                />
                <style jsx>{`
                  @keyframes float {
                    0%, 100% {
                      transform: translateY(0) rotate(-5deg);
                    }
                    50% {
                      transform: translateY(-15px) rotate(5deg);
                    }
                  }
                  .animate-float {
                    animation: float 4s ease-in-out infinite;
                  }
                `}</style>
              </div>
              <p className="text-white text-xl font-semibold mb-3">You haven't joined any rooms yet.</p>
              <p className="text-[#FFE4A0]/80 text-sm mb-10">Create a room or join an existing one to start saving!</p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push("/create-room")}
                  className="px-10 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                >
                  Create Room
                </button>
                <button
                  onClick={() => router.push("/join-private")}
                  className="px-10 py-4 bg-[#8B6914]/40 text-white font-bold rounded-full shadow-lg hover:bg-[#8B6914]/60 border-2 border-[#8B6914]/60 transition-all duration-200"
                >
                  Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            {myRooms.map((room) => {
              const progressPercent = Math.min((room.depositsCount / room.totalPeriods) * 100, 100);
              const weeklyTarget = room.depositAmount / 1_000_000;
              
              return (
                <div
                  key={room.roomId}
                  onClick={() => handleRoomClick(room.roomId)}
                  className="group bg-[#F5EDD8] rounded-2xl p-5 cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-[#D4A84B]/40 hover:border-[#D4A84B] relative overflow-hidden"
                >
                  {/* Decorative gradient on hover */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#FFB347]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                  
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4 relative">
                    <div className="flex items-start gap-3">
                      {/* Room Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <RiCoinsFill className="w-6 h-6 text-[#4A3000]" />
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-[#4A3000] text-lg flex items-center gap-2 group-hover:text-[#8B6914] transition-colors">
                          Savings Room
                          {room.isPrivate && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded-full flex items-center gap-1 shadow">
                              <HiLockClosed className="w-3 h-3" />
                              Private
                            </span>
                          )}
                        </h3>
                        <p className="text-[#8B6914]/70 text-xs font-mono">#{room.roomId.slice(0, 10)}...{room.roomId.slice(-6)}</p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 ${
                      room.status === 0 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                        : room.status === 1 
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#4A3000]' 
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                    }`}>
                      {room.status === 0 && <HiSparkles className="w-3 h-3" />}
                      {room.status === 0 ? 'Active' : room.status === 1 ? <><FaGift className="w-3 h-3" /> Claiming</> : 'Ended'}
                    </span>
                  </div>
                  
                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#8B6914] text-xs font-medium">Savings Progress</span>
                      <span className="text-[#4A3000] text-xs font-semibold">{room.depositsCount} / {room.totalPeriods} weeks</span>
                    </div>
                    <div className="w-full bg-[#D4A84B]/30 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#FFB347] via-[#FF9500] to-[#FF8C00] h-full rounded-full transition-all duration-500 relative shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#E8DCC0] rounded-xl p-3 text-center border border-[#D4A84B]/30">
                      <span className="text-[#8B6914] text-[10px] uppercase tracking-wide font-medium">Your Deposit</span>
                      <p className="font-bold text-green-600 text-lg">${room.myDeposit}</p>
                      <span className="text-[#8B6914]/60 text-[10px]">USDC</span>
                    </div>
                    <div className="bg-[#E8DCC0] rounded-xl p-3 text-center border border-[#D4A84B]/30">
                      <span className="text-[#8B6914] text-[10px] uppercase tracking-wide font-medium">Weekly Target</span>
                      <p className="font-bold text-[#4A3000] text-lg">${weeklyTarget.toFixed(0)}</p>
                      <span className="text-[#8B6914]/60 text-[10px]">USDC</span>
                    </div>
                    <div className="bg-[#E8DCC0] rounded-xl p-3 text-center border border-[#D4A84B]/30">
                      <span className="text-[#8B6914] text-[10px] uppercase tracking-wide font-medium">Duration</span>
                      <p className="font-bold text-[#4A3000] text-lg">{room.totalPeriods}</p>
                      <span className="text-[#8B6914]/60 text-[10px]">weeks</span>
                    </div>
                  </div>
                  
                  {/* Action hint on hover */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-[#8B6914]/60 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Click to view details</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
                    </svg>
                  </div>
                </div>
              );
            })}
            </div>
          )
        )}

        {activeTab === "ended" && (
          endedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              {/* Animated Ant Mascot - Sleeping/Resting */}
              <div className="relative mb-8 animate-pulse-slow">
                <Image
                  src="/mascotsemut.png"
                  alt="Ant Mascot"
                  width={160}
                  height={160}
                  className="drop-shadow-2xl opacity-70"
                />
                <style jsx>{`
                  @keyframes pulse-slow {
                    0%, 100% {
                      opacity: 0.7;
                    }
                    50% {
                      opacity: 0.9;
                    }
                  }
                  .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                  }
                `}</style>
              </div>
              <p className="text-white text-xl font-semibold mb-3">No ended rooms yet.</p>
              <p className="text-[#FFE4A0]/80 text-sm">Rooms will appear here once they've completed.</p>
            </div>
          ) : (
            <div className="space-y-4">
            {endedRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className="group bg-[#F5EDD8] rounded-2xl p-5 cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-[#D4A84B]/40 hover:border-[#D4A84B] relative overflow-hidden"
              >
                {/* Decorative gradient on hover */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-gray-300/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex justify-between items-start relative">
                  <div className="flex items-start gap-3">
                    {/* Room Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-[#4A3000] text-lg group-hover:text-[#8B6914] transition-colors">{room.name}</h3>
                      <p className="text-[#8B6914]/70 text-sm">{room.participants} participants • {room.strategy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold rounded-full shadow-lg">
                      Ended
                    </span>
                    <button className="px-5 py-2 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-full text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                      Claim Rewards
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
