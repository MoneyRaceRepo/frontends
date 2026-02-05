"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { HiSparkles, HiCheckCircle, HiLockClosed, HiUserGroup, HiLightBulb, HiExclamationCircle } from "react-icons/hi";
import { RiVipCrownFill, RiVipCrown2Fill } from "react-icons/ri";
import { FaInfinity, FaRocket } from "react-icons/fa";

// Plan Type Definition
type PlanType = "FREE" | "VIP" | "SUPER_VIP";

interface UsageData {
  publicRooms: { used: number; max: number | "unlimited" };
  privateRooms: { used: number; max: number | "unlimited" };
  aiRecommendation: { used: number; max: number | "unlimited" };
}

export default function HistoryPage() {
  // Dummy state - bisa diganti dengan state management atau API
  const [currentPlan, setCurrentPlan] = useState<PlanType>("FREE");

  // Dummy usage data untuk testing
  const [usage, setUsage] = useState<UsageData>({
    publicRooms: { used: 2, max: 5 },
    privateRooms: { used: 1, max: 3 },
    aiRecommendation: { used: 3, max: 5 }
  });

  // Function untuk simulasi ganti plan (development only)
  const handlePlanChange = (plan: PlanType) => {
    setCurrentPlan(plan);
    // Update usage limits berdasarkan plan
    if (plan === "FREE") {
      setUsage({
        publicRooms: { used: 2, max: 5 },
        privateRooms: { used: 1, max: 3 },
        aiRecommendation: { used: 3, max: 5 }
      });
    } else if (plan === "VIP") {
      setUsage({
        publicRooms: { used: 2, max: "unlimited" },
        privateRooms: { used: 1, max: "unlimited" },
        aiRecommendation: { used: 3, max: 1000 }
      });
    } else {
      setUsage({
        publicRooms: { used: 2, max: "unlimited" },
        privateRooms: { used: 1, max: "unlimited" },
        aiRecommendation: { used: 3, max: "unlimited" }
      });
    }
  };

  // Check if any limit is reached
  const hasReachedLimit = currentPlan === "FREE" && (
    (usage.publicRooms.max !== "unlimited" && usage.publicRooms.used >= usage.publicRooms.max) ||
    (usage.privateRooms.max !== "unlimited" && usage.privateRooms.used >= usage.privateRooms.max) ||
    (usage.aiRecommendation.max !== "unlimited" && usage.aiRecommendation.used >= usage.aiRecommendation.max)
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-white text-xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          SUBSCRIPTION & PLANS
        </h2>
        <p className="text-white/80 text-sm">Pilih plan yang sesuai dengan kebutuhan Anda</p>
      </div>

      {/* Warning Banner if limit reached */}
      {hasReachedLimit && (
        <div className="mb-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-2 text-white">
            <HiExclamationCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Batas Kuota Tercapai!</p>
              <p className="text-xs opacity-90">Upgrade ke VIP atau Super VIP untuk melanjutkan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Dev Only: Plan Simulator */}
      <div className="mb-6 bg-gradient-to-r from-[#E8D5A8] to-[#D4C5A0] border-2 border-[#D4A84B] rounded-xl p-4 shadow-lg">
        <p className="text-[#4A3000] text-xs font-semibold mb-2">🛠️ Development Only - Plan Simulator:</p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePlanChange("FREE")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPlan === "FREE"
                ? "bg-gradient-to-r from-[#8B6914] to-[#6B5010] text-white shadow-md"
                : "bg-white text-[#8B6914] border-2 border-[#D4A84B]/40 hover:border-[#D4A84B]"
            }`}
          >
            Simulasi FREE
          </button>
          <button
            onClick={() => handlePlanChange("VIP")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPlan === "VIP"
                ? "bg-gradient-to-r from-[#8B6914] to-[#6B5010] text-white shadow-md"
                : "bg-white text-[#8B6914] border-2 border-[#D4A84B]/40 hover:border-[#D4A84B]"
            }`}
          >
            Simulasi VIP
          </button>
          <button
            onClick={() => handlePlanChange("SUPER_VIP")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPlan === "SUPER_VIP"
                ? "bg-gradient-to-r from-[#8B6914] to-[#6B5010] text-white shadow-md"
                : "bg-white text-[#8B6914] border-2 border-[#D4A84B]/40 hover:border-[#D4A84B]"
            }`}
          >
            Simulasi SUPER VIP
          </button>
        </div>
      </div>

      {/* Usage Summary */}
      <div className="mb-6 bg-[#F5EDD8] rounded-xl p-4 border-2 border-[#D4A84B]/40 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <HiSparkles className="w-4 h-4 text-[#8B6914]" />
          <h3 className="text-[#4A3000] font-bold text-sm">Ringkasan Penggunaan Anda</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Public Rooms */}
          <UsageCard
            title="Public Room Creation"
            icon={<HiUserGroup className="w-4 h-4" />}
            used={usage.publicRooms.used}
            max={usage.publicRooms.max}
          />

          {/* Private Rooms */}
          <UsageCard
            title="Private Room Creation"
            icon={<HiLockClosed className="w-4 h-4" />}
            used={usage.privateRooms.used}
            max={usage.privateRooms.max}
          />

          {/* AI Recommendation */}
          <UsageCard
            title="AI Recommendation"
            icon={<HiLightBulb className="w-4 h-4" />}
            used={usage.aiRecommendation.used}
            max={usage.aiRecommendation.max}
          />
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* FREE Plan */}
        <PlanCard
          planType="FREE"
          title="Free"
          icon={<FaRocket className="w-8 h-8" />}
          badge={currentPlan === "FREE" ? "Current Plan" : null}
          badgeColor="bg-gray-500"
          price="Gratis"
          features={[
            { label: "Public Room Creation", value: "Maksimal 5 kali" },
            { label: "Private Room Creation", value: "Maksimal 3 kali" },
            { label: "AI Recommendation", value: "Maksimal 5 kali" },
            { label: "Akses fitur dasar", value: "✓" }
          ]}
          buttonText={currentPlan === "FREE" ? "Current Plan" : "Downgrade"}
          buttonDisabled={currentPlan === "FREE"}
          onUpgrade={() => handlePlanChange("FREE")}
          gradient="from-gray-400 to-gray-500"
          currentPlan={currentPlan}
        />

        {/* VIP Plan */}
        <PlanCard
          planType="VIP"
          title="VIP"
          icon={<RiVipCrownFill className="w-8 h-8" />}
          badge={currentPlan === "VIP" ? "Current Plan" : "Recommended"}
          badgeColor={currentPlan === "VIP" ? "bg-purple-500" : "bg-blue-500"}
          price="$9.99/bulan"
          features={[
            { label: "Public Room Creation", value: "Unlimited" },
            { label: "Private Room Creation", value: "Unlimited" },
            { label: "AI Recommendation", value: "Maksimal 1000 kali" },
            { label: "Priority support", value: "✓" },
            { label: "Advanced analytics", value: "✓" }
          ]}
          buttonText={currentPlan === "VIP" ? "Current Plan" : "Upgrade to VIP"}
          buttonDisabled={currentPlan === "VIP"}
          onUpgrade={() => handlePlanChange("VIP")}
          gradient="from-purple-500 to-purple-700"
          currentPlan={currentPlan}
          isRecommended={currentPlan !== "VIP"}
        />

        {/* SUPER VIP Plan */}
        <PlanCard
          planType="SUPER_VIP"
          title="Super VIP"
          icon={<RiVipCrown2Fill className="w-8 h-8" />}
          badge={currentPlan === "SUPER_VIP" ? "Current Plan" : "Best Value"}
          badgeColor={currentPlan === "SUPER_VIP" ? "bg-amber-500" : "bg-gradient-to-r from-yellow-400 to-amber-500"}
          price="$29.99/bulan"
          features={[
            { label: "Public Room Creation", value: "Unlimited" },
            { label: "Private Room Creation", value: "Unlimited" },
            { label: "AI Recommendation", value: "Unlimited" },
            { label: "24/7 Priority support", value: "✓" },
            { label: "Advanced analytics", value: "✓" },
            { label: "Exclusive features", value: "✓" },
            { label: "Early access", value: "✓" }
          ]}
          buttonText={currentPlan === "SUPER_VIP" ? "Current Plan" : "Upgrade to Super VIP"}
          buttonDisabled={currentPlan === "SUPER_VIP"}
          onUpgrade={() => handlePlanChange("SUPER_VIP")}
          gradient="from-amber-400 to-amber-600"
          currentPlan={currentPlan}
          isPremium
        />
      </div>

      {/* Info Section */}
      <div className="bg-[#F5EDD8] rounded-lg p-4 border border-[#D4A84B]/30">
        <h4 className="text-[#4A3000] font-bold text-sm mb-2">ℹ️ Informasi Penting:</h4>
        <ul className="text-[#6B4F0F] text-xs space-y-1">
          <li>• Upgrade dapat dilakukan kapan saja</li>
          <li>• Downgrade akan berlaku di periode billing berikutnya</li>
          <li>• Kuota direset setiap bulan untuk plan berbayar</li>
          <li>• Semua transaksi aman dan terenkripsi</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}

// Usage Card Component
interface UsageCardProps {
  title: string;
  icon: React.ReactNode;
  used: number;
  max: number | "unlimited";
}

function UsageCard({ title, icon, used, max }: UsageCardProps) {
  const isUnlimited = max === "unlimited";
  const percentage = !isUnlimited ? (used / (max as number)) * 100 : 0;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && used >= (max as number);

  return (
    <div className="bg-[#E8DCC0] rounded-lg p-3 border border-[#D4A84B]/30">
      <div className="flex items-center gap-1.5 mb-2 text-[#8B6914]">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>

      {isUnlimited ? (
        <div className="flex items-center gap-2 text-[#4A3000]">
          <FaInfinity className="w-4 h-4 text-green-600" />
          <span className="font-bold text-sm">Unlimited</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${isAtLimit ? 'text-red-600' : 'text-[#4A3000]'}`}>
              {used} / {max}
            </span>
            <span className="text-[10px] text-[#8B6914]/70">{percentage.toFixed(0)}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#D4A84B]/30 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAtLimit
                  ? 'bg-red-500'
                  : isNearLimit
                  ? 'bg-orange-500'
                  : 'bg-gradient-to-r from-green-400 to-green-600'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// Plan Card Component
