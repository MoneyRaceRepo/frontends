"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { LottieSpinner } from "@/components/ui/LottieLoading";
import { HiKey, HiIdentification, HiSearch, HiArrowRight, HiLightBulb, HiExclamationCircle } from "react-icons/hi";
import { FaKey, FaDoorOpen, FaHashtag } from "react-icons/fa";
import { RiDoorOpenFill, RiLockPasswordFill } from "react-icons/ri";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function JoinPrivateRoom() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMethod, setActiveMethod] = useState<"password" | "roomId">("password");

  const handleJoinByRoomId = () => {
    if (!roomId || roomId.trim() === "") {
      setError("Please enter a room ID");
      return;
    }

    // Validate room ID format (should start with 0x)
    if (!roomId.startsWith("0x")) {
      setError("Invalid room ID format. Should start with 0x");
      return;
    }

    // Navigate to room page
    router.push(`/room/${roomId}`);
  };

  const handleJoinByPassword = async () => {
    if (!password || password.trim() === "") {
      setError("Please enter a password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/room/find-by-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Room not found with this password");
        setLoading(false);
        return;
      }

      // Navigate to the found room
      router.push(`/room/${data.roomId}`);
    } catch (err: any) {
      setError("Failed to search for room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header with Mascot */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-[#4A3000] text-2xl font-bold tracking-wider mb-2"
              style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
            >
              JOIN ROOM
            </h1>
            <p className="text-[#6B4F0F]">Enter the Room ID or Password to join a private room</p>
          </div>
          <div className="animate-float">
            <Image
              src="/mascotsemut.png"
              alt="Ant Mascot"
              width={80}
              height={80}
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

        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#8B6914]/20 to-[#8B6914]/10 rounded-2xl p-8 border-3 border-[#8B6914]/40 shadow-xl">
          {/* Tab Buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => {
                setActiveMethod("password");
                setError("");
              }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all duration-300 border-2 ${
                activeMethod === "password"
                  ? "bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] border-[#D4A84B] shadow-xl scale-105"
                  : "bg-[#8B6914]/20 text-[#6B4F0F] border-[#8B6914]/40 hover:bg-[#8B6914]/30 hover:scale-102"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🔑</span>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${activeMethod === "password" ? "text-[#4A3000]" : "text-[#6B4F0F]"}`}>
                    Option 1
                  </p>
                  <p className={`text-xs ${activeMethod === "password" ? "text-[#4A3000]/80" : "text-[#6B4F0F]/70"}`}>
                    Use Password
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveMethod("roomId");
                setError("");
              }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all duration-300 border-2 ${
                activeMethod === "roomId"
                  ? "bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] border-[#D4A84B] shadow-xl scale-105"
                  : "bg-[#8B6914]/20 text-[#6B4F0F] border-[#8B6914]/40 hover:bg-[#8B6914]/30 hover:scale-102"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🆔</span>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${activeMethod === "roomId" ? "text-[#4A3000]" : "text-[#6B4F0F]"}`}>
                    Option 2
                  </p>
                  <p className={`text-xs ${activeMethod === "roomId" ? "text-[#4A3000]/80" : "text-[#6B4F0F]/70"}`}>
                    Use Room ID
                  </p>
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Method 1: Join by Password */}
          {activeMethod === "password" && (
            <div className="space-y-6">
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.3s ease-out;
                }
              `}</style>

            <div className="bg-[#E8D5A8]/50 rounded-xl p-6 border-2 border-[#D4A84B]/40 animate-fadeIn">
              <label htmlFor="password" className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">🔐</span>
                Room Password
              </label>
              <input
                id="password"
                type="text"
                placeholder="Enter 8-character password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full px-5 py-4 bg-white border-2 border-[#D4A84B]/40 rounded-xl text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all font-mono text-lg tracking-widest"
              />
              <p className="text-xs text-[#6B4F0F] mt-2 flex items-center gap-1">
                <span>💡</span>
                Enter the password shared by the room creator
              </p>
            </div>

            <button
              onClick={handleJoinByPassword}
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LottieSpinner size={24} />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔍</span>
                  Find Room by Password
                </span>
              )}
            </button>
          </div>
          )}

          {/* Method 2: Join by Room ID */}
          {activeMethod === "roomId" && (
            <div className="space-y-6">
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.3s ease-out;
                }
              `}</style>

            <div className="bg-[#E8D5A8]/50 rounded-xl p-6 border-2 border-[#D4A84B]/40 animate-fadeIn">
              <label htmlFor="roomId" className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">🏷️</span>
                Room ID
              </label>
              <input
                id="roomId"
                placeholder="0x..."
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setError("");
                }}
                className="w-full px-5 py-4 bg-white border-2 border-[#D4A84B]/40 rounded-xl text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all font-mono text-sm"
              />
              <p className="text-xs text-[#6B4F0F] mt-2 flex items-center gap-1">
                <span>💡</span>
                Paste the full Room ID (starts with 0x)
              </p>
            </div>

            <button
              onClick={handleJoinByRoomId}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-[#D4A84B]"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🚪</span>
                Continue to Room
              </span>
            </button>
          </div>
          )}

          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-6 py-3.5 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-xl border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all duration-200 mt-6"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
