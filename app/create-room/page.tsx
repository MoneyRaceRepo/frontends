"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { aiAPI, roomAPI, convertCreateRoomData, convertCreateRoomDataTestMode } from "@/lib/api";
import { USDC_DECIMALS } from "@/lib/constants";
import DashboardLayout from "@/components/DashboardLayout";
import { LottieLoading, LottieSpinner } from "@/components/ui/LottieLoading";
import { useToast } from "@/components/ui/Toast";
import { HiHome, HiCalendar, HiCurrencyDollar, HiLockClosed, HiBeaker, HiSparkles, HiClipboardCopy, HiCheck, HiArrowRight, HiLightBulb, HiGlobeAlt, HiExclamationCircle, HiDocumentText, HiCheckCircle } from "react-icons/hi";
import { FaRobot, FaBrain, FaShieldAlt, FaBalanceScale, FaRocket, FaCopy, FaKey, FaBullseye, FaGem, FaTrophy, FaCalendarCheck, FaInfoCircle } from "react-icons/fa";
import { RiAiGenerate, RiLockPasswordFill, RiShieldCheckFill } from "react-icons/ri";

type Step = 1 | 2 | 3 | 4;

interface DeFiProtocol {
  name: string;
  type: string;
  apy: string;
  tvl?: string;
}

interface Strategy {
  id: number;
  name: string;
  expectedReturn: number;
  risk: number;
  description: string;
  protocols?: DeFiProtocol[];
  allocation?: { [key: string]: number };
  suggestedTokens?: string[];
}

