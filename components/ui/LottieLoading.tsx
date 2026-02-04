"use client";

import Lottie from "lottie-react";
import loadingAnimation from "@/public/lottie/loading.json";

interface LottieLoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 40,
  md: 80,
  lg: 120,
  xl: 200,
};

export function LottieLoading({ 
  size = "md", 
  text, 
  className = "",
  fullScreen = false 
}: LottieLoadingProps) {
  const dimension = sizeMap[size];

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#2A1810] to-[#1A0F0A] ${className}`}>
        <div className="flex flex-col items-center">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{ width: sizeMap.xl, height: sizeMap.xl }}
          />
          {text && (
            <p className="mt-4 text-[#FFE4A0] text-lg font-medium animate-pulse">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        style={{ width: dimension, height: dimension }}
      />
      {text && (
        <p className="mt-2 text-[#FFE4A0]/80 text-sm font-medium">
          {text}
        </p>
      )}
    </div>
  );
}

// Inline spinner variant for buttons
export function LottieSpinner({ size = 20 }: { size?: number }) {
  return (
    <Lottie
      animationData={loadingAnimation}
      loop={true}
      style={{ width: size, height: size }}
    />
  );
}
