"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth.store";
import { LottieLoading } from "@/components/ui/LottieLoading";
import { HiClock, HiTrophy, HiUserGroup, HiArrowRight, HiFilter } from "react-icons/hi";
import { FaTrophy, FaRegSadTear, FaHandshake, FaHistory } from "react-icons/fa";
import { RiHistoryFill, RiCoinsFill } from "react-icons/ri";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface HistoryRoom {
  id: string;
  title: string;
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Room History</h1>
          <p className="text-[#FFE4A0]/80">View your past room participations and results</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              filter === "all"
                ? 'bg-[#8B6914]/50 text-white shadow-md'
                : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
            }`}
          >
            All Rooms
          </button>
          <button
            onClick={() => setFilter("won")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              filter === "won"
                ? 'bg-[#8B6914]/50 text-white shadow-md'
                : 'bg-[#8B6914]/20 text-[#E8D5A8] hover:bg-[#8B6914]/35'
            }`}
          >
            Won
          </button>
          <button
            onClick={() => setFilter("lost")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
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
          <div className="flex items-center justify-center min-h-[400px]">
            <LottieLoading size="lg" text="Loading history..." />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            {/* Empty State Icon */}
            <div className="relative mb-8">
              <div className="w-32 h-36 bg-[#8B6914]/30 rounded-2xl flex flex-col items-center justify-center shadow-xl border-2 border-[#8B6914]/50">
                <RiHistoryFill className="w-14 h-14 text-[#8B6914]/50" />
              </div>
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-[#D4A84B] rounded-xl flex items-center justify-center shadow-xl">
                <HiClock className="w-6 h-6 text-[#4A3000]" />
              </div>
            </div>
            <p className="text-white text-xl font-semibold mb-3">No history yet</p>
            <p className="text-[#FFE4A0]/80 text-sm mb-10">
              Your completed rooms will appear here
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-10 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Browse Active Rooms
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="group bg-[#F5EDD8] rounded-2xl p-6 border-2 border-[#D4A84B]/40 hover:border-[#D4A84B] shadow-lg hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                onClick={() => router.push(`/room/${room.id}`)}
              >
                {/* Decorative gradient on hover */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#FFB347]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="flex items-start gap-3">
                    {/* Room Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                      room.result === "won"
                        ? "bg-gradient-to-br from-green-400 to-green-600"
                        : room.result === "lost"
                        ? "bg-gradient-to-br from-gray-400 to-gray-500"
                        : "bg-gradient-to-br from-[#FFB347] to-[#E89530]"
                    }`}>
                      <span className="text-xl text-white">
                        {room.result === "won" ? "🏆" : room.result === "lost" ? "📉" : "🤝"}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-[#4A3000] mb-1 group-hover:text-[#8B6914] transition-colors">{room.title}</h3>
                      <p className="text-[#8B6914]/70 text-sm">
                        {room.totalParticipants} participants • Ended {formatDate(room.endedAt)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full font-bold text-sm shadow-md ${
                      room.result === "won"
                        ? "bg-[#E8F4E8] text-[#2D5A2D] border-2 border-[#9BC49B]"
                        : room.result === "lost"
                        ? "bg-[#FDF2F2] text-[#8B3030] border-2 border-[#E5A0A0]"
                        : "bg-[#F0E6D0] text-[#6B4F0F] border-2 border-[#C9A86C]"
                    }`}
                  >
                    {room.result === "won" ? "🏆 Won" : room.result === "lost" ? "Lost" : "Draw"}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm relative">
                  <div className="bg-[#E8DCC0] rounded-xl px-4 py-2 border border-[#D4A84B]/30">
                    <span className="text-[#8B6914] text-xs">Your Deposit:</span>
                    <span className="text-[#4A3000] font-bold ml-2">{room.yourDeposit} USDC</span>
                  </div>
                  {room.winAmount && (
                    <div className="bg-[#E8F4E8] rounded-xl px-4 py-2 border border-[#9BC49B]">
                      <span className="text-[#2D5A2D] text-xs">Won Amount:</span>
                      <span className="text-green-600 font-bold ml-2">+{room.winAmount} USDC</span>
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
