import { create } from 'zustand';
import type { LucideIcon } from './icons';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  icon?: LucideIcon;
  tone?: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

/**
 * F5 — Toast store. Transient, non-blocking confirmations/errors. `ToastHost`
 * renders the queue; call the `toast()` helper from anywhere.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (toast) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper — show a toast from event handlers / mutations. */
export function toast(message: string, opts?: { icon?: LucideIcon; tone?: ToastTone }) {
  useToastStore.getState().show({ message, icon: opts?.icon, tone: opts?.tone });
}
