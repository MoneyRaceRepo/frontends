import Image from "next/image";

interface BrandLogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function BrandLogo({
  variant = "full",
  size = "md",
  className = ""
}: BrandLogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-24"
  };

  const sizeStyles = {
    sm: { height: 32 },
    md: { height: 48 },
    lg: { height: 64 },
    xl: { height: 96 }
  };

  if (variant === "icon") {
    return (
      <div className={`relative ${sizeClasses[size]} aspect-square ${className}`}>
        <Image
          src="/logo_money_race_coin.png"
          alt="Money Race"
          width={sizeStyles[size].height}
          height={sizeStyles[size].height}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`flex items-center ${className}`}>
        <span
          className={`font-bold tracking-wider ${
            size === "xl" ? "text-3xl" :
            size === "lg" ? "text-2xl" :
            size === "md" ? "text-xl" : "text-lg"
          }`}
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          MONEY RACE
        </span>
      </div>
    );
  }

  // Full logo (default)
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <Image
        src="/moneyracenew.png"
        alt="Money Race"
        width={300}
        height={sizeStyles[size].height}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  );
}
