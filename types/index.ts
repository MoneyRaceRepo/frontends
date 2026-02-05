// User types
export interface User {
  id: string;
  email: string;
  name: string;
  address: string;
  avatar?: string;
  createdAt: string;
}

// Room types
export interface Room {
  id: string;
  objectId: string;
  name: string;
  creator: string;
  duration: number;
  weeklyTarget: number;
  currentPeriod: number;
  totalPeriods: number;
  totalDeposit: number;
  rewardPool: number;
  strategy: string;
  status: 'active' | 'ended';
  participants: Participant[];
  createdAt: string;
  endedAt?: string;
}

export interface Participant {
  address: string;
  nickname?: string;
  totalDeposit: number;
  depositsCount: number;
  consistencyScore: number;
  expectedReward?: number;
}

// Strategy types
export interface DeFiProtocol {
  name: string;
  type: string;
  apy: string;
  tvl?: string;
}

export interface Strategy {
  name: string;
  expectedReturn: number;
  risk: number;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  protocols?: DeFiProtocol[];
  allocation?: { [key: string]: number };
  suggestedTokens?: string[];
}

export interface AIRecommendation {
  strategies: Strategy[];
  analysis: string;
  reasoning: string;
}

// Transaction types
export interface Transaction {
  id: string;
  digest: string;
  type: 'deposit' | 'withdraw' | 'claim' | 'create_room';
  amount?: number;
  roomId?: string;
  sender: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Stats types
export interface PlayerStats {
  totalRooms: number;
  activeRooms: number;
  endedRooms: number;
  totalDeposited: number;
  totalRewards: number;
  averageConsistency: number;
  bestStreak: number;
}

// Form types
export interface CreateRoomForm {
  name: string;
  duration: number;
  weeklyTarget: number;
  aiPrompt: string;
  selectedStrategy: string;
}

export interface DepositForm {
  roomId: string;
  amount: number;
}
