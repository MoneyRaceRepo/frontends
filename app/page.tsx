"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { GoldCoin } from "@/components/ui/GoldCoin";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GoogleOAuthProvider } from "@/components/GoogleOAuthProvider";
import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/store/auth.store";
import { authAPI } from "@/lib/api";
import { getOrCreateKeypairForUser } from "@/lib/keypair";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { HiExclamationCircle } from "react-icons/hi";

export default function Home() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const currentAccount = useCurrentAccount();
  const [loginError, setLoginError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Handle wallet connection - only auto-login if wallet is connected and user is not authenticated
  useEffect(() => {
    // Only proceed if there's a connected wallet and user is NOT authenticated
    if (currentAccount?.address && !isAuthenticated) {
      // Small delay to ensure this is intentional connection, not auto-connect on page load
      const timer = setTimeout(() => {
        try {
          console.log('Wallet connected:', currentAccount.address);
          // User connected wallet, login with wallet address
          login(
            {
              id: currentAccount.address,
              email: '',
              name: `Wallet User`,
              address: currentAccount.address,
            },
            '' // No token for wallet users
          );
          router.push('/dashboard');
        } catch (error: any) {
          console.error('Wallet login error:', error);
          setLoginError('Failed to connect wallet. Please try again.');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentAccount?.address, isAuthenticated, login, router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const idToken = credentialResponse.credential;

      // Decode JWT to get user info
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      // Send ID Token to backend for verification
      const authResponse = await authAPI.login(idToken);

      if (authResponse.success && authResponse.user) {
        // Generate deterministic keypair from Google sub
        const keypair = await getOrCreateKeypairForUser(payload.sub);
        const suiAddress = keypair.getPublicKey().toSuiAddress();

        // Store user in zustand with deterministic address
        login(
          {
            id: authResponse.user.sub,
            email: payload.email,
            name: payload.name || payload.email,
            address: suiAddress,
            avatar: payload.picture,
          },
          idToken
        );

        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please check your connection and try again.');
    }
  };

  return (
    <GoogleOAuthProvider>
      <main className="min-h-screen bg-gold-gradient overflow-hidden">
        {/* Header */}
        <Header />

        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-6 overflow-visible">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[600px]">
              {/* Left side - Coin */}
              <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                <div className="relative">
                  <GoldCoin size="xl" animate={true} />
                  {/* Shadow effect */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-8 rounded-full opacity-40 blur-2xl"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(139, 112, 32, 0.6), transparent)',
                    }}
                  />
                </div>
              </div>

              {/* Right side - Content */}
              <div className="text-center lg:text-left order-1 lg:order-2 space-y-6">
                {/* Tagline */}
                <h1
                  className="text-3xl md:text-5xl lg:text-5xl font-black text-white leading-tight tracking-tight"
                  style={{
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    textShadow: '3px 3px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  &quot;SAVE TOGETHER. DECIDE YOUR<br />STRATEGY. EARN FAIRLY.&quot;
                </h1>

                {/* Subtitle */}
                <div className="space-y-1">
                  <p className="text-amber-100/90 text-sm md:text-base font-medium tracking-wide">
                    A GROUP SAVING GAME WHERE <span className="text-white font-bold">AI</span> HELPS YOU CHOOSE
                  </p>
                  <p className="text-amber-100/80 text-sm tracking-wide">
                    — AND REWARDS ARE SHARED BASED ON CONSISTENCY.
                  </p>
                </div>

                {/* Login Error Message */}
                {loginError && (
                  <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 flex items-center gap-2 max-w-md">
                    <HiExclamationCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                    <p className="text-red-200 text-sm">{loginError}</p>
                    <button 
                      onClick={() => setLoginError(null)}
                      className="text-red-300 hover:text-white ml-auto text-lg"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Login buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center lg:justify-start pt-4">
                  {/* Google Sign In Button */}
                  <div className="w-full max-w-xs">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setLoginError('Google sign-in failed. Please try again.')}
                      width="280"
                      text="signin_with"
                      shape="rectangular"
                      size="large"
                      logo_alignment="left"
                    />
                  </div>

                  <span className="text-amber-100/70 text-sm font-bold uppercase tracking-wider px-2">OR</span>

                  {/* Sui Wallet Connect Button */}
                  <div className="sui-wallet-button">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6" style={{ background: 'linear-gradient(180deg, #B6771D 0%, #A06B1A 100%)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="How It Works ?"
                description="Join a savings room, set your weekly deposit target, and commit to your financial goals. Each week, deposit USDC into the smart contract pool. Stay consistent to remain eligible for rewards. At the end of the challenge, consistent savers share the bonus pool while building healthy financial habits together with the community."
              />
              <FeatureCard
                title="AI-Assisted"
                description="Our intelligent AI analyzes your financial goals, risk tolerance, and saving patterns to recommend the perfect investment strategy. Get personalized suggestions for Conservative, Balanced, or Aggressive approaches. The AI continuously learns from market trends and your preferences to optimize your savings journey and maximize returns."
              />
              <FeatureCard
                title="Rewards"
                description="Earn rewards for staying consistent! Players who meet their weekly targets share from the bonus pool funded by those who miss deposits. The longer you stay committed, the bigger your share. Top performers receive additional bonuses, NFT badges, and exclusive access to premium rooms with higher reward multipliers."
              />
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #A06B1A 0%, #8B5E17 100%)' }}>
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <p
              className="text-amber-100/95 text-sm md:text-base font-semibold tracking-wider uppercase"
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              READY TO LOGIN? ENTER YOUR EMAIL TO CREATE OR USE YOUR WALLET
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              {/* Google Sign In Button */}
              <div className="w-full max-w-xs">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setLoginError('Google sign-in failed. Please try again.')}
                  width="280"
                  text="signin_with"
                  shape="rectangular"
                  size="large"
                  logo_alignment="left"
                />
              </div>

              <span className="text-amber-100/70 text-sm font-bold uppercase tracking-wider">OR</span>

              {/* Sui Wallet Connect Button */}
              <div className="sui-wallet-button">
                <ConnectButton />
              </div>
            </div>

            {/* Login Error Message */}
            {loginError && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 flex items-center gap-2 max-w-md mx-auto">
                <HiExclamationCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                <p className="text-red-200 text-sm">{loginError}</p>
                <button 
                  onClick={() => setLoginError(null)}
                  className="text-red-300 hover:text-white ml-auto text-lg"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Curved decoration */}
        <div
          className="h-32 relative"
          style={{
            background: 'linear-gradient(180deg, #8B5E17 0%, #7B542F 100%)',
            clipPath: 'ellipse(70% 100% at 50% 100%)',
          }}
        />

        {/* Footer */}
        <Footer />
      </main>
    </GoogleOAuthProvider>
  );
}

