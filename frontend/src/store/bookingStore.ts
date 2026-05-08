import { create } from 'zustand';

interface BookingState {
  startDate: string;
  endDate: string;
  pickupTime: string;
  quantity: number;
  availableQuantity: number | null;
  
  setDates: (start: string, end: string) => void;
  setPickupTime: (time: string) => void;
  setQuantity: (qty: number) => void;
  setAvailableQuantity: (qty: number | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  startDate: '',
  endDate: '',
  pickupTime: '10:00',
  quantity: 1,
  availableQuantity: null,

  setDates: (start, end) => set({ startDate: start, endDate: end }),
  setPickupTime: (time) => set({ pickupTime: time }),
  setQuantity: (qty) => set({ quantity: qty }),
  setAvailableQuantity: (qty) => set({ availableQuantity: qty }),
  reset: () => set({ startDate: '', endDate: '', pickupTime: '10:00', quantity: 1, availableQuantity: null })
}));
