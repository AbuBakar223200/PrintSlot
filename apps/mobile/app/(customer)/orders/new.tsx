import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  OrderCreationWizardScreen,
} from '@/features/orders/screens/OrderCreationWizardScreen';
import type { OrderWizardMode } from '@/features/orders/store/orderStore';

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function parseMode(value?: string | string[]): OrderWizardMode | null {
  const mode = firstParam(value);

  if (mode === 'QUEUE' || mode === 'SLOT') {
    return mode;
  }

  return null;
}

export default function NewOrderScreen() {
  const params = useLocalSearchParams<{
    shopId?: string | string[];
    mode?: string | string[];
  }>();

  return (
    <OrderCreationWizardScreen
      mode={parseMode(params.mode)}
      shopId={firstParam(params.shopId)}
    />
  );
}