export default function CreateRoom() {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Form data
  const [roomName, setRoomName] = useState("");
  const [depositFrequency, setDepositFrequency] = useState<"daily" | "weekly">("weekly");
  const [endDate, setEndDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
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
        const mappedStrategies = response.strategies.map((s: any) => ({
          id: s.id || 0,
          name: s.name || s.strategy,
          expectedReturn: s.expectedReturn || s.return_pct || 0,
          risk: s.riskLevel === 'low' ? 15 : s.riskLevel === 'medium' ? 35 : 60,
          description: s.reasoning || s.description || "",
          protocols: s.protocols || [],
          allocation: s.allocation || {},
          suggestedTokens: s.suggestedTokens || [],
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
      toast.warning("AI Unavailable", "Using default strategies. You can still create your room!");
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
      toast.warning("Missing Selection", "Please select a strategy before continuing.");
      return;
    }

    setCreateLoading(true);
    setError("");

    try {
      // Calculate total periods from end date
      const endDateMs = new Date(endDate).getTime();
      const startDateMs = Date.now();
      const periodLengthMs = depositFrequency === "daily"
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
      const totalPeriods = Math.max(1, Math.ceil((endDateMs - startDateMs) / periodLengthMs));

      // Validate minimum duration
      if (depositFrequency === "daily" && totalPeriods < 7) {
        setError("For daily deposits, minimum duration is 7 days (1 week)");
        setCreateLoading(false);
        return;
      }
      if (depositFrequency === "weekly" && totalPeriods < 1) {
        setError("For weekly deposits, minimum duration is 1 week");
        setCreateLoading(false);
        return;
      }

      const roomData = {
        totalPeriods,
        depositAmount: Number(depositAmount) * USDC_DECIMALS, // USDC decimals
        strategyId: selectedStrategy,
        startTimeMs: startDateMs - 5000, // 5 second buffer
        periodLengthMs: isTestMode ? 60 * 1000 : periodLengthMs, // 1 min for test mode
      };

      const roomDataWithPrivacy = { ...roomData, isPrivate };
      const response = await roomAPI.createRoom(roomDataWithPrivacy);

      if (response.success) {
        if (isPrivate && response.password && response.roomId) {
          setGeneratedPassword(response.password);
          setCreatedRoomId(response.roomId);
          setShowPasswordModal(true);
        } else {
          toast.success("Room Created!", "Your savings room is ready.");
          router.push("/dashboard");
        }
      } else {
        setError(response.error || "Failed to create room");
        toast.error("Creation Failed", response.error || "Unable to create room. Please try again.");
      }
    } catch (err: any) {
      console.error("Create room error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to create room";
      setError(errorMsg);
      toast.error("Error", "Something went wrong. Please check your details and try again.");
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
            <h3 className="text-[#4A3000] font-bold text-xl mb-2 flex items-center gap-2"><HiLockClosed className="w-6 h-6" /> Private Room Created!</h3>
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
              className="w-full mb-3 py-2 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all flex items-center justify-center gap-2"
            >
              <HiClipboardCopy className="w-5 h-5" /> Copy Both (Room ID + Password)
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

      {/* Header - Full Width, Align Left (sama seperti Dashboard) */}
      <div className="mb-6">
        <h2
          className="text-white text-xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          CREATE ROOM
        </h2>
        <p className="text-white/80 text-sm">Start your savings journey with Money Race!</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-[#C9A86C]/40 rounded-2xl p-4 border-2 border-[#8B6914]/30 mb-6">
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2 ${currentStep === step
                    ? "bg-gradient-to-br from-[#FFB347] to-[#E89530] text-[#4A3000] shadow-xl scale-110 border-[#FFB347]"
                    : currentStep > step
                      ? "bg-gradient-to-br from-[#8B6914] to-[#6B4F0F] text-white shadow-md border-[#8B6914]"
                      : "bg-[#8B6914]/30 text-[#4A3000]/50 border-[#8B6914]/40"
                    }`}
                >
                  {currentStep > step ? <HiCheckCircle className="w-5 h-5" /> : step}
                </div>
                <span className={`mt-1 text-xs font-semibold transition-all ${currentStep >= step ? "text-[#4A3000]" : "text-[#4A3000]/50"
                  }`}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${currentStep > step ? "bg-gradient-to-r from-[#8B6914] to-[#8B6914]" : "bg-[#8B6914]/30"
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
              <HiClipboardCopy className="w-5 h-5 text-[#4A3000]" />
            </div>
            <div>
              <h3 className="text-[#4A3000] font-bold text-lg">Basic Information</h3>
              <p className="text-[#6B4F0F] text-xs">Set up your savings room details</p>
            </div>
          </div>

          {/* Room Name */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
            <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2">
              <HiHome className="w-5 h-5 text-[#8B6914]" />
              Room Name
            </label>
            <input
              type="text"
              placeholder="e.g., Emergency Fund, Vacation Savings"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 bg-[#FBF7EC] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
            />
          </div>

          {/* Deposit Frequency */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
            <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2">
              <HiCalendar className="w-5 h-5 text-[#8B6914]" />
              Deposit Frequency
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDepositFrequency("daily")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${depositFrequency === "daily"
                  ? "bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] border-[#D4A84B]"
                  : "bg-[#FBF7EC] text-[#6B4F0F] border-[#D4A84B]/40 hover:border-[#FFB347]"
                  }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setDepositFrequency("weekly")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${depositFrequency === "weekly"
                  ? "bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] border-[#D4A84B]"
                  : "bg-[#FBF7EC] text-[#6B4F0F] border-[#D4A84B]/40 hover:border-[#FFB347]"
                  }`}
              >
                Weekly
              </button>
            </div>
            <p className="text-xs text-[#6B4F0F] mt-1">How often do you want to deposit?</p>
          </div>

          {/* End Date */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
            <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2">
              <HiCalendar className="w-5 h-5 text-[#8B6914]" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#FBF7EC] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
            />
            <p className="text-xs text-[#6B4F0F] mt-1">
              Minimum duration: {depositFrequency === "daily" ? "7 days (1 week)" : "1 week"}
            </p>
          </div>

          {/* Deposit Amount */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
            <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2">
              <HiCurrencyDollar className="w-5 h-5 text-[#8B6914]" />
              Deposit Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4A3000] font-bold text-lg">$</span>
              <input
                type="number"
                placeholder="100"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#FBF7EC] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all"
              />
            </div>
            {endDate && depositAmount && (
              <>
                <div className="mt-2 bg-[#FFB347]/20 rounded-lg p-2 border border-[#FFB347]/40">
                  {(() => {
                    const endDateMs = new Date(endDate).getTime();
                    const startDateMs = Date.now();
                    const periodLengthMs = depositFrequency === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
                    const totalPeriods = Math.max(1, Math.ceil((endDateMs - startDateMs) / periodLengthMs));
                    const totalGoal = Number(depositAmount) * totalPeriods;
                    return (
                      <p className="text-sm text-[#4A3000] font-semibold flex items-center gap-2">
                        <HiLightBulb className="w-4 h-4 text-[#8B6914]" />
                        {totalPeriods} {depositFrequency === "daily" ? "days" : "weeks"} · Total Goal: <span className="text-green-700">${totalGoal}</span>
                      </p>
                    );
                  })()}
                </div>
                {(() => {
                  const endDateMs = new Date(endDate).getTime();
                  const startDateMs = Date.now();
                  const periodLengthMs = depositFrequency === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
                  const totalPeriods = Math.max(1, Math.ceil((endDateMs - startDateMs) / periodLengthMs));
                  const isInvalid = (depositFrequency === "daily" && totalPeriods < 7) || (depositFrequency === "weekly" && totalPeriods < 1);

                  if (isInvalid) {
                    return (
                      <div className="mt-2 bg-red-100 rounded-lg p-2 border-2 border-red-400">
                        <p className="text-sm text-red-700 font-semibold flex items-center gap-2">
                          <HiExclamationCircle className="w-4 h-4" />
                          Duration too short! Minimum {depositFrequency === "daily" ? "7 days (1 week)" : "1 week"}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
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
                  <HiLockClosed className="w-5 h-5 text-[#8B6914]" />
                  Make this a private room
                </span>
                <p className="text-xs text-[#6B4F0F] mt-1">Only people with password can join</p>
              </div>
            </label>
            {isPrivate && (
              <div className="mt-4 bg-gradient-to-r from-[#D4A84B]/20 to-[#FFB347]/20 border-2 border-[#D4A84B]/40 rounded-xl p-4">
                <p className="text-[#4A3000] text-sm font-semibold flex items-center gap-2">
                  <RiLockPasswordFill className="w-5 h-5 text-[#8B6914]" />
                  A secure password will be automatically generated for this room
                </p>
              </div>
            )}
          </div>

          {/* Test Mode - hidden from UI */}

          <button
            onClick={() => setCurrentStep(2)}
            disabled={(() => {
              // Check basic fields
              if (!roomName || !endDate || !depositAmount) return true;

              // Check minimum duration
              const endDateMs = new Date(endDate).getTime();
              const startDateMs = Date.now();
              const periodLengthMs = depositFrequency === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
              const totalPeriods = Math.max(1, Math.ceil((endDateMs - startDateMs) / periodLengthMs));

              // Daily: minimum 7 days, Weekly: minimum 1 week
              if (depositFrequency === "daily" && totalPeriods < 7) return true;
              if (depositFrequency === "weekly" && totalPeriods < 1) return true;

              return false;
            })()}
            className="w-full py-2.5 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            Next: AI Strategy <HiArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: AI Strategy */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* Header with AI Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <FaRobot className="w-5 h-5 text-[#4A3000]" />
            </div>
            <div>
              <h3 className="text-[#4A3000] font-bold text-lg">AI Strategy Recommendation</h3>
              <p className="text-[#6B4F0F] text-xs">Let AI help you choose the best strategy</p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#FFB347]/50 shadow-md">
            <p className="text-[#4A3000] text-sm font-medium flex items-start gap-2">
              <HiLightBulb className="w-5 h-5 text-[#FFB347] flex-shrink-0" />
              <span>Describe your saving goals and let our AI recommend the best investment strategy tailored to your needs!</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
              <HiExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* AI Prompt Input */}
          <div className="bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-md">
            <label className="flex items-center gap-2 text-[#4A3000] font-semibold mb-2">
              <HiSparkles className="w-5 h-5 text-[#FFB347]" />
              What are you saving for?
            </label>
            <textarea
              placeholder="Example: I want to build an emergency fund for unexpected expenses. I prefer low risk and steady growth to ensure my savings are safe."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-[#FBF7EC] rounded-xl border-2 border-[#D4A84B]/40 text-[#4A3000] placeholder-[#8B6914]/40 focus:outline-none focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/30 transition-all resize-none"
            />
            <p className="text-xs text-[#6B4F0F] mt-1">Be specific about your goals, timeline, and risk tolerance for better recommendations</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              disabled={aiLoading}
              className="flex-1 py-2.5 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all disabled:opacity-50 text-sm"
            >
              Back
            </button>
            <button
              onClick={handleAISubmit}
              disabled={!aiPrompt || aiLoading}
              className="flex-1 py-2.5 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
              <FaBullseye className="w-5 h-5 text-[#4A3000]" />
            </div>
            <div>
              <h3 className="text-[#4A3000] font-bold text-lg">AI Recommendations</h3>
              <p className="text-[#6B4F0F] text-xs">Choose the strategy that fits you best</p>
            </div>
          </div>

          {/* User Prompt Display */}
          <div className="bg-gradient-to-br from-[#D4A84B]/20 to-[#FFB347]/20 rounded-xl p-3 border-2 border-[#D4A84B]/40">
            <p className="text-xs text-[#6B4F0F] font-semibold mb-1 flex items-center gap-1"><HiDocumentText className="w-4 h-4" /> Based on your goal:</p>
            <p className="text-sm text-[#4A3000] italic line-clamp-2">"{aiPrompt}"</p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
              <HiExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Strategy Cards */}
          <div className="space-y-3">
            {strategies.map((strategy, index) => {
              const StrategyIcons = [FaShieldAlt, FaBalanceScale, FaRocket];
              const gradients = [
                "from-green-50 to-emerald-50 border-green-300",
                "from-blue-50 to-cyan-50 border-blue-300",
                "from-orange-50 to-amber-50 border-orange-300"
              ];
              const isSelected = selectedStrategy === strategy.id;

              return (
                <div
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${isSelected
                    ? "bg-gradient-to-br from-[#FFB347] to-[#E89530] border-[#D4A84B] shadow-lg scale-[1.01]"
                    : `bg-gradient-to-br ${gradients[index] || 'from-gray-50 to-gray-50 border-gray-300'} hover:shadow-md hover:scale-[1.01]`
                    }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {(() => { const IconComponent = StrategyIcons[index] || FaGem; return <IconComponent className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#4A3000]'}`} />; })()}
                      <h4 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-[#4A3000]'}`}>
                        {strategy.name}
                      </h4>
                    </div>
                    {isSelected && (
                      <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      </div>
                    )}
                  </div>

                  {/* APY and Risk */}
                  <div className="flex gap-2 mb-3">
                    <div className={`flex-1 px-3 py-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-white/80'}`}>
                      <span className={`text-xs font-semibold block ${isSelected ? 'text-white/80' : 'text-[#6B4F0F]'}`}>Expected APY</span>
                      <p className={`text-base font-bold ${isSelected ? 'text-white' : 'text-green-700'}`}>
                        {strategy.expectedReturn}%
                      </p>
                    </div>
                    <div className={`flex-1 px-3 py-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-white/80'}`}>
                      <span className={`text-xs font-semibold block ${isSelected ? 'text-white/80' : 'text-[#6B4F0F]'}`}>Risk Level</span>
                      <p className={`text-base font-bold ${isSelected ? 'text-white' : 'text-orange-700'}`}>
                        {strategy.risk === 15 ? 'Low' : strategy.risk === 35 ? 'Medium' : 'High'}
                      </p>
                    </div>
                  </div>

                  {/* DeFi Protocols */}
                  {strategy.protocols && strategy.protocols.length > 0 && (
                    <div className={`mb-3 p-3 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-white/60'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isSelected ? 'text-white/90' : 'text-[#4A3000]'}`}>
                        📊 DeFi Protocols:
                      </p>
                      <div className="space-y-1.5">
                        {strategy.protocols.map((protocol, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-[#4A3000]'}`}>
                                • {protocol.name}
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#6B4F0F]'}`}>
                                ({protocol.type})
                              </span>
                            </div>
                            <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-green-700'}`}>
                              {protocol.apy}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allocation */}
                  {strategy.allocation && Object.keys(strategy.allocation).length > 0 && (
                    <div className={`mb-3 p-3 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-white/60'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isSelected ? 'text-white/90' : 'text-[#4A3000]'}`}>
                        💰 Allocation:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(strategy.allocation).map(([key, value]) => (
                          <div key={key} className={`px-2 py-1 rounded ${isSelected ? 'bg-white/20' : 'bg-white/80'}`}>
                            <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-[#4A3000]'}`}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}: <strong>{value}%</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Tokens */}
                  {strategy.suggestedTokens && strategy.suggestedTokens.length > 0 && (
                    <div className={`mb-3 p-3 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-white/60'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isSelected ? 'text-white/90' : 'text-[#4A3000]'}`}>
                        🪙 Tokens:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {strategy.suggestedTokens.map((token, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-bold ${isSelected ? 'bg-white/30 text-white' : 'bg-[#FFB347]/30 text-[#4A3000]'
                              }`}
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description/Reasoning */}
                  <p className={`text-xs leading-relaxed ${isSelected ? 'text-white/90' : 'text-[#6B4F0F]'}`}>
                    {strategy.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-2.5 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              disabled={selectedStrategy === null}
              className="flex-1 py-2.5 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFB347] to-[#E89530] rounded-xl flex items-center justify-center shadow-lg">
              <HiCheckCircle className="w-5 h-5 text-[#4A3000]" />
            </div>
            <div>
              <h3 className="text-[#4A3000] font-bold text-lg">Review & Confirm</h3>
              <p className="text-[#6B4F0F] text-xs">Double check your room settings</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 flex items-start gap-3">
              <HiExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Room Details Card */}
          <div className="bg-gradient-to-br from-[#E8D5A8] to-[#D4A84B]/30 rounded-xl p-4 border-2 border-[#D4A84B]/50 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b-2 border-dashed border-[#8B6914]/30">
                <span className="text-[#6B4F0F] font-medium flex items-center gap-2">
                  <HiHome className="w-5 h-5 text-[#8B6914]" /> Room Name
                </span>
                <span className="font-bold text-[#4A3000] text-lg">{roomName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 rounded-xl p-3 border-2 border-[#8B6914]/20">
                  <span className="text-[#6B4F0F] text-xs font-semibold block mb-1 flex items-center gap-1"><HiCalendar className="w-4 h-4" /> Frequency</span>
                  <span className="font-bold text-[#4A3000] text-lg capitalize">{depositFrequency}</span>
                </div>
                <div className="bg-white/60 rounded-xl p-3 border-2 border-[#8B6914]/20">
                  <span className="text-[#6B4F0F] text-xs font-semibold block mb-1 flex items-center gap-1"><HiCurrencyDollar className="w-4 h-4" /> Deposit Amount</span>
                  <span className="font-bold text-[#4A3000] text-lg">${depositAmount}</span>
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-3 border-2 border-[#8B6914]/20">
                <span className="text-[#6B4F0F] text-xs font-semibold block mb-1 flex items-center gap-1"><HiCalendar className="w-4 h-4" /> End Date</span>
                <span className="font-bold text-[#4A3000] text-lg">{endDate ? new Date(endDate).toLocaleDateString() : "N/A"}</span>
              </div>

              {(() => {
                const endDateMs = new Date(endDate).getTime();
                const startDateMs = Date.now();
                const periodLengthMs = depositFrequency === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
                const totalPeriods = Math.max(1, Math.ceil((endDateMs - startDateMs) / periodLengthMs));
                const totalGoal = Number(depositAmount) * totalPeriods;
                return (
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-3 border-2 border-green-300">
                    <span className="text-green-800 text-xs font-semibold block mb-1 flex items-center gap-1"><FaBullseye className="w-4 h-4" /> Total Goal ({totalPeriods} {depositFrequency === "daily" ? "days" : "weeks"})</span>
                    <span className="font-bold text-green-700 text-xl">${totalGoal}</span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between py-2 border-b-2 border-dashed border-[#8B6914]/30">
                <span className="text-[#6B4F0F] font-medium">Strategy</span>
                <span className="font-bold text-[#4A3000] bg-[#FFB347]/30 px-3 py-1.5 rounded-lg text-sm">
                  {strategies.find(s => s.id === selectedStrategy)?.name || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b-2 border-dashed border-[#8B6914]/30">
                <span className="text-[#6B4F0F] font-medium">Room Type</span>
                <span className="font-bold text-[#4A3000] flex items-center gap-2">
                  {isPrivate ? <><HiLockClosed className="w-4 h-4" /> Private</> : <><HiGlobeAlt className="w-4 h-4" /> Public</>}
                </span>
              </div>

              {/* Test Mode info - hidden from UI */}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-br from-[#FFB347]/20 to-[#E89530]/20 border-2 border-[#FFB347]/60 rounded-xl p-3">
            <p className="font-bold text-[#4A3000] mb-2 flex items-center gap-2 text-sm">
              <FaInfoCircle className="w-4 h-4 text-[#E89530]" /> Important Information
            </p>
            <ul className="text-[#4A3000] text-xs space-y-1.5">
              <li className="flex items-start gap-2">
                <RiShieldCheckFill className="w-4 h-4 text-[#8B6914] flex-shrink-0 mt-0.5" />
                <span>Strategy cannot be changed once the room starts</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCalendarCheck className="w-4 h-4 text-[#8B6914] flex-shrink-0 mt-0.5" />
                <span>Deposits must be made {depositFrequency} to stay eligible</span>
              </li>
              <li className="flex items-start gap-2">
                <FaTrophy className="w-4 h-4 text-[#8B6914] flex-shrink-0 mt-0.5" />
                <span>Rewards distributed at the end based on consistency</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(3)}
              disabled={createLoading}
              className="flex-1 py-2.5 bg-[#8B6914]/30 text-[#4A3000] font-bold rounded-lg border-2 border-[#8B6914]/50 hover:bg-[#8B6914]/40 transition-all disabled:opacity-50 text-sm"
            >
              Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={createLoading}
              className="flex-1 py-2.5 bg-gradient-to-b from-[#FFB347] to-[#FF8C00] text-[#4A3000] font-bold rounded-lg border-2 border-[#D4A84B] shadow-lg hover:from-[#FFC967] hover:to-[#FFA030] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
    </DashboardLayout>
  );
}
