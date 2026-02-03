import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

// Get network from env
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'devnet' | 'mainnet') || 'testnet';

// Initialize Sui client (using JSON RPC client for SDK v2)
export const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(network),
  network: network,
});

// Package and contract IDs (will be set after deployment)
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
export const ADMIN_CAP_ID = process.env.NEXT_PUBLIC_ADMIN_CAP_ID || '';

// Module names
export const MODULES = {
  ROOM: 'room',
  VAULT: 'vault',
};

// Helper functions
export const suiUtils = {
  // Get object details
  getObject: async (objectId: string) => {
    try {
      const object = await suiClient.getObject({
        id: objectId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });
      return object;
    } catch (error) {
      console.error('Error fetching object:', error);
      throw error;
    }
  },

  // Get room details
  getRoomDetails: async (roomId: string) => {
    const room = await suiClient.getObject({
      id: roomId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });
    return room;
  },

  // Get user's rooms
  getUserRooms: async (userAddress: string) => {
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      options: {
        showContent: true,
        showType: true,
      },
    });
    return objects;
  },

  // Format address for display
  formatAddress: (address: string, start = 6, end = 4) => {
    if (!address) return '';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  },

  // Convert MIST to SUI
  mistToSui: (mist: number | string) => {
    return Number(mist) / 1_000_000_000;
  },

  // Convert SUI to MIST
  suiToMist: (sui: number | string) => {
    return Math.floor(Number(sui) * 1_000_000_000);
  },
};

// Transaction building helpers
export const txBuilder = {
  // Build create room transaction
  buildCreateRoomTx: (params: {
    name: string;
    duration: number;
    weeklyTarget: number;
    strategy: string;
  }) => {
    // This will be implemented based on Move contract structure
    return {
      packageObjectId: PACKAGE_ID,
      module: MODULES.ROOM,
      function: 'create_room',
      typeArguments: [],
      arguments: [
        params.name,
        params.duration,
        params.weeklyTarget,
        params.strategy,
      ],
    };
  },

  // Build deposit transaction
  buildDepositTx: (roomId: string, amount: number) => {
    return {
      packageObjectId: PACKAGE_ID,
      module: MODULES.ROOM,
      function: 'deposit',
      typeArguments: [],
      arguments: [roomId, amount],
    };
  },

  // Build claim reward transaction
  buildClaimRewardTx: (roomId: string) => {
    return {
      packageObjectId: PACKAGE_ID,
      module: MODULES.ROOM,
      function: 'claim_reward',
      typeArguments: [],
      arguments: [roomId],
    };
  },
};
