import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ShopCard } from '@/components/shared/ShopCard';

describe('ShopCard', () => {
  it('renders the shop name and address', () => {
    const { getByText } = render(
      <ShopCard
        id="shop-1"
        name="Library Print"
        address="Campus gate"
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Library Print')).toBeTruthy();
    expect(getByText('Campus gate')).toBeTruthy();
  });

  it('invokes onPress with the shop id when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShopCard
        id="shop-1"
        name="Library Print"
        address="Campus gate"
        onPress={onPress}
      />,
    );

    fireEvent.press(getByTestId('shop-card-shop-1'));

    expect(onPress).toHaveBeenCalledWith('shop-1');
  });
});
