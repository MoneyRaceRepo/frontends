"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { aiAPI, roomAPI, convertCreateRoomData, convertCreateRoomDataTestMode } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { LottieLoading, LottieSpinner } from "@/components/ui/LottieLoading";
import { HiHome, HiCalendar, HiCurrencyDollar, HiLockClosed, HiBeaker, HiSparkles, HiClipboardCopy, HiCheck, HiArrowRight, HiLightBulb } from "react-icons/hi";
import { FaRobot, FaBrain, FaShieldAlt, FaBalanceScale, FaRocket, FaCopy, FaKey } from "react-icons/fa";
import { RiAiGenerate, RiLockPasswordFill } from "react-icons/ri";

type Step = 1 | 2 | 3 | 4;

interface Strategy {
  id: number;
  name: string;
  expectedReturn: number;
  risk: number;
  description: string;
}

export default function CreateRoom() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Form data
  const [roomName, setRoomName] = useState("");
  const [duration, setDuration] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [createdRoomId, setCreatedRoomId] = useState<string>("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleAISubmit = async () => {
    setAiLoading(true);
    setError("");

    try {
      const response = await aiAPI.getRecommendation(aiPrompt);

      if (response.success && response.strategies) {
        const mappedStrategies = response.strategies.map((s: any, index: number) => ({
          id: index,
          name: s.name || s.strategy,
          expectedReturn: s.expectedReturn || s.return_pct || 0,
          risk: s.risk || s.risk_pct || 0,
          description: s.description || s.reasoning || "",
        }));
        setStrategies(mappedStrategies);
        setCurrentStep(3);
      } else {
        setStrategies([
          { id: 0, name: "Stable", expectedReturn: 3.5, risk: 15, description: "Conservative approach with stable, low-risk deposits." },
          { id: 1, name: "Balanced", expectedReturn: 6.5, risk: 35, description: "Moderate risk-reward balance." },
          { id: 2, name: "Growth", expectedReturn: 12.0, risk: 60, description: "Aggressive strategy targeting higher returns." },
        ]);
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error("AI recommendation error:", err);
      setError(err.message || "Failed to get AI recommendations. Using default strategies.");
      setStrategies([
        { id: 0, name: "Stable", expectedReturn: 3.5, risk: 15, description: "Conservative approach with stable, low-risk deposits." },
        { id: 1, name: "Balanced", expectedReturn: 6.5, risk: 35, description: "Moderate risk-reward balance." },
        { id: 2, name: "Growth", expectedReturn: 12.0, risk: 60, description: "Aggressive strategy targeting higher returns." },
      ]);
      setCurrentStep(3);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (selectedStrategy === null) {
      setError("Please select a strategy");
      return;
    }

    setCreateLoading(true);
    setError("");

    try {
      const roomData = isTestMode
        ? convertCreateRoomDataTestMode({
            name: roomName,
            duration: Number(duration),
            weeklyTarget: Number(weeklyTarget),
            strategyId: selectedStrategy,
          })
        : convertCreateRoomData({
            name: roomName,
            duration: Number(duration),
            weeklyTarget: Number(weeklyTarget),
            strategyId: selectedStrategy,
          });

      const roomDataWithPrivacy = { ...roomData, isPrivate };
      const response = await roomAPI.createRoom(roomDataWithPrivacy);

      if (response.success) {
        if (isPrivate && response.password && response.roomId) {
          setGeneratedPassword(response.password);
          setCreatedRoomId(response.roomId);
          setShowPasswordModal(true);
        } else {
          alert("Room created successfully!");
          router.push("/dashboard");
        }
      } else {
        setError(response.error || "Failed to create room");
      }
    } catch (err: any) {
      console.error("Create room error:", err);
      setError(err.response?.data?.error || err.message || "Failed to create room");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#E8D5A8] rounded-2xl p-6 max-w-lg w-full shadow-2xl border-4 border-[#D4A84B]">
            <h3 className="text-[#4A3000] font-bold text-xl mb-2">🔒 Private Room Created!</h3>
            <p className="text-[#6B4F0F] text-sm mb-4">Save this information - it will only be shown once</p>

            <div className="bg-[#FFB347]/20 border-2 border-[#FFB347]/40 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#4A3000]">Room ID:</span>
                <button
                  onClick={() => navigator.clipboard.writeText(createdRoomId)}
                  className="text-xs text-[#8B6914] hover:text-[#4A3000] underline font-semibold"
                >
                  Copy
                </button>
              </div>
              <div className="bg-white/80 rounded-lg p-2 font-mono text-xs break-all text-[#4A3000]">{createdRoomId}</div>
            </div>

            <div className="bg-[#D4A84B]/30 border-2 border-[#D4A84B]/60 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#4A3000]">Room Password:</span>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedPassword)}
                  className="text-xs text-[#8B6914] hover:text-[#4A3000] underline font-semibold"
                >
                  Copy
                </button>
              </div>
              <div className="bg-white/90 rounded-lg p-3 font-mono text-2xl font-bold text-center tracking-wider text-[#4A3000]">
                {generatedPassword}
              </div>
            </div>

            <button
              onClick={() => {
                const inviteText = `Join my private room!\n\nRoom ID: ${createdRoomId}\nPassword: ${generatedPassword}`;
                navigator.clipboard.writeText(inviteText);
              }}
              className="w-full mb-3 py-2 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all"
            >
              📋 Copy Both (Room ID + Password)
            </button>

            <button
              onClick={() => {
                setShowPasswordModal(false);
                router.push("/dashboard");
              }}
              className="w-full py-3 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg"
            >
              I've Saved the Information - Continue
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header with Mascot and Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-[#4A3000] text-xl font-bold tracking-wider mb-2"
                style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
              >
                CREATE ROOM
              </h2>
              <p className="text-[#6B4F0F] text-sm">Start your savings journey with Money Race!</p>
            </div>
            <div className="animate-wiggle">
              <Image
                src="/mascotsemut.png"
                alt="Ant Mascot"
                width={80}
                height={80}
                className="drop-shadow-lg"
              />
              <style jsx>{`
                @keyframes wiggle {
                  0%, 100% { transform: rotate(-3deg); }
                  50% { transform: rotate(3deg); }
                }
                .animate-wiggle {
                  animation: wiggle 2s ease-in-out infinite;
                }
              `}</style>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-[#C9A86C]/40 rounded-2xl p-6 border-2 border-[#8B6914]/30">
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: "Basic Info" },
                { step: 2, label: "AI Strategy" },
                { step: 3, label: "Choose" },
                { step: 4, label: "Review" }
              ].map(({ step, label }, index) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 border-3 ${
                        currentStep === step
                          ? "bg-gradient-to-br from-[#FFB347] to-[#E89530] text-[#4A3000] shadow-xl scale-110 border-[#FFB347]"
                          : currentStep > step
                            ? "bg-gradient-to-br from-[#8B6914] to-[#6B4F0F] text-white shadow-md border-[#8B6914]"
                            : "bg-[#8B6914]/30 text-[#4A3000]/50 border-[#8B6914]/40"
                      }`}
                    >
                      {currentStep > step ? "✓" : step}
                    </div>
                    <span className={`mt-2 text-xs font-semibold transition-all ${
                      currentStep >= step ? "text-[#4A3000]" : "text-[#4A3000]/50"
                    }`}>
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`h-1 flex-1 mx-3 rounded-full transition-all duration-300 ${
                      currentStep > step ? "bg-gradient-to-r from-[#8B6914] to-[#8B6914]" : "bg-[#8B6914]/30"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="text-[#4A3000] font-bold text-lg">Basic Information</h3>
                <p className="text-[#6B4F0F] text-xs">Set up your savings room details</p>
              </div>
            </div>

            {/* Room Name */}
            <div className="bg-[#8B6914]/10 rounded-xl p-5 border-2 border-[#8B6914]/20">
              <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">🏠</span>
                Room Name
              </label>
              <input
                type="text"
                placeholder="e.g., Emergency Fund, Vacation Savings"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#E8D5A8] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/50 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
              />
            </div>

            {/* Duration */}
            <div className="bg-[#8B6914]/10 rounded-xl p-5 border-2 border-[#8B6914]/20">
              <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">📅</span>
                Duration (weeks)
              </label>
              <input
                type="number"
                placeholder="e.g., 12"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#E8D5A8] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/50 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
              />
              <p className="text-xs text-[#6B4F0F] mt-2">How many weeks will this savings goal last?</p>
            </div>

            {/* Weekly Target */}
            <div className="bg-[#8B6914]/10 rounded-xl p-5 border-2 border-[#8B6914]/20">
              <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">💰</span>
                Weekly Target ($)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4A3000] font-bold text-lg">$</span>
                <input
                  type="number"
                  placeholder="100"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-[#E8D5A8] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/50 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
                />
              </div>
              {duration && weeklyTarget && (
                <div className="mt-3 bg-[#FFB347]/20 rounded-lg p-3 border border-[#FFB347]/40">
                  <p className="text-sm text-[#4A3000] font-semibold">
                    💡 Total Goal: <span className="text-green-700">${Number(weeklyTarget) * Number(duration)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            <div className="bg-[#8B6914]/10 rounded-xl p-5 border-2 border-[#8B6914]/20">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-6 h-6 accent-[#FFB347] cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[#4A3000] font-semibold flex items-center gap-2">
                    <span className="text-xl">🔒</span>
                    Make this a private room
                  </span>
                  <p className="text-xs text-[#6B4F0F] mt-1">Only people with password can join</p>
                </div>
              </label>
              {isPrivate && (
                <div className="mt-4 bg-gradient-to-r from-[#D4A84B]/20 to-[#FFB347]/20 border-2 border-[#D4A84B]/40 rounded-xl p-4">
                  <p className="text-[#4A3000] text-sm font-semibold flex items-center gap-2">
                    <span className="text-lg">🔐</span>
                    A secure password will be automatically generated for this room
                  </p>
                </div>
              )}
            </div>

            {/* Test Mode */}
            <div className="bg-gradient-to-br from-[#FFB347]/10 to-[#E89530]/10 rounded-xl p-5 border-2 border-[#FFB347]/30">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isTestMode}
                    onChange={(e) => setIsTestMode(e.target.checked)}
                    className="w-6 h-6 accent-[#FF8C00] cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[#4A3000] font-semibold flex items-center gap-2">
                    <span className="text-xl">🧪</span>
                    Enable Test Mode
                  </span>
                  <p className="text-xs text-[#6B4F0F] mt-1">1 minute periods for quick testing</p>
                </div>
              </label>
              {isTestMode && (
                <div className="mt-4 bg-[#FF8C00]/20 border-2 border-[#FF8C00]/40 rounded-xl p-4">
                  <p className="text-[#4A3000] text-sm font-semibold flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    Each "week" will be only 1 minute long for testing purposes
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!roomName || !duration || !weeklyTarget}
              className="w-full py-3 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: AI Strategy
            </button>
          </div>
        )}

        {/* Step 2: AI Strategy */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Header with AI Icon */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="text-[#4A3000] font-bold text-lg">AI Strategy Recommendation</h3>
                <p className="text-[#6B4F0F] text-xs">Let AI help you choose the best strategy</p>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/20 rounded-xl p-5 border-2 border-[#FFB347]/40">
              <p className="text-[#4A3000] text-sm font-medium flex items-start gap-2">
                <span className="text-xl">💡</span>
                <span>Describe your saving goals and let our AI recommend the best investment strategy tailored to your needs!</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
              </div>
            )}

            {/* AI Prompt Input */}
            <div className="bg-[#8B6914]/10 rounded-xl p-5 border-2 border-[#8B6914]/20">
              <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-3">
                <span className="text-xl">✨</span>
                What are you saving for?
              </label>
              <textarea
                placeholder="Example: I want to build an emergency fund for unexpected expenses. I prefer low risk and steady growth to ensure my savings are safe."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={6}
                className="w-full px-4 py-3.5 bg-[#E8D5A8] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/50 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all resize-none"
              />
              <p className="text-xs text-[#6B4F0F] mt-2">Be specific about your goals, timeline, and risk tolerance for better recommendations</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                disabled={aiLoading}
                className="flex-1 py-3 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleAISubmit}
                disabled={!aiPrompt || aiLoading}
                className="flex-1 py-3 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LottieSpinner size={24} />
                    Analyzing...
                  </span>
                ) : "Get AI Recommendations"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Strategy */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-[#4A3000] font-bold text-lg">AI Recommendations</h3>
                <p className="text-[#6B4F0F] text-xs">Choose the strategy that fits you best</p>
              </div>
            </div>

            {/* User Prompt Display */}
            <div className="bg-gradient-to-br from-[#D4A84B]/20 to-[#FFB347]/20 rounded-xl p-4 border-2 border-[#D4A84B]/40">
              <p className="text-xs text-[#6B4F0F] font-semibold mb-1">📋 Based on your goal:</p>
              <p className="text-sm text-[#4A3000] italic line-clamp-2">"{aiPrompt}"</p>
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
              </div>
            )}

            {/* Strategy Cards */}
            <div className="space-y-4">
              {strategies.map((strategy, index) => {
                const icons = ["🛡️", "⚖️", "🚀"];
                const gradients = [
                  "from-green-50 to-emerald-50 border-green-300",
                  "from-blue-50 to-cyan-50 border-blue-300",
                  "from-orange-50 to-amber-50 border-orange-300"
                ];
                return (
                  <div
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy.id)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border-3 ${
                      selectedStrategy === strategy.id
                        ? "bg-gradient-to-br from-[#FFB347] to-[#E89530] border-[#D4A84B] shadow-2xl scale-[1.02]"
                        : `bg-gradient-to-br ${gradients[index] || 'from-gray-50 to-gray-50 border-gray-300'} hover:shadow-lg hover:scale-[1.01]`
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{icons[index] || "💎"}</span>
                        <h4 className={`font-bold text-xl ${selectedStrategy === strategy.id ? 'text-white' : 'text-[#4A3000]'}`}>
                          {strategy.name}
                        </h4>
                      </div>
                      {selectedStrategy === strategy.id && (
                        <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg animate-bounce">
                          <span className="text-green-600 font-bold text-xl">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mb-3">
                      <div className={`flex-1 px-4 py-3 rounded-xl ${selectedStrategy === strategy.id ? 'bg-white/20' : 'bg-white/80'}`}>
                        <span className={`text-xs font-semibold block mb-1 ${selectedStrategy === strategy.id ? 'text-white/80' : 'text-[#6B4F0F]'}`}>Expected Return</span>
                        <p className={`text-lg font-bold ${selectedStrategy === strategy.id ? 'text-white' : 'text-green-700'}`}>
                          +{strategy.expectedReturn}%
                        </p>
                      </div>
                      <div className={`flex-1 px-4 py-3 rounded-xl ${selectedStrategy === strategy.id ? 'bg-white/20' : 'bg-white/80'}`}>
                        <span className={`text-xs font-semibold block mb-1 ${selectedStrategy === strategy.id ? 'text-white/80' : 'text-[#6B4F0F]'}`}>Risk Level</span>
                        <p className={`text-lg font-bold ${selectedStrategy === strategy.id ? 'text-white' : 'text-orange-700'}`}>
                          {strategy.risk}%
                        </p>
                      </div>
                    </div>

                    <p className={`text-sm leading-relaxed ${selectedStrategy === strategy.id ? 'text-white/90' : 'text-[#6B4F0F]'}`}>
                      {strategy.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 py-3 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={selectedStrategy === null}
                className="flex-1 py-3 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Header with Mascot */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-[#4A3000] font-bold text-lg">Review & Confirm</h3>
                  <p className="text-[#6B4F0F] text-xs">Double check your room settings</p>
                </div>
              </div>
              <div className="animate-wiggle">
                <Image
                  src="/mascotsemut.png"
                  alt="Ant Mascot"
                  width={60}
                  height={60}
                  className="drop-shadow-lg"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
              </div>
            )}

            {/* Room Details Card */}
            <div className="bg-gradient-to-br from-[#E8D5A8] to-[#D4A84B]/30 rounded-2xl p-6 border-3 border-[#D4A84B]/50 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b-2 border-dashed border-[#8B6914]/30">
                  <span className="text-[#6B4F0F] font-medium flex items-center gap-2">
                    <span className="text-lg">🏠</span> Room Name
                  </span>
                  <span className="font-bold text-[#4A3000] text-lg">{roomName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-xl p-4 border-2 border-[#8B6914]/20">
                    <span className="text-[#6B4F0F] text-xs font-semibold block mb-1">📅 Duration</span>
                    <span className="font-bold text-[#4A3000] text-xl">{duration} weeks</span>
                  </div>
                  <div className="bg-white/60 rounded-xl p-4 border-2 border-[#8B6914]/20">
                    <span className="text-[#6B4F0F] text-xs font-semibold block mb-1">💰 Weekly Target</span>
                    <span className="font-bold text-[#4A3000] text-xl">${weeklyTarget}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 border-2 border-green-300">
                  <span className="text-green-800 text-xs font-semibold block mb-1">🎯 Total Goal</span>
                  <span className="font-bold text-green-700 text-2xl">${Number(weeklyTarget) * Number(duration)}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b-2 border-dashed border-[#8B6914]/30">
                  <span className="text-[#6B4F0F] font-medium">Strategy</span>
                  <span className="font-bold text-[#4A3000] bg-[#FFB347]/30 px-4 py-2 rounded-lg">
                    {strategies.find(s => s.id === selectedStrategy)?.name || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b-2 border-dashed border-[#8B6914]/30">
                  <span className="text-[#6B4F0F] font-medium">Room Type</span>
                  <span className="font-bold text-[#4A3000] flex items-center gap-2">
                    {isPrivate ? "🔒 Private" : "🌐 Public"}
                  </span>
                </div>

                {isTestMode && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-[#6B4F0F] font-medium">Mode</span>
                    <span className="font-bold text-[#E89530] bg-[#FF8C00]/20 px-4 py-2 rounded-lg">
                      🧪 Test Mode
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/20 border-2 border-[#FFB347]/60 rounded-xl p-5">
              <p className="font-bold text-[#4A3000] mb-3 flex items-center gap-2 text-lg">
                <span>⚠️</span> Important Information
              </p>
              <ul className="text-[#4A3000] text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-base">🔒</span>
                  <span>Strategy cannot be changed once the room starts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-base">📅</span>
                  <span>Deposits must be made weekly to stay eligible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-base">🏆</span>
                  <span>Rewards distributed at the end based on consistency</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(3)}
                disabled={createLoading}
                className="flex-1 py-3 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={createLoading}
                className="flex-1 py-3 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LottieSpinner size={24} />
                    Creating...
                  </span>
                ) : "Create Room"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
