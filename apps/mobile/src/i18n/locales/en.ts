/**
 * F6 — English base namespace.
 *
 * Seeds the keys the primitives + icon maps reference (status, tabs, common).
 * Full per-screen strings are added during the i18n slice / screen migrations.
 * Keys are flat (dotted) — `keySeparator`/`nsSeparator` are disabled in init.
 */
const en: Record<string, string> = {
  // OrderStatus labels (StatusBadge / icon maps)
  'status.QUEUED': 'Queued',
  'status.SCHEDULED': 'Scheduled',
  'status.PROCESSING': 'Processing',
  'status.READY': 'Ready',
  'status.COLLECTED': 'Collected',
  'status.CANCELLED': 'Cancelled',

  // Tab labels
  'tab.home': 'Home',
  'tab.orders': 'Orders',
  'tab.wallet': 'Wallet',
  'tab.notifications': 'Alerts',
  'tab.shop': 'Shop',
  'tab.jobs': 'Jobs',
  'tab.slots': 'Slots',
  'tab.staff': 'Staff',
  'tab.analytics': 'Analytics',
  'tab.shops': 'Shops',
  'tab.config': 'Config',
  'tab.templates': 'Templates',
  'tab.profile': 'Profile',

  'notif.title': 'Notification',

  // Common
  'common.signIn': 'Sign In',
  'common.signUp': 'Sign Up',
  'common.email': 'Email',
  'common.password': 'Password',
  'common.name': 'Name',
  'common.phone': 'Phone',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.logout': 'Log out',
  'common.offline': "You're offline",
  'common.seeAll': 'See all',
};

export default en;
