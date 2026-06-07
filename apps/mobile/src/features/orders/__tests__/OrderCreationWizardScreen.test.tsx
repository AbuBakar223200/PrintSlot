import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ColorMode, Orientation, PaperSize, type PrintConfig } from '@printslot/shared';
import { OrderCreationWizardScreen } from '../screens/OrderCreationWizardScreen';
import { useOrderWizardStore } from '../store/orderStore';
import type { WizardFile } from '../../upload/types';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

const mockUsePreviewPrice = jest.fn();
const mockUseCreateOrder = jest.fn();
const mockUseWalletBalance = jest.fn();

jest.mock('expo-router', () => ({
  router: mockRouter,
}));

jest.mock('@/features/slots/components/SlotPicker', () => ({
  SlotPicker: ({ onChange }: { onChange: (slotId: string) => void }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

    return ReactActual.createElement(
      Pressable,
      { testID: 'slot-picker', onPress: () => onChange('slot-1') },
      ReactActual.createElement(Text, null, 'Slot picker'),
    );
  },
}));

jest.mock('@/features/upload/components/FilePickerSection', () => ({
  FilePickerSection: ({ files }: { files: WizardFile[] }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

    return ReactActual.createElement(
      Text,
      { testID: 'file-picker-section' },
      `Files ${files.length}`,
    );
  },
}));

jest.mock('../hooks/useOrders', () => ({
  usePreviewPrice: () => mockUsePreviewPrice(),
  useCreateOrder: () => mockUseCreateOrder(),
}));

jest.mock('@/features/wallet/hooks/useWallet', () => ({
  useWalletBalance: () => mockUseWalletBalance(),
}));

const config: PrintConfig = {
  colorMode: ColorMode.COLOR,
  paperSize: PaperSize.A4,
  orientation: Orientation.PORTRAIT,
  copies: 1,
  duplex: false,
  pageRange: null,
};

function makeFile(): WizardFile {
  return {
    localId: 'file-1',
    localFile: {
      uri: 'file:///tmp/doc.pdf',
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    },
    upload: {
      fileUrl: 'https://cdn.test/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 5,
    },
    uploadStatus: 'done',
    manualPages: null,
    config,
    configValid: true,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  mockUsePreviewPrice.mockReturnValue({
    mutate: jest.fn(),
    data: undefined,
    error: null,
    isPending: false,
  });
  mockUseCreateOrder.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseWalletBalance.mockReturnValue({
    data: { balance: 250 },
    isFetching: false,
    refetch: jest.fn(),
  });
  useOrderWizardStore.getState().reset();
});

describe('OrderCreationWizardScreen', () => {
  it('skips slot selection for queue mode', async () => {
    const { getByTestId } = render(
      <OrderCreationWizardScreen shopId="shop-1" mode="QUEUE" />,
    );

    await waitFor(() => {
      expect(getByTestId('order-wizard-progress').props.children).toBe('2 / 4');
    });
    expect(getByTestId('file-picker-section')).toBeTruthy();
  });

  it('starts on slot selection for slot mode', async () => {
    const { getByTestId } = render(
      <OrderCreationWizardScreen shopId="shop-1" mode="SLOT" />,
    );

    await waitFor(() => {
      expect(getByTestId('order-wizard-progress').props.children).toBe('1 / 4');
    });
    expect(getByTestId('slot-picker')).toBeTruthy();
  });

  it('disables next until a required slot is selected', async () => {
    const { getByTestId } = render(
      <OrderCreationWizardScreen shopId="shop-1" mode="SLOT" />,
    );

    await waitFor(() => {
      expect(getByTestId('order-wizard-next').props.accessibilityState.disabled).toBe(true);
    });
  });

  it('shows top-up prompt when create order returns 402', async () => {
    const mutate = jest.fn((_input, options) => {
      options.onError(Object.assign(new Error('Insufficient balance'), { statusCode: 402 }));
    });
    mockUseCreateOrder.mockReturnValue({
      mutate,
      isPending: false,
    });

    const { getByTestId } = render(
      <OrderCreationWizardScreen shopId="shop-1" mode="QUEUE" />,
    );

    await waitFor(() => {
      expect(getByTestId('order-wizard-progress').props.children).toBe('2 / 4');
    });

    act(() => {
      useOrderWizardStore.setState({
        shopId: 'shop-1',
        mode: 'QUEUE',
        step: 4,
        files: [makeFile()],
        paymentMethod: 'WALLET',
        totalPrice: 25,
        previewedAt: Date.now(),
      });
    });

    fireEvent.press(getByTestId('order-wizard-place-order'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Insufficient balance',
      'Top up your Wallet, then try placing the Order again.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Top up Wallet' }),
      ]),
    );
  });
});
