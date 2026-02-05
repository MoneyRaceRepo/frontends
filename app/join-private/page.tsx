"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { LottieSpinner } from "@/components/ui/LottieLoading";
import { useToast } from "@/components/ui/Toast";
import { HiKey, HiIdentification, HiSearch, HiArrowRight, HiLightBulb, HiExclamationCircle } from "react-icons/hi";
import { FaKey, FaDoorOpen, FaHashtag } from "react-icons/fa";
import { RiDoorOpenFill, RiLockPasswordFill } from "react-icons/ri";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function JoinPrivateRoom() {
  const router = useRouter();
  const toast = useToast();
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMethod, setActiveMethod] = useState<"password" | "roomId">("password");

  const handleJoinByRoomId = () => {
    if (!roomId || roomId.trim() === "") {
      setError("Please enter a room ID");
      toast.warning("Missing Info", "Please enter a room ID to continue.");
      return;
    }

    // Validate room ID format (should start with 0x)
    if (!roomId.startsWith("0x")) {
      setError("Invalid room ID format. Should start with 0x");
      toast.error("Invalid Format", "Room ID should start with 0x");
      return;
    }

    // Navigate to room page
    router.push(`/room/${roomId}`);
  };

  const handleJoinByPassword = async () => {
    if (!password || password.trim() === "") {
      setError("Please enter a password");
      toast.warning("Missing Info", "Please enter a password to continue.");
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
        toast.error("Room Not Found", "No room matches this password. Please check and try again.");
        setLoading(false);
        return;
      }

      // Navigate to the found room
      toast.success("Room Found!", "Redirecting to room...");
      router.push(`/room/${data.roomId}`);
    } catch (err: any) {
      setError("Failed to search for room. Please try again.");
      toast.error("Connection Error", "Unable to search for room. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header - Full Width, Align Left (sama seperti Dashboard) */}
      <div className="mb-6">
        <h2
          className="text-white text-xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          JOIN ROOM
        </h2>
        <p className="text-white/80 text-sm">Enter the Room ID or Password to join a private room</p>
      </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#8B6914]/20 to-[#8B6914]/10 rounded-xl p-4 border-2 border-[#8B6914]/40 shadow-lg">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setActiveMethod("password");
                setError("");
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-300 border-2 ${
                activeMethod === "password"
                  ? "bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] border-[#D4A84B] shadow-lg scale-[1.02]"
                  : "bg-[#8B6914]/20 text-[#6B4F0F] border-[#8B6914]/40 hover:bg-[#8B6914]/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaKey className={`w-5 h-5 ${activeMethod === "password" ? "text-[#4A3000]" : "text-[#6B4F0F]"}`} />
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
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-300 border-2 ${
                activeMethod === "roomId"
                  ? "bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] border-[#D4A84B] shadow-lg scale-[1.02]"
                  : "bg-[#8B6914]/20 text-[#6B4F0F] border-[#8B6914]/40 hover:bg-[#8B6914]/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HiIdentification className={`w-5 h-5 ${activeMethod === "roomId" ? "text-[#4A3000]" : "text-[#6B4F0F]"}`} />
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
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 mb-4 flex items-start gap-2">
              <HiExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Method 1: Join by Password */}
          {activeMethod === "password" && (
            <div className="space-y-3">
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.3s ease-out;
                }
              `}</style>

            <div className="bg-[#E8D5A8]/50 rounded-lg p-4 border-2 border-[#D4A84B]/40 animate-fadeIn">
              <label htmlFor="password" className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2 text-sm">
                <RiLockPasswordFill className="w-4 h-4 text-[#8B6914]" />
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
                className="w-full px-4 py-3 bg-[#FBF7EC] border-2 border-[#D4A84B]/40 rounded-lg text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all font-mono text-base tracking-widest"
              />
              <p className="text-xs text-[#6B4F0F] mt-1.5 flex items-center gap-1">
                <HiLightBulb className="w-3 h-3 text-[#8B6914]" />
                Enter the password shared by the room creator
              </p>
            </div>

            <button
              onClick={handleJoinByPassword}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-[#D4A84B] text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LottieSpinner size={24} />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <HiSearch className="w-5 h-5" />
                  Find Room by Password
                </span>
              )}
            </button>
          </div>
          )}

          {/* Method 2: Join by Room ID */}
          {activeMethod === "roomId" && (
            <div className="space-y-3">
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.3s ease-out;
                }
              `}</style>

            <div className="bg-[#E8D5A8]/50 rounded-lg p-4 border-2 border-[#D4A84B]/40 animate-fadeIn">
              <label htmlFor="roomId" className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2 text-sm">
                <FaHashtag className="w-4 h-4 text-[#8B6914]" />
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
                className="w-full px-4 py-3 bg-[#FBF7EC] border-2 border-[#D4A84B]/40 rounded-lg text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all font-mono text-sm"
              />
              <p className="text-xs text-[#6B4F0F] mt-1.5 flex items-center gap-1">
                <HiLightBulb className="w-3 h-3 text-[#8B6914]" />
                Paste the full Room ID (starts with 0x)
              </p>
            </div>

            <button
              onClick={handleJoinByRoomId}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#FFB347] to-[#E89530] text-[#4A3000] font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 border-[#D4A84B] text-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <RiDoorOpenFill className="w-4 h-4" />
                Continue to Room
              </span>
            </button>
          </div>
          )}
        </div>
    </DashboardLayout>
  );
}
