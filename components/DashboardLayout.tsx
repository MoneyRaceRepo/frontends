"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { usdcAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useDisconnectWallet } from "@mysten/dapp-kit";
import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { CirclePlusIcon } from "@/components/icons/CirclePlusIcon";

// Menu items for sidebar
const menuItems = [
  { icon: "dashboard", label: "DASHBOARD", href: "/dashboard" },
  { icon: "create", label: "CREATE ROOM", href: "/create-room" },
  { icon: "join", label: "JOIN ROOM", href: "/join-private" },
  { icon: "history", label: "HISTORY", href: "/history" },
];

const bottomMenuItems = [
  { icon: "signout", label: "SIGN OUT", href: "logout" },
];

// Icon components
const MenuIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    dashboard: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/>
      </svg>
    ),
    create: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    ),
    join: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 12l-4-4v3H2v2h8v3l4-4zm7-7H11v2h10v14H11v2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/>
      </svg>
    ),
    history: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
      </svg>
    ),
    profile: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
      </svg>
    ),
    setting: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    ),
    faq: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>
    ),
    signout: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
      </svg>
    ),
    room: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

interface DashboardLayoutProps {
  children: ReactNode;
  activeRoomId?: string; // For VIEW ROOM button
}

export default function DashboardLayout({ children, activeRoomId }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { mutate: disconnect } = useDisconnectWallet();
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    disconnect();
    logout();
    router.push('/');
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const executeLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  const fetchUSDCBalance = async () => {
    if (!user?.address) return;
    try {
      const response = await usdcAPI.getBalance(user.address);
      if (response.success) {
        const balanceInUsdc = response.balance / 1_000_000;
        setUsdcBalance(balanceInUsdc.toFixed(2));
      }
    } catch (error) {
      console.error('Failed to fetch USDC balance:', error);
    }
  };

  useEffect(() => {
    if (user?.address) {
      fetchUSDCBalance();
    }
  }, [user?.address]);

  // Determine active menu based on pathname
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  // Check if we're on a room detail page
  const isRoomPage = pathname?.startsWith("/room/");
  const currentRoomId = isRoomPage ? pathname?.split("/room/")[1] : activeRoomId;

  return (
    <div className="min-h-screen bg-[#B08D57] relative overflow-x-hidden">
      {/* Logo - Top Left Corner */}
      <div className="fixed left-4 lg:left-6 top-3 lg:top-4 z-20">
        <h1
          className="text-white text-xl sm:text-2xl lg:text-3xl font-bold tracking-wider leading-tight"
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          MONEY
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Image
            src="/akesoris.png"
            alt="Checkered"
            width={120}
            height={24}
            className="h-4 lg:h-6 w-auto"
          />
          <span
            className="text-white text-lg sm:text-xl lg:text-2xl font-bold tracking-wider"
            style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
          >
            RACE
          </span>
        </div>
      </div>

      {/* Sidebar - Sejajar dengan content area */}
      <aside className="fixed left-0 top-[76px] lg:top-[84px] bottom-0 w-60 sm:w-64 lg:w-72 bg-gradient-to-b from-[#B08D57] to-[#9A7B4A] z-20 flex flex-col py-6 px-4">
        {/* Navigation Menu */}
        <nav className="flex flex-col h-full">
          {/* Main Menu */}
          <ul className="space-y-1.5">
            {menuItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-[#D4A84B] to-[#C9963F] text-[#2D1F00] shadow-lg font-bold'
                      : 'text-[#FFE4A0] hover:bg-[#8B6914]/30 font-medium'
                  }`}
                  style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                >
                  <div className={`${isActive(item.href) ? 'text-[#2D1F00]' : 'text-[#FFE4A0]'}`}>
                    {item.icon === 'dashboard' ? (
                      <DashboardIcon size={24} />
                    ) : item.icon === 'create' ? (
                      <CirclePlusIcon size={24} />
                    ) : (
                      <MenuIcon type={item.icon} />
                    )}
                  </div>
                  <span className="text-[10px] leading-relaxed tracking-wide">{item.label}</span>
                </button>
              </li>
            ))}

            {/* VIEW ROOM Button - Only shows when a room is selected */}
            {currentRoomId && (
              <li>
                <button
                  onClick={() => router.push(`/room/${currentRoomId}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isRoomPage
                      ? 'bg-gradient-to-r from-[#D4A84B] to-[#C9963F] text-[#2D1F00] shadow-lg font-bold'
                      : 'text-[#FFE4A0] hover:bg-[#8B6914]/30 font-medium'
                  }`}
                  style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                >
                  <div className={`${isRoomPage ? 'text-[#2D1F00]' : 'text-[#FFE4A0]'}`}>
                    <MenuIcon type="room" />
                  </div>
                  <span className="text-[10px] leading-relaxed tracking-wide">VIEW ROOM</span>
                </button>
              </li>
            )}
          </ul>

          {/* Divider - lebih subtle */}
          <div className="my-4 mx-2 border-t border-dashed border-[#8B6914]/30"></div>

          {/* Spacer untuk push sign out ke bawah tapi tidak terlalu jauh */}
          <div className="flex-1 min-h-[100px]"></div>

          {/* Bottom Menu - Sign Out */}
          <ul className="space-y-2 pb-4">
            {bottomMenuItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => {
                    if (item.href === "logout") {
                      confirmLogout();
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-[#FFE4A0]/80 hover:bg-[#8B6914]/30 hover:text-[#FFE4A0] font-medium"
                  style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                >
                  <MenuIcon type={item.icon} />
                  <span className="text-[10px] leading-relaxed tracking-wide">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Header with Wallet Info - Fixed at top */}
      <header className="fixed top-0 right-0 left-60 sm:left-64 lg:left-72 z-30 bg-[#B08D57]/95 backdrop-blur-sm border-b-2 border-[#8B6914]/30 h-[76px] lg:h-[84px]">
        <div className="flex items-center justify-end px-4 lg:px-8 h-full gap-2 lg:gap-3">
          {/* Wallet Balance */}
          <div className="bg-[#5A4520]/40 rounded-full px-3 lg:px-5 py-2 lg:py-2.5 flex items-center gap-2 border-2 border-[#8B6914]/50 shadow-lg">
            <div className="w-6 lg:w-7 h-6 lg:h-7 rounded-full bg-[#2775CA] flex items-center justify-center">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <span className="text-white font-bold text-sm lg:text-base">{usdcBalance} USDC</span>
          </div>

          {/* User Info with Avatar */}
          <div className="bg-[#5A4520]/40 rounded-full px-3 lg:px-5 py-2 lg:py-2.5 flex items-center gap-2 lg:gap-3 border-2 border-[#8B6914]/50 shadow-lg">
            {/* Mascot Avatar */}
            <div className="flex-shrink-0">
              <Image
                src="/mascotsemut.png"
                alt="User Avatar"
                width={32}
                height={32}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full"
              />
            </div>
            {/* User Details */}
            <div className="flex flex-col">
              <span className="text-white text-xs lg:text-sm font-semibold truncate max-w-[100px] lg:max-w-[150px]">
                {user?.email || 'Wallet Connected'}
              </span>
              {user?.address && (
                <span className="text-[#FFE4A0] text-[10px] lg:text-xs font-mono">
                  {`${user.address.slice(0, 4)}...${user.address.slice(-4)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-60 sm:ml-64 lg:ml-72 pt-[76px] lg:pt-[84px] min-h-screen">
        {/* Content Area */}
        <div className="px-4 lg:px-8 py-6 pb-24 lg:pb-32">
          <div className="bg-[#C9A86C]/60 rounded-2xl lg:rounded-3xl border-2 lg:border-4 border-[#8B6914]/30 shadow-xl">
            {/* Main Content with padding */}
            <div className="px-4 lg:px-8 py-4 lg:py-6 min-h-[350px] lg:min-h-[400px] max-h-[calc(100vh-180px)] lg:max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </div>
        </div>

      </main>

      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with animation */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
            onClick={cancelLogout}
          />
          
          {/* Modal Container */}
          <div className="relative w-[95%] max-w-sm transform transition-all duration-300 scale-100">
            {/* Decorative top glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#FFB347]/30 rounded-full blur-3xl" />
            
            {/* Main Modal */}
            <div className="relative bg-gradient-to-b from-[#E8D5A8] via-[#D4A84B] to-[#B08D57] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#FFE4A0]/40">
              {/* Top pattern decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#8B6914] via-[#D4A84B] to-[#8B6914]" />
              
              {/* Content */}
              <div className="px-6 pt-8 pb-6">
                {/* Mascot with wave animation */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {/* Glow behind mascot */}
                    <div className="absolute inset-0 bg-[#FFB347]/40 rounded-full blur-xl scale-150" />
                    {/* Mascot image */}
                    <div className="relative animate-bounce">
                      <Image
                        src="/mascotsemut.png"
                        alt="Mascot"
                        width={100}
                        height={100}
                        className="w-24 h-24 drop-shadow-lg"
                      />
                    </div>
                    {/* Sad emoji bubble */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#D4A84B]">
                      <span className="text-lg">😢</span>
                    </div>
                  </div>
                </div>
                
                {/* Title */}
                <h3 
                  className="text-center text-[#2D1F00] text-base font-bold mb-2"
                  style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                >
                  Leaving Already?
                </h3>
                
                {/* Message */}
                <p className="text-center text-[#5A4520] text-sm mb-6 leading-relaxed">
                  We&apos;ll miss you! Your savings journey will be waiting when you return. 🏆
                </p>
                
                {/* Divider with coin icons */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#8B6914]/50 to-transparent" />
                  <span className="text-lg">💰</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#8B6914]/50 to-transparent" />
                </div>
                
                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  {/* Stay Button - Primary */}
                  <button
                    onClick={cancelLogout}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#FFB347] to-[#FF9500] text-[#2D1F00] font-bold rounded-2xl hover:from-[#FFC060] hover:to-[#FFB347] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border-2 border-[#FFE4A0]/50"
                    style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                  >
                    <span className="text-xs flex items-center justify-center gap-2">
                      <span>🎯</span> Stay & Save
                    </span>
                  </button>
                  
                  {/* Sign Out Button - Secondary */}
                  <button
                    onClick={executeLogout}
                    className="w-full px-6 py-3 bg-[#8B6914]/20 text-[#5A4520] font-medium rounded-xl hover:bg-[#8B6914]/30 transition-all border border-[#8B6914]/30"
                    style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
                  >
                    <span className="text-[10px] flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                      </svg>
                      Sign Out
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Bottom pattern decoration */}
              <div className="h-2 bg-gradient-to-r from-[#8B6914] via-[#D4A84B] to-[#8B6914]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
