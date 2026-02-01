import { create } from 'zustand';

interface Room {
  id: string;
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
}

interface Participant {
  address: string;
  totalDeposit: number;
  depositsCount: number;
  consistencyScore: number;
}

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  isLoading: boolean;

  // Actions
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  setLoading: (loading: boolean) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  isLoading: false,

  setRooms: (rooms) => set({ rooms }),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms, room],
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
      currentRoom:
        state.currentRoom?.id === roomId
          ? { ...state.currentRoom, ...updates }
          : state.currentRoom,
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
