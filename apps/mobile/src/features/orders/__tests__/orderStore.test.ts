import { ColorMode, Orientation, PaperSize, type PrintConfig } from '@printslot/shared';
import { useOrderWizardStore } from '../store/orderStore';
import type { WizardFile } from '../../upload/types';

const printConfig: PrintConfig = {
  colorMode: ColorMode.COLOR,
  paperSize: PaperSize.A4,
  orientation: Orientation.PORTRAIT,
  copies: 1,
  duplex: false,
  pageRange: null,
};

function makeWizardFile(localId: string): WizardFile {
  return {
    localId,
    localFile: {
      uri: `file:///tmp/${localId}.pdf`,
      name: `${localId}.pdf`,
      mimeType: 'application/pdf',
      size: 1024,
    },
    upload: {
      fileUrl: `https://cdn.test/${localId}.pdf`,
      fileName: `${localId}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 4,
    },
    uploadStatus: 'done',
    manualPages: null,
    config: printConfig,
    configValid: true,
  };
}

beforeEach(() => {
  useOrderWizardStore.getState().reset();
});

describe('useOrderWizardStore', () => {
  it('init sets shop, mode, first step, and clears previous state', () => {
    useOrderWizardStore.getState().addFile(makeWizardFile('old-file'));
    useOrderWizardStore.getState().setPaymentMethod('CASH');
    useOrderWizardStore.getState().setPreview(120);

    useOrderWizardStore.getState().init('shop-x', 'QUEUE');

    expect(useOrderWizardStore.getState()).toMatchObject({
      shopId: 'shop-x',
      mode: 'QUEUE',
      slotId: null,
      files: [],
      paymentMethod: null,
      step: 1,
      totalPrice: null,
      previewedAt: null,
    });
  });

  it('adds, updates, and removes wizard files by localId', () => {
    const first = makeWizardFile('file-1');
    const second = makeWizardFile('file-2');

    useOrderWizardStore.getState().addFile(first);
    useOrderWizardStore.getState().addFile(second);
    useOrderWizardStore.getState().updateFile('file-1', {
      uploadStatus: 'error',
      uploadError: 'Network failed',
    });
    useOrderWizardStore.getState().removeFile('file-2');

    expect(useOrderWizardStore.getState().files).toEqual([
      {
        ...first,
        uploadStatus: 'error',
        uploadError: 'Network failed',
      },
    ]);
  });

  it('reset returns store to defaults', () => {
    useOrderWizardStore.getState().init('shop-x', 'SLOT');
    useOrderWizardStore.getState().setSlot('slot-1');
    useOrderWizardStore.getState().setStep(3);
    useOrderWizardStore.getState().setPaymentMethod('WALLET');
    useOrderWizardStore.getState().setPreview(90);

    useOrderWizardStore.getState().reset();

    expect(useOrderWizardStore.getState()).toMatchObject({
      shopId: null,
      mode: null,
      slotId: null,
      files: [],
      paymentMethod: null,
      step: 1,
      totalPrice: null,
      previewedAt: null,
    });
  });
});