interface PlanCardProps {
  planType: PlanType;
  title: string;
  icon: React.ReactNode;
  badge: string | null;
  badgeColor: string;
  price: string;
  features: { label: string; value: string }[];
  buttonText: string;
  buttonDisabled: boolean;
  onUpgrade: () => void;
  gradient: string;
  currentPlan: PlanType;
  isRecommended?: boolean;
  isPremium?: boolean;
}

function PlanCard({
  planType,
  title,
  icon,
  badge,
  badgeColor,
  price,
  features,
  buttonText,
  buttonDisabled,
  onUpgrade,
  gradient,
  currentPlan,
  isRecommended,
  isPremium
}: PlanCardProps) {
  const isCurrentPlan = currentPlan === planType;

  return (
    <div className={`relative bg-[#F5EDD8] rounded-xl p-4 border-2 transition-all duration-300 ${
      isCurrentPlan
        ? 'border-[#D4A84B] shadow-2xl scale-105'
        : isPremium
        ? 'border-amber-400/60 hover:border-amber-400 hover:shadow-xl'
        : isRecommended
        ? 'border-purple-400/60 hover:border-purple-400 hover:shadow-xl'
        : 'border-[#D4A84B]/40 hover:border-[#D4A84B] hover:shadow-lg'
    }`}>
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
          <span className={`${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5`}>
            {isCurrentPlan ? (
              <HiCheckCircle className="w-3 h-3" />
            ) : (
              <HiSparkles className="w-3 h-3" />
            )}
            {badge}
          </span>
        </div>
      )}

      {/* Icon & Title */}
      <div className="flex flex-col items-center mb-4 mt-1">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg mb-2`}>
          <div className="scale-75">
            {icon}
          </div>
        </div>
        <h3 className="text-[#4A3000] font-bold text-lg mb-0.5">{title}</h3>
        <p className="text-[#8B6914] text-sm font-semibold">{price}</p>
      </div>

      {/* Features List */}
      <div className="space-y-2 mb-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-1.5">
            <HiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[#4A3000] text-xs font-medium leading-tight">{feature.label}</p>
              <p className="text-[#8B6914]/70 text-[10px]">{feature.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onUpgrade}
        disabled={buttonDisabled}
        className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all duration-200 ${
          buttonDisabled
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : `bg-gradient-to-r ${gradient} text-white hover:shadow-xl hover:scale-105`
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}
