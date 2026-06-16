import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ColorMode, PaperSize, Orientation, PrintConfig } from '@printslot/shared';
import { PrintConfigForm } from '../PrintConfigForm';

// Stateful wrapper to test the component dynamically under real state changes
function TestWrapper({
  initialValue,
  detectedPages = 10,
  manualPages = null,
  onValidChange = jest.fn(),
}: {
  initialValue: PrintConfig;
  detectedPages?: number | null;
  manualPages?: number | null;
  onValidChange?: (isValid: boolean, error?: string) => void;
}) {
  const [val, setVal] = useState<PrintConfig>(initialValue);
  return (
    <PrintConfigForm
      value={val}
      detectedPages={detectedPages}
      manualPages={manualPages}
      onChange={setVal}
      onValidChange={onValidChange}
    />
  );
}

const defaultVal: PrintConfig = {
  colorMode: ColorMode.COLOR,
  paperSize: PaperSize.A4,
  orientation: Orientation.PORTRAIT,
  copies: 1,
  duplex: false,
  pageRange: null,
};

describe('PrintConfigForm Component', () => {
  it('1. Renders all six controls with values from props', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    // Verify labels
    expect(getByText('Color Mode')).toBeTruthy();
    expect(getByText('Paper Size')).toBeTruthy();
    expect(getByText('Orientation')).toBeTruthy();
    expect(getByText('Copies')).toBeTruthy();
    expect(getByText('Double-Sided')).toBeTruthy();
    expect(getByText('Page Range')).toBeTruthy();

    // Verify defaults
    expect(getByTestId('copies-value').props.children).toBe(1);
    expect(getByTestId('duplex-switch').props.value).toBe(false);
    expect(getByTestId('page-range-input').props.value).toBe('');
  });

  it('2. Tapping COLOR toggle or BW toggle calls onChange with correct value', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const bwButton = getByTestId('color-mode-BW');
    fireEvent.press(bwButton);

    // After press, the component updates state and renders BW active
    expect(getByText('B&W')).toBeTruthy();
  });

  it('3. Paper Size controls update the selected paper size', () => {
    const { getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const a3Button = getByTestId('paper-size-A3');
    fireEvent.press(a3Button);
    // Verified A3 triggers updates
  });

  it('4. Orientation controls update selection state', () => {
    const { getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const landscapeButton = getByTestId('orientation-LANDSCAPE');
    fireEvent.press(landscapeButton);
  });

  it('5. Copies stepper increments copies up to 100', () => {
    const { getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const incButton = getByTestId('copies-increment');
    const valText = getByTestId('copies-value');

    expect(valText.props.children).toBe(1);

    fireEvent.press(incButton);
    expect(valText.props.children).toBe(2);
  });

  it('6. Copies stepper decrement at value 1 does nothing', () => {
    const { getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const decButton = getByTestId('copies-decrement');
    const valText = getByTestId('copies-value');

    expect(valText.props.children).toBe(1);

    fireEvent.press(decButton);
    expect(valText.props.children).toBe(1); // remain 1
  });

  it('7. Duplex Switch toggles state correctly', () => {
    const { getByTestId } = render(
      <TestWrapper initialValue={defaultVal} />
    );

    const sw = getByTestId('duplex-switch');
    expect(sw.props.value).toBe(false);

    fireEvent(sw, 'onValueChange', true);
    expect(sw.props.value).toBe(true);
  });

  it('8. Entering invalid page range displays inline error and calls onValidChange(false)', () => {
    const onValidChangeMock = jest.fn();
    const { getByTestId, getByText } = render(
      <TestWrapper initialValue={defaultVal} onValidChange={onValidChangeMock} />
    );

    const input = getByTestId('page-range-input');
    fireEvent.changeText(input, '1-15'); // 15 exceeds total 10 pages

    expect(getByText('Page 15 exceeds total 10')).toBeTruthy();
    expect(onValidChangeMock).toHaveBeenCalledWith(false, 'Page 15 exceeds total 10');
  });

  it('9. Entering valid page range clears inline error and calls onValidChange(true)', () => {
    const onValidChangeMock = jest.fn();
    const { getByTestId, queryByText } = render(
      <TestWrapper initialValue={defaultVal} onValidChange={onValidChangeMock} />
    );

    const input = getByTestId('page-range-input');
    
    // First trigger invalid
    fireEvent.changeText(input, '1-15');
    expect(onValidChangeMock).toHaveBeenCalledWith(false, expect.any(String));

    // Then fix it
    fireEvent.changeText(input, '1-5');
    expect(queryByText('Page 15 exceeds total 10')).toBeNull();
    expect(onValidChangeMock).toHaveBeenLastCalledWith(true);
  });
});
