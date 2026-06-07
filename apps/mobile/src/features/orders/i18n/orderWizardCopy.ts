export const orderWizardKeys = {
  title: 'orders.wizard.title',
  cancel: 'orders.wizard.cancel',
  keepEditing: 'orders.wizard.keepEditing',
  discard: 'orders.wizard.discard',
  discardTitle: 'orders.wizard.discardTitle',
  discardBody: 'orders.wizard.discardBody',
  invalidTitle: 'orders.wizard.invalidTitle',
  invalidBody: 'orders.wizard.invalidBody',
  back: 'orders.wizard.back',
  next: 'orders.wizard.next',
  confirm: 'orders.wizard.confirm',
  placeOrder: 'orders.wizard.placeOrder',
  stepSlotTitle: 'orders.wizard.stepSlotTitle',
  stepSlotBody: 'orders.wizard.stepSlotBody',
  stepFilesTitle: 'orders.wizard.stepFilesTitle',
  stepFilesBody: 'orders.wizard.stepFilesBody',
  stepPreviewTitle: 'orders.wizard.stepPreviewTitle',
  stepPreviewBody: 'orders.wizard.stepPreviewBody',
  stepPaymentTitle: 'orders.wizard.stepPaymentTitle',
  stepPaymentBody: 'orders.wizard.stepPaymentBody',
  fileSubtotal: 'orders.wizard.fileSubtotal',
  previewLoading: 'orders.wizard.previewLoading',
  previewErrorTitle: 'orders.wizard.previewErrorTitle',
  total: 'orders.wizard.total',
  wallet: 'orders.wizard.wallet',
  cash: 'orders.wizard.cash',
  walletBalance: 'orders.wizard.walletBalance',
  cashBody: 'orders.wizard.cashBody',
  insufficientTitle: 'orders.wizard.insufficientTitle',
  insufficientBody: 'orders.wizard.insufficientBody',
  topUpWallet: 'orders.wizard.topUpWallet',
  slotFullTitle: 'orders.wizard.slotFullTitle',
  slotFullBody: 'orders.wizard.slotFullBody',
  noActiveSlotTitle: 'orders.wizard.noActiveSlotTitle',
  noActiveSlotBody: 'orders.wizard.noActiveSlotBody',
  shopUnavailableTitle: 'orders.wizard.shopUnavailableTitle',
  shopUnavailableBody: 'orders.wizard.shopUnavailableBody',
  genericErrorTitle: 'orders.wizard.genericErrorTitle',
  genericErrorBody: 'orders.wizard.genericErrorBody',
} as const;

type OrderWizardKey = typeof orderWizardKeys[keyof typeof orderWizardKeys];

const orderWizardFallbacks: Record<OrderWizardKey, string> = {
  [orderWizardKeys.title]: 'New Order',
  [orderWizardKeys.cancel]: 'Cancel',
  [orderWizardKeys.keepEditing]: 'Keep editing',
  [orderWizardKeys.discard]: 'Discard',
  [orderWizardKeys.discardTitle]: 'Discard order?',
  [orderWizardKeys.discardBody]: 'Your selected files and print configuration will be cleared.',
  [orderWizardKeys.invalidTitle]: 'Order unavailable',
  [orderWizardKeys.invalidBody]: 'Open this flow from an active Shop.',
  [orderWizardKeys.back]: 'Back',
  [orderWizardKeys.next]: 'Next',
  [orderWizardKeys.confirm]: 'Confirm',
  [orderWizardKeys.placeOrder]: 'Place Order',
  [orderWizardKeys.stepSlotTitle]: 'Choose a Slot',
  [orderWizardKeys.stepSlotBody]: 'Pick an open pickup Slot for this Shop.',
  [orderWizardKeys.stepFilesTitle]: 'Files & config',
  [orderWizardKeys.stepFilesBody]: 'Upload 1 to 10 files and configure each OrderFile.',
  [orderWizardKeys.stepPreviewTitle]: 'Price preview',
  [orderWizardKeys.stepPreviewBody]: 'Review the server-calculated total before payment.',
  [orderWizardKeys.stepPaymentTitle]: 'Payment',
  [orderWizardKeys.stepPaymentBody]: 'Choose Wallet or cash at pickup.',
  [orderWizardKeys.fileSubtotal]: '{name}: {pages} pages',
  [orderWizardKeys.previewLoading]: 'Calculating price...',
  [orderWizardKeys.previewErrorTitle]: 'Could not calculate price',
  [orderWizardKeys.total]: 'Total',
  [orderWizardKeys.wallet]: 'Wallet',
  [orderWizardKeys.cash]: 'Cash',
  [orderWizardKeys.walletBalance]: 'Balance {amount}',
  [orderWizardKeys.cashBody]: 'Pay when you collect the Order.',
  [orderWizardKeys.insufficientTitle]: 'Insufficient balance',
  [orderWizardKeys.insufficientBody]: 'Top up your Wallet, then try placing the Order again.',
  [orderWizardKeys.topUpWallet]: 'Top up Wallet',
  [orderWizardKeys.slotFullTitle]: 'Slot full',
  [orderWizardKeys.slotFullBody]: 'Please pick another Slot.',
  [orderWizardKeys.noActiveSlotTitle]: 'Print Now unavailable',
  [orderWizardKeys.noActiveSlotBody]: 'Print Now unavailable right now.',
  [orderWizardKeys.shopUnavailableTitle]: 'Shop unavailable',
  [orderWizardKeys.shopUnavailableBody]: 'This Shop is not accepting new Orders right now.',
  [orderWizardKeys.genericErrorTitle]: 'Could not place Order',
  [orderWizardKeys.genericErrorBody]: 'Please try again in a moment.',
};

export function orderWizardText(
  key: OrderWizardKey,
  values?: { amount?: string; name?: string; pages?: number },
): string {
  let template = orderWizardFallbacks[key];

  if (values?.amount !== undefined) {
    template = template.replace('{amount}', values.amount);
  }

  if (values?.name !== undefined) {
    template = template.replace('{name}', values.name);
  }

  if (values?.pages !== undefined) {
    template = template.replace('{pages}', String(values.pages));
  }

  return template;
}
