import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Slot } from '@printslot/shared';
import {
  ownerSlotsService,
  type ManagedSlot,
  type UpsertSlotInput,
} from '@/features/owner/services/ownerSlotsService';

/** Query key for a shop's managed slots on a date. */
export function ownerSlotsKey(shopId: string | null | undefined, date: string) {
  return ['owner', 'slots', shopId ?? '', date] as const;
}

/** The full management list of slots for a shop + date. */
export function useOwnerSlots(shopId: string | null, date: string) {
  return useQuery({
    queryKey: ownerSlotsKey(shopId, date),
    queryFn: () => ownerSlotsService.listManagedSlots(shopId as string, date),
    enabled: !!shopId && !!date,
    staleTime: 15_000,
  });
}

/**
 * Upsert a slot (open/closed flag + max orders). On success the day's managed list
 * is invalidated so the Switch / Stepper / usage Pill re-render from the truth.
 */
export function useUpsertSlot() {
  const queryClient = useQueryClient();

  return useMutation<Slot, Error, UpsertSlotInput>({
    mutationFn: (input) => ownerSlotsService.upsertSlot(input),
    onMutate: ({ shopId, date, templateId, isOpen, maxOrders }) => {
      // Optimistically reflect the toggle/stepper so the control feels instant.
      const key = ownerSlotsKey(shopId, date);
      const previous = queryClient.getQueryData<ManagedSlot[]>(key);
      if (previous) {
        queryClient.setQueryData<ManagedSlot[]>(
          key,
          previous.map((slot) =>
            slot.templateId === templateId ? { ...slot, isOpen, maxOrders } : slot,
          ),
        );
      }
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      const ctx = context as { key: ReturnType<typeof ownerSlotsKey>; previous?: ManagedSlot[] } | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: ownerSlotsKey(input.shopId, input.date) });
    },
  });
}
