import { create } from 'zustand';
import type { WizardFile } from '@/features/upload/types';

export type OrderWizardMode = 'QUEUE' | 'SLOT';
export type OrderWizardPaymentMethod = 'WALLET' | 'CASH';
export type OrderWizardStep = 1 | 2 | 3 | 4;

export interface OrderWizardState {
  shopId: string | null;
  mode: OrderWizardMode | null;
  slotId: string | null;
  files: WizardFile[];
  paymentMethod: OrderWizardPaymentMethod | null;
  step: OrderWizardStep;
  totalPrice: number | null;
  previewedAt: number | null;
}

export interface OrderWizardActions {
  init: (shopId: string, mode: OrderWizardMode) => void;
  setSlot: (slotId: string) => void;
  addFile: (file: WizardFile) => void;
  updateFile: (localId: string, patch: Partial<WizardFile>) => void;
  removeFile: (localId: string) => void;
  setPaymentMethod: (method: OrderWizardPaymentMethod) => void;
  setStep: (step: OrderWizardStep) => void;
  setPreview: (totalPrice: number) => void;
  reset: () => void;
}

const initialState: OrderWizardState = {
  shopId: null,
  mode: null,
  slotId: null,
  files: [],
  paymentMethod: null,
  step: 1,
  totalPrice: null,
  previewedAt: null,
};

function withoutPreview(state: Pick<OrderWizardState, 'totalPrice' | 'previewedAt'>) {
  if (state.totalPrice === null && state.previewedAt === null) {
    return {};
  }

  return {
    totalPrice: null,
    previewedAt: null,
  };
}

export const useOrderWizardStore = create<OrderWizardState & OrderWizardActions>()(
  (set) => ({
    ...initialState,

    init: (shopId, mode) => {
      set({
        ...initialState,
        shopId,
        mode,
      });
    },

    setSlot: (slotId) => {
      set({ slotId });
    },

    addFile: (file) => {
      set((state) => ({
        files: [...state.files, file],
        ...withoutPreview(state),
      }));
    },

    updateFile: (localId, patch) => {
      set((state) => ({
        files: state.files.map((file) => (
          file.localId === localId ? { ...file, ...patch } : file
        )),
        ...withoutPreview(state),
      }));
    },

    removeFile: (localId) => {
      set((state) => ({
        files: state.files.filter((file) => file.localId !== localId),
        ...withoutPreview(state),
      }));
    },

    setPaymentMethod: (paymentMethod) => {
      set({ paymentMethod });
    },

    setStep: (step) => {
      set({ step });
    },

    setPreview: (totalPrice) => {
      set({
        totalPrice,
        previewedAt: Date.now(),
      });
    },

    reset: () => {
      set(initialState);
    },
  }),
);
