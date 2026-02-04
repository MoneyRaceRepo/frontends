"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth.store";
import { LottieLoading } from "@/components/ui/LottieLoading";
import { useToast } from "@/components/ui/Toast";
import { HiClock, HiTrophy, HiUserGroup, HiArrowRight, HiFilter } from "react-icons/hi";
import { FaTrophy, FaRegSadTear, FaHandshake, FaHistory } from "react-icons/fa";
import { RiHistoryFill, RiCoinsFill } from "react-icons/ri";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface HistoryRoom {
  id: string;
  title: string;
  roomAddress: string;
  totalParticipants: number;
  yourDeposit: number;
  result: "won" | "lost" | "draw";
  endedAt: string;
  winAmount?: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [historyRooms, setHistoryRooms] = useState<HistoryRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "won" | "lost">("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_URL}/rooms/history`, {
      //   headers: { Authorization: `Bearer ${user?.token}` }
      // });
      // const data = await response.json();
      // setHistoryRooms(data.rooms);

      // Mock data for now
      setHistoryRooms([]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setLoading(false);
    }
  };

  const filteredRooms = historyRooms.filter((room) => {
    if (filter === "all") return true;
    return room.result === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2
            className="text-[#4A3000] text-xl font-bold tracking-wider mb-2"
            style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
          >
            ROOM HISTORY
          </h2>
          <p className="text-[#6B4F0F] text-sm">View your past room participations and results</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === "all"
                ? 'bg-[#8B6914]/50 text-white shadow-md'
                : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
            }`}
          >
            All Rooms
          </button>
          <button
            onClick={() => setFilter("won")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === "won"
                ? 'bg-[#8B6914]/50 text-white shadow-md'
                : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
            }`}
          >
            Won
          </button>
          <button
            onClick={() => setFilter("lost")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === "lost"
                ? 'bg-[#8B6914]/50 text-white shadow-md'
                : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
            }`}
          >
            Lost
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LottieLoading size="lg" text="Loading history..." />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            {/* Empty State Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-28 bg-[#8B6914]/30 rounded-xl flex flex-col items-center justify-center shadow-lg border-2 border-[#8B6914]/50">
                <RiHistoryFill className="w-10 h-10 text-[#8B6914]/50" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-[#D4A84B] rounded-lg flex items-center justify-center shadow-lg">
                <HiClock className="w-5 h-5 text-[#4A3000]" />
              </div>
            </div>
            <p className="text-white text-lg font-semibold mb-2">No history yet</p>
            <p className="text-[#FFE4A0]/80 text-sm mb-6">
              Your completed rooms will appear here
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
            >
              Browse Active Rooms
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="group bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/40 hover:border-[#D4A84B] shadow-md hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                onClick={() => router.push(`/room/${room.id}`)}
              >
                {/* Decorative gradient on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FFB347]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex items-start justify-between mb-3 relative">
                  <div className="flex items-start gap-3">
                    {/* Room Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0 ${
                      room.result === "won"
                        ? "bg-gradient-to-br from-green-400 to-green-600"
                        : room.result === "lost"
                        ? "bg-gradient-to-br from-gray-400 to-gray-500"
                        : "bg-gradient-to-br from-[#FFB347] to-[#E89530]"
                    }`}>
                      <span className="text-white">
                        {room.result === "won" ? <FaTrophy className="w-5 h-5" /> : room.result === "lost" ? <FaRegSadTear className="w-5 h-5" /> : <FaHandshake className="w-5 h-5" />}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-[#4A3000] mb-0.5 group-hover:text-[#8B6914] transition-colors">{room.title}</h3>
                      <p className="text-[#8B6914]/60 text-xs font-mono mb-0.5">#{room.roomAddress?.slice(0, 10)}...{room.roomAddress?.slice(-6)}</p>
                      <p className="text-[#8B6914]/70 text-xs flex items-center gap-1">
                        <HiUserGroup className="w-3 h-3" /> {room.totalParticipants} participants • <HiClock className="w-3 h-3" /> Ended {formatDate(room.endedAt)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-full font-bold text-xs shadow-md flex items-center gap-1 ${
                      room.result === "won"
                        ? "bg-[#E8F4E8] text-[#2D5A2D] border-2 border-[#9BC49B]"
                        : room.result === "lost"
                        ? "bg-[#FDF2F2] text-[#8B3030] border-2 border-[#E5A0A0]"
                        : "bg-[#F0E6D0] text-[#6B4F0F] border-2 border-[#C9A86C]"
                    }`}
                  >
                    {room.result === "won" ? <><FaTrophy className="w-3 h-3" /> Won</> : room.result === "lost" ? "Lost" : "Draw"}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm relative">
                  <div className="bg-[#E8DCC0] rounded-lg px-3 py-1.5 border border-[#D4A84B]/30 flex items-center gap-2">
                    <RiCoinsFill className="w-3 h-3 text-[#8B6914]" />
                    <span className="text-[#8B6914] text-xs">Your Deposit:</span>
                    <span className="text-[#4A3000] font-bold text-sm">{room.yourDeposit} USDC</span>
                  </div>
                  {room.winAmount && (
                    <div className="bg-[#E8F4E8] rounded-lg px-3 py-1.5 border border-[#9BC49B] flex items-center gap-2">
                      <FaTrophy className="w-3 h-3 text-green-600" />
                      <span className="text-[#2D5A2D] text-xs">Won Amount:</span>
                      <span className="text-green-600 font-bold text-sm">+{room.winAmount} USDC</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
