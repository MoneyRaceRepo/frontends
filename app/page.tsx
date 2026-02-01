"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Money<span className="text-blue-600">Race</span>
            </h1>
            <p className="text-xl text-gray-600">
              AI-Powered Saving Game on Sui Blockchain
            </p>
          </div>

          {/* Value Proposition */}
          <div className="mb-12 space-y-4">
            <h2 className="text-3xl font-semibold text-gray-800">
              Save Together. Earn Rewards. Stay Consistent.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create saving rooms with friends, get AI-powered strategy recommendations,
              and earn rewards based on your consistency. All secured on-chain.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Recommendations</h3>
              <p className="text-gray-600">
                Get personalized saving strategies powered by AI
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">On-Chain Security</h3>
              <p className="text-gray-600">
                Your savings secured by Sui blockchain smart contracts
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Fair Rewards</h3>
              <p className="text-gray-600">
                Earn rewards weighted by your consistency and participation
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => router.push("/dashboard")}
            >
              Get Started with Google
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => {
                // Scroll to how it works section
                document.getElementById("how-it-works")?.scrollIntoView({
                  behavior: "smooth"
                });
              }}
            >
              Learn More
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-sm text-gray-500">
            <p>✓ No wallet required &nbsp;•&nbsp; ✓ Gasless transactions &nbsp;•&nbsp; ✓ Web2 UX</p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-4">
            {[
              { step: "1", title: "Login", desc: "Sign in with Google" },
              { step: "2", title: "Create Room", desc: "Set your saving goal" },
              { step: "3", title: "AI Strategy", desc: "Get recommendations" },
              { step: "4", title: "Save Weekly", desc: "Deposit consistently" },
              { step: "5", title: "Claim Rewards", desc: "Get your earnings" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Built with Sui Blockchain • Powered by zkLogin • Secured by Smart Contracts
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ⚠️ This is a demo application. Always do your own research.
          </p>
        </div>
      </footer>
    </main>
  );
}
