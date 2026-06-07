import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ColorMode, Orientation, PaperSize, type PrintConfig } from '@printslot/shared';
import { FilePickerCard } from '../components/FilePickerCard';
import type { WizardFile } from '../types';

jest.mock('expo-image', () => {
  const { Image } = require('react-native');

  return { Image };
});

jest.mock('@/components/shared/PrintConfigForm', () => ({
  PrintConfigForm: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, 'PrintConfigForm mock');
  },
}));

const config: PrintConfig = {
  colorMode: ColorMode.COLOR,
  paperSize: PaperSize.A4,
  orientation: Orientation.PORTRAIT,
  copies: 1,
  duplex: false,
  pageRange: null,
};

function makeFile(overrides: Partial<WizardFile> = {}): WizardFile {
  return {
    localId: 'local-1',
    localFile: {
      uri: 'file:///tmp/syllabus.pdf',
      name: 'syllabus.pdf',
      mimeType: 'application/pdf',
      size: 1_572_864,
    },
    upload: {
      fileUrl: 'https://cdn.test/syllabus.pdf',
      fileName: 'syllabus.pdf',
      mimeType: 'application/pdf',
      fileSize: 1_572_864,
      detectedPages: 8,
    },
    uploadStatus: 'done',
    manualPages: null,
    config,
    ...overrides,
  };
}

describe('FilePickerCard', () => {
  it('renders file name and size', () => {
    const { getByText } = render(
      <FilePickerCard
        file={makeFile()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(getByText('syllabus.pdf')).toBeTruthy();
    expect(getByText('1.5 MB')).toBeTruthy();
  });

  it('shows upload spinner while uploading', () => {
    const { getByTestId } = render(
      <FilePickerCard
        file={makeFile({ upload: null, uploadStatus: 'uploading' })}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId('file-uploading-local-1')).toBeTruthy();
  });

  it('shows retry button when upload failed', () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = render(
      <FilePickerCard
        file={makeFile({
          upload: null,
          uploadStatus: 'error',
          uploadError: 'File too large',
        })}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={onRetry}
      />,
    );

    expect(getByText('File too large')).toBeTruthy();

    fireEvent.press(getByTestId('file-retry-local-1'));

    expect(onRetry).toHaveBeenCalledWith('local-1');
  });

  it('shows manual page input only for non-PDF files', () => {
    const { getByTestId, rerender, queryByTestId } = render(
      <FilePickerCard
        file={makeFile({
          localFile: {
            uri: 'file:///tmp/photo.png',
            name: 'photo.png',
            mimeType: 'image/png',
            size: 524_288,
          },
          upload: {
            fileUrl: 'https://cdn.test/photo.png',
            fileName: 'photo.png',
            mimeType: 'image/png',
            fileSize: 524_288,
            detectedPages: null,
          },
        })}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId('manual-pages-local-1')).toBeTruthy();

    rerender(
      <FilePickerCard
        file={makeFile()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(queryByTestId('manual-pages-local-1')).toBeNull();
  });

  it('toggles PrintConfigForm visibility with Configure', () => {
    const { getByText, queryByText } = render(
      <FilePickerCard
        file={makeFile()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(queryByText('PrintConfigForm mock')).toBeNull();

    fireEvent.press(getByText('Configure'));

    expect(getByText('PrintConfigForm mock')).toBeTruthy();
  });

  it('calls onRemove with localId', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <FilePickerCard
        file={makeFile()}
        onChange={jest.fn()}
        onRemove={onRemove}
        onRetry={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('file-remove-local-1'));

    expect(onRemove).toHaveBeenCalledWith('local-1');
  });
});
