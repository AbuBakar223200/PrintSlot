import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Slot } from '@printslot/shared';
import { apiFetch } from '@/services/api';
import { SlotPicker } from '../components/SlotPicker';

let mockLastFlashListProps: any;

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    FlashList: (props: any) => {
      mockLastFlashListProps = props;
      const { data, keyExtractor, ListEmptyComponent, renderItem, testID } = props;

      return (
        <View testID={testID}>
          {data.length === 0
            ? ListEmptyComponent
            : data.map((item: unknown, index: number) => (
              <React.Fragment key={keyExtractor(item, index)}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))}
        </View>
      );
    },
  };
});

const mockApiFetch = apiFetch as jest.Mock;

const slot: Slot = {
  id: 'slot-1',
  shopId: 'shop-1',
  templateId: 'template-1',
  date: '2026-06-07T00:00:00.000Z',
  isOpen: true,
  maxOrders: 10,
  currentCount: 4,
  template: {
    id: 'template-1',
    startTime: '09:00',
    endTime: '09:30',
    deletedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

function renderSlotPicker(onChange = jest.fn()) {
  const client = createClient();

  return {
    ...render(
      <QueryClientProvider client={client}>
        <SlotPicker shopId="shop-1" value={null} onChange={onChange} />
      </QueryClientProvider>,
    ),
    client,
    onChange,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 5, 7, 10, 15) });
  mockApiFetch.mockReset();
  mockLastFlashListProps = undefined;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SlotPicker', () => {
  it('defaults the selected date to today and renders four date chips', async () => {
    mockApiFetch.mockResolvedValueOnce([slot]);

    const { getByTestId, getByText } = renderSlotPicker();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1/slots?date=2026-06-07');
    });

    expect(getByText('Today')).toBeTruthy();
    expect(getByTestId('slot-picker-date-2026-06-07')).toBeTruthy();
    expect(getByTestId('slot-picker-date-2026-06-08')).toBeTruthy();
    expect(getByTestId('slot-picker-date-2026-06-09')).toBeTruthy();
    expect(getByTestId('slot-picker-date-2026-06-10')).toBeTruthy();
  });

  it('changes the query date when a different date chip is selected', async () => {
    mockApiFetch.mockResolvedValue([]);

    const { getByTestId } = renderSlotPicker();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1/slots?date=2026-06-07');
    });

    fireEvent.press(getByTestId('slot-picker-date-2026-06-08'));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1/slots?date=2026-06-08');
    });
  });

  it('invokes onChange with the selected slot id when a slot chip is tapped', async () => {
    mockApiFetch.mockResolvedValueOnce([slot]);
    const onChange = jest.fn();

    const { getByTestId } = renderSlotPicker(onChange);

    await waitFor(() => {
      expect(getByTestId('slot-picker-slot-slot-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('slot-picker-slot-slot-1'));

    expect(onChange).toHaveBeenCalledWith('slot-1');
  });

  it('passes the selected slot id as list extraData so visible chips repaint', async () => {
    mockApiFetch.mockResolvedValueOnce([slot]);
    const client = createClient();
    const onChange = jest.fn();

    const tree = (value: string | null) => (
      <QueryClientProvider client={client}>
        <SlotPicker shopId="shop-1" value={value} onChange={onChange} />
      </QueryClientProvider>
    );

    const { getByTestId, rerender } = render(tree(null));

    await waitFor(() => {
      expect(getByTestId('slot-picker-slot-slot-1')).toBeTruthy();
    });

    rerender(tree('slot-1'));

    expect(mockLastFlashListProps.extraData).toBe('slot-1');
  });

  it('renders an empty state when the API returns no slots', async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { getByText } = renderSlotPicker();

    await waitFor(() => {
      expect(getByText('No slots available for this date')).toBeTruthy();
    });
  });

  it('renders loading skeleton chips while slots are fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));

    const { getAllByTestId } = renderSlotPicker();

    expect(getAllByTestId('slot-picker-loading-chip')).toHaveLength(3);
  });
});
