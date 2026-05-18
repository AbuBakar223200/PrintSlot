/**
 * User roles in the PrintSlot platform.
 * Used across API and mobile for authorization.
 */
export enum Role {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  SHOP_OWNER = 'SHOP_OWNER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

/**
 * Supported languages for i18n.
 */
export enum Language {
  EN = 'EN',
  BN = 'BN',
}

/**
 * Shop status lifecycle.
 * Transitions: PENDING→ACTIVE, PENDING→REJECTED, ACTIVE→SUSPENDED,
 * SUSPENDED→ACTIVE (admin only), REJECTED→PENDING (resubmit).
 */
export enum ShopStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * How the customer picks up their order.
 */
export enum PickupMode {
  QUEUE = 'QUEUE',
  SLOT = 'SLOT',
}

/**
 * How the customer pays for their order.
 */
export enum PaymentMethod {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

/**
 * Wallet transaction direction.
 */
export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

/**
 * Reason for a wallet transaction.
 */
export enum TransactionReason {
  TOPUP_ADMIN = 'TOPUP_ADMIN',
  TOPUP_GATEWAY = 'TOPUP_GATEWAY',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ORDER_REFUND = 'ORDER_REFUND',
}
