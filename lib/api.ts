import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== AUTH ENDPOINTS ====================
export const authAPI = {
  // Login with Google JWT (zkLogin)
  login: async (jwt: string) => {
    const response = await api.post('/auth/login', { jwt });
    return response.data;
  },

  // Verify JWT token
  verify: async (jwt: string) => {
    const response = await api.post('/auth/verify', { jwt });
    return response.data;
  },
};

// ==================== AI ENDPOINTS ====================
export const aiAPI = {
  // Get strategy recommendations based on user prompt
  getRecommendation: async (prompt: string) => {
    const response = await api.post('/ai/recommend', { prompt });
    return response.data;
  },

  // General chat with AI
  chat: async (messages: Array<{ role: string; content: string }>, options?: any) => {
    const response = await api.post('/ai/chat', { messages, options });
    return response.data;
  },

  // Get all strategies
  getStrategies: async () => {
    const response = await api.get('/ai/strategies');
    return response.data;
  },

  // Get specific strategy by ID
  getStrategy: async (id: number) => {
    const response = await api.get(`/ai/strategies/${id}`);
    return response.data;
  },
};

// ==================== ROOM ENDPOINTS ====================
export const roomAPI = {
  // List all rooms
  listRooms: async () => {
    const response = await api.get('/room');
    return response.data;
  },

  // Create a new room
  createRoom: async (data: {
    totalPeriods: number;
    depositAmount: number;
    strategyId: number;
    startTimeMs: number;
    periodLengthMs: number;
  }) => {
    const response = await api.post('/room/create', data);
    return response.data;
  },

  // Start a room (Admin only)
  startRoom: async (roomId: string) => {
    const response = await api.post('/room/start', { roomId });
    return response.data;
  },

  // Join a room
  joinRoom: async (data: {
    roomId: string;
    vaultId: string;
    coinObjectId: string;
    clockId: string;
    userAddress: string;
  }) => {
    const response = await api.post('/room/join', data);
    return response.data;
  },

  // Make a deposit
  deposit: async (data: {
    roomId: string;
    vaultId: string;
    playerPositionId: string;
    coinObjectId: string;
    clockId: string;
  }) => {
    const response = await api.post('/room/deposit', data);
    return response.data;
  },

  // Claim rewards
  claimReward: async (data: {
    roomId: string;
    vaultId: string;
    playerPositionId: string;
  }) => {
    const response = await api.post('/room/claim', data);
    return response.data;
  },

  // Get room data
  getRoom: async (roomId: string) => {
    const response = await api.get(`/room/${roomId}`);
    return response.data;
  },

  // Finalize room (Admin only)
  finalizeRoom: async (roomId: string) => {
    const response = await api.post('/room/finalize', { roomId });
    return response.data;
  },

  // Fund reward pool (Admin only)
  fundReward: async (data: {
    vaultId: string;
    coinObjectId: string;
  }) => {
    const response = await api.post('/room/fund-reward', data);
    return response.data;
  },
};

// ==================== PLAYER ENDPOINTS ====================
export const playerAPI = {
  // Get player position data
  getPosition: async (positionId: string) => {
    const response = await api.get(`/player/${positionId}`);
    return response.data;
  },
};

// ==================== USDC ENDPOINTS ====================
export const usdcAPI = {
  // Mint USDC tokens to a specific recipient
  mint: async (recipient: string, amount: number) => {
    const response = await api.post('/usdc/mint', { recipient, amount });
    return response.data;
  },

  // Get USDC balance for an address
  getBalance: async (address: string) => {
    const response = await api.get(`/usdc/balance/${address}`);
    return response.data;
  },

  // Get USDC faucet info (cooldown status)
  getFaucetInfo: async (address: string) => {
    const response = await api.get(`/usdc/faucet/${address}`);
    return response.data;
  },
};

// ==================== UTILITY FUNCTIONS ====================
// Set auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Helper to convert UI form data to BE format
export const convertCreateRoomData = (formData: {
  name: string;
  duration: number;
  weeklyTarget: number;
  strategyId: number;
}) => {
  const startTimeMs = Date.now() + 60000; // Start in 1 minute
  const periodLengthMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

  return {
    totalPeriods: formData.duration,
    depositAmount: formData.weeklyTarget,
    strategyId: formData.strategyId,
    startTimeMs,
    periodLengthMs,
  };
};
