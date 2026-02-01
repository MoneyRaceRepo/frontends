"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { aiAPI, roomAPI, convertCreateRoomData } from "@/lib/api";

type Step = 1 | 2 | 3 | 4 | 5;

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
      // Call AI API
      const response = await aiAPI.getRecommendation(aiPrompt);

      if (response.success && response.strategies) {
        // Map strategies to include IDs
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
        // Fallback to mock data if AI fails
        setStrategies([
          {
            id: 0,
            name: "Stable",
            expectedReturn: 3.5,
            risk: 15,
            description: "Conservative approach with stable, low-risk deposits. Best for emergency funds and short-term goals.",
          },
          {
            id: 1,
            name: "Balanced",
            expectedReturn: 6.5,
            risk: 35,
            description: "Moderate risk-reward balance. Suitable for medium-term savings with some flexibility.",
          },
          {
            id: 2,
            name: "Growth",
            expectedReturn: 12.0,
            risk: 60,
            description: "Aggressive strategy targeting higher returns. Requires consistent deposits and longer commitment.",
          },
        ]);
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error("AI recommendation error:", err);
      setError(err.message || "Failed to get AI recommendations. Using default strategies.");

      // Use fallback strategies
      setStrategies([
        {
          id: 0,
          name: "Stable",
          expectedReturn: 3.5,
          risk: 15,
          description: "Conservative approach with stable, low-risk deposits.",
        },
        {
          id: 1,
          name: "Balanced",
          expectedReturn: 6.5,
          risk: 35,
          description: "Moderate risk-reward balance.",
        },
        {
          id: 2,
          name: "Growth",
          expectedReturn: 12.0,
          risk: 60,
          description: "Aggressive strategy targeting higher returns.",
        },
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
      // Convert UI data to backend format
      const roomData = convertCreateRoomData({
        name: roomName,
        duration: Number(duration),
        weeklyTarget: Number(weeklyTarget),
        strategyId: selectedStrategy,
      });

      // Call create room API
      const response = await roomAPI.createRoom(roomData);

      if (response.success) {
        alert("Room created successfully!");
        router.push("/dashboard");
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set up your saving room details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="e.g., Emergency Fund, Vacation Savings"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 12"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weeklyTarget">Weekly Target ($)</Label>
                <Input
                  id="weeklyTarget"
                  type="number"
                  placeholder="e.g., 100"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => setCurrentStep(2)}
                  disabled={!roomName || !duration || !weeklyTarget}
                >
                  Next: AI Strategy
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>AI Strategy Recommendation</CardTitle>
              <CardDescription>
                Describe your saving goals and let AI recommend the best strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-yellow-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <Label htmlFor="aiPrompt">What are you saving for?</Label>
                <Textarea
                  id="aiPrompt"
                  placeholder="e.g., I want to build an emergency fund for unexpected expenses. I prefer low risk and steady growth."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Be specific about your goals, risk tolerance, and time horizon.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                  disabled={aiLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleAISubmit}
                  disabled={!aiPrompt || aiLoading}
                  className="flex-1"
                >
                  {aiLoading ? "Analyzing..." : "Get AI Recommendations"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  Based on your input: "{aiPrompt}"
                </CardDescription>
              </CardHeader>
            </Card>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-yellow-800 text-sm">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {strategies.map((strategy) => (
                <Card
                  key={strategy.id}
                  className={`cursor-pointer transition-all ${
                    selectedStrategy === strategy.id
                      ? "ring-2 ring-blue-600 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedStrategy(strategy.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {strategy.name}
                      {selectedStrategy === strategy.id && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Expected Return</span>
                        <span className="font-semibold text-green-600">
                          {strategy.expectedReturn}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Risk Level</span>
                        <span className="font-semibold text-orange-600">
                          {strategy.risk}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={selectedStrategy === null}
                className="flex-1"
              >
                Next: Review
              </Button>
            </div>
          </div>
        );

      case 4:
        const selectedStrategyObj = strategies.find((s) => s.id === selectedStrategy);
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Review & Confirm</CardTitle>
              <CardDescription>Check your saving room details before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Room Name</span>
                  <span className="font-semibold">{roomName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold">{duration} weeks</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Weekly Target</span>
                  <span className="font-semibold">${weeklyTarget}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Total Goal</span>
                  <span className="font-semibold text-blue-600">
                    ${Number(weeklyTarget) * Number(duration)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Strategy</span>
                  <span className="font-semibold">{selectedStrategyObj?.name || "N/A"}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">⚠️ Important</p>
                <ul className="text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Strategy cannot be changed once the room starts</li>
                  <li>Deposits must be made weekly</li>
                  <li>Rewards distributed at the end based on consistency</li>
                  <li>This is a demo - not real financial advice</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1"
                  disabled={createLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  className="flex-1"
                  disabled={createLoading}
                >
                  {createLoading ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">
            Money<span className="text-blue-600">Race</span>
          </h1>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      currentStep > step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-2xl mx-auto mt-2 text-xs text-gray-600">
            <span>Basic Info</span>
            <span>AI Strategy</span>
            <span>Choose</span>
            <span>Review</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{renderStep()}</main>
    </div>
  );
}
