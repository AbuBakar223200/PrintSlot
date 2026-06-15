/* ============================================================================
 * PrintSlot — Design Prototype  ·  Mock Data + i18n strings
 * Pure data. No DOM, no logic. Consumed by app.js.
 * ==========================================================================*/

/* ---------------------------------------------------------------------------
 * Status → color token + lucide icon map (shared customer + staff + admin)
 * ------------------------------------------------------------------------- */
const STATUS_META = {
  QUEUED:    { tone: 'info',    icon: 'list-ordered',  labelKey: 'status.QUEUED' },
  SCHEDULED: { tone: 'violet',  icon: 'calendar-clock',labelKey: 'status.SCHEDULED' },
  PROCESSING:{ tone: 'warn',    icon: 'printer',       labelKey: 'status.PROCESSING' },
  READY:     { tone: 'success', icon: 'package-check', labelKey: 'status.READY' },
  COLLECTED: { tone: 'muted',   icon: 'check-check',   labelKey: 'status.COLLECTED' },
  CANCELLED: { tone: 'error',   icon: 'x-circle',      labelKey: 'status.CANCELLED' },
};

/* Notification type → lucide icon + tone */
const NOTIF_META = {
  ORDER_PLACED:    { icon: 'printer',        tone: 'info' },
  ORDER_ACCEPTED:  { icon: 'printer',        tone: 'warn' },
  ORDER_READY:     { icon: 'printer',        tone: 'success' },
  ORDER_CANCELLED: { icon: 'printer',        tone: 'error' },
  NEW_ORDER:       { icon: 'clipboard-list', tone: 'info' },
  WALLET_TOPUP:    { icon: 'wallet',         tone: 'success' },
  WALLET_DEDUCTED: { icon: 'wallet',         tone: 'warn' },
  SHOP_APPROVED:   { icon: 'store',          tone: 'success' },
  SHOP_REJECTED:   { icon: 'store',          tone: 'error' },
  SHOP_SUSPENDED:  { icon: 'store',          tone: 'warn' },
  STAFF_ASSIGNED:  { icon: 'user-plus',      tone: 'info' },
  LOW_BALANCE:     { icon: 'alert-triangle', tone: 'warn' },
};

/* ---------------------------------------------------------------------------
 * SHOPS
 * ------------------------------------------------------------------------- */
const SHOPS = [
  {
    id: 'shop-1', name: 'CampusPrint Hub', address: '12 Mirpur Road, Dhanmondi, Dhaka',
    phone: '+880 1711-123456', status: 'ACTIVE', openNow: true, closes: '17:30',
    colorRate: 8, bwRate: 2, a3Surcharge: 4, duplexDiscount: 0.8, defaultProcessingMins: 15,
  },
  {
    id: 'shop-2', name: 'QuickCopy Express', address: '45 Green Road, Farmgate, Dhaka',
    phone: '+880 1822-998877', status: 'ACTIVE', openNow: true, closes: '20:00',
    colorRate: 10, bwRate: 3, a3Surcharge: 5, duplexDiscount: 0.85, defaultProcessingMins: 12,
  },
  {
    id: 'shop-3', name: 'PrintWorks Studio', address: '8 Banani Block C, Dhaka',
    phone: '+880 1933-445566', status: 'ACTIVE', openNow: false, closes: '18:00',
    colorRate: 9, bwRate: 2.5, a3Surcharge: 4.5, duplexDiscount: 0.8, defaultProcessingMins: 18,
  },
  {
    id: 'shop-4', name: 'Uttara Doc Center', address: '23 Sector 7, Uttara, Dhaka',
    phone: '+880 1644-221100', status: 'ACTIVE', openNow: true, closes: '19:00',
    colorRate: 7, bwRate: 2, a3Surcharge: 3.5, duplexDiscount: 0.8, defaultProcessingMins: 14,
  },
];

/* ---------------------------------------------------------------------------
 * ORDERS  (customer-facing)
 * orderFiles carry full print config. subtotalPrice precomputed for display.
 * ------------------------------------------------------------------------- */
const ORDERS = [
  {
    id: 'ord-0042', orderNumber: 'PS-00042', shopId: 'shop-1',
    pickupMode: 'QUEUE', status: 'QUEUED', paymentMethod: 'WALLET',
    position: 3, etaMins: 12, createdAt: '2026-06-12T09:40:00',
    totalPrice: 96, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: [
      { fileName: 'thesis-chapter-3.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4',
        orientation: 'PORTRAIT', copies: 2, duplex: true, pageRange: '1-20', resolvedPages: 20, subtotalPrice: 64 },
      { fileName: 'cover-page.pdf', mime: 'pdf', colorMode: 'COLOR', paperSize: 'A4',
        orientation: 'PORTRAIT', copies: 2, duplex: false, pageRange: null, resolvedPages: 2, subtotalPrice: 32 },
    ],
  },
  {
    id: 'ord-0039', orderNumber: 'PS-00039', shopId: 'shop-2',
    pickupMode: 'SLOT', status: 'PROCESSING', paymentMethod: 'CASH',
    position: 1, etaMins: 6, createdAt: '2026-06-12T08:55:00', slotTime: '10:00–10:30',
    totalPrice: 45, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: [
      { fileName: 'flyer-design.pdf', mime: 'pdf', colorMode: 'COLOR', paperSize: 'A3',
        orientation: 'LANDSCAPE', copies: 3, duplex: false, pageRange: null, resolvedPages: 1, subtotalPrice: 45 },
    ],
  },
  {
    id: 'ord-0036', orderNumber: 'PS-00036', shopId: 'shop-1',
    pickupMode: 'QUEUE', status: 'READY', paymentMethod: 'WALLET',
    position: 0, etaMins: 0, createdAt: '2026-06-12T08:10:00',
    totalPrice: 24, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: [
      { fileName: 'assignment.docx', mime: 'docx', colorMode: 'BW', paperSize: 'A4',
        orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: null, resolvedPages: 12, subtotalPrice: 24 },
    ],
  },
  {
    id: 'ord-0031', orderNumber: 'PS-00031', shopId: 'shop-3',
    pickupMode: 'SLOT', status: 'COLLECTED', paymentMethod: 'CASH',
    position: 0, etaMins: 0, createdAt: '2026-06-11T16:20:00', slotTime: '16:00–16:30',
    totalPrice: 150, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: [
      { fileName: 'presentation.pptx', mime: 'pptx', colorMode: 'COLOR', paperSize: 'A4',
        orientation: 'LANDSCAPE', copies: 5, duplex: false, pageRange: null, resolvedPages: 18, subtotalPrice: 150 },
    ],
  },
  {
    id: 'ord-0028', orderNumber: 'PS-00028', shopId: 'shop-2',
    pickupMode: 'QUEUE', status: 'CANCELLED', paymentMethod: 'WALLET',
    position: 0, etaMins: 0, createdAt: '2026-06-11T11:05:00',
    totalPrice: 18, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: [
      { fileName: 'receipt-scan.jpg', mime: 'jpg', colorMode: 'BW', paperSize: 'A4',
        orientation: 'PORTRAIT', copies: 3, duplex: false, pageRange: null, resolvedPages: 3, subtotalPrice: 18 },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * STAFF / OWNER job queue  (SLOT first then QUEUE)
 * ------------------------------------------------------------------------- */
const JOBS = [
  { id: 'job-0039', orderNumber: 'PS-00039', status: 'PROCESSING', customerName: 'Rimon Hasan',
    customerPhone: '+880 1700-000042', mode: 'SLOT', slotTime: '10:00–10:30', createdAt: '2026-06-12T08:55:00',
    paymentMethod: 'CASH', totalPrice: 45,
    files: [{ fileName: 'flyer-design.pdf', mime: 'pdf', colorMode: 'COLOR', paperSize: 'A3', orientation: 'LANDSCAPE', copies: 3, duplex: false, pageRange: null, resolvedPages: 1, subtotalPrice: 45 }] },
  { id: 'job-0044', orderNumber: 'PS-00044', status: 'SCHEDULED', customerName: 'Tania Akter',
    customerPhone: '+880 1815-552211', mode: 'SLOT', slotTime: '10:30–11:00', createdAt: '2026-06-12T09:20:00',
    paymentMethod: 'WALLET', totalPrice: 72,
    files: [{ fileName: 'lecture-notes.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: true, pageRange: '1-30', resolvedPages: 30, subtotalPrice: 72 }] },
  { id: 'job-0042', orderNumber: 'PS-00042', status: 'QUEUED', customerName: 'Rimon Hasan',
    customerPhone: '+880 1700-000042', mode: 'QUEUE', slotTime: null, createdAt: '2026-06-12T09:40:00',
    paymentMethod: 'WALLET', totalPrice: 96,
    files: [
      { fileName: 'thesis-chapter-3.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: true, pageRange: '1-20', resolvedPages: 20, subtotalPrice: 64 },
      { fileName: 'cover-page.pdf', mime: 'pdf', colorMode: 'COLOR', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: false, pageRange: null, resolvedPages: 2, subtotalPrice: 32 },
    ] },
  { id: 'job-0045', orderNumber: 'PS-00045', status: 'QUEUED', customerName: 'Sajid Rahman',
    customerPhone: '+880 1999-334455', mode: 'QUEUE', slotTime: null, createdAt: '2026-06-12T09:52:00',
    paymentMethod: 'CASH', totalPrice: 30,
    files: [{ fileName: 'application-form.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: null, resolvedPages: 15, subtotalPrice: 30 }] },
];

/* ---------------------------------------------------------------------------
 * WALLET
 * ------------------------------------------------------------------------- */
const WALLET = {
  balance: 120,
  lowBalance: 36, // value used when "simulate low balance" toggled
  transactions: [
    { id: 'tx-1', type: 'CREDIT', amount: 200, reason: 'TOPUP_ADMIN',    createdAt: '2026-06-12T07:00:00' },
    { id: 'tx-2', type: 'DEBIT',  amount: 96,  reason: 'ORDER_PAYMENT',  createdAt: '2026-06-12T09:40:00', orderNumber: 'PS-00042' },
    { id: 'tx-3', type: 'DEBIT',  amount: 24,  reason: 'ORDER_PAYMENT',  createdAt: '2026-06-12T08:10:00', orderNumber: 'PS-00036' },
    { id: 'tx-4', type: 'CREDIT', amount: 18,  reason: 'ORDER_REFUND',   createdAt: '2026-06-11T11:06:00', orderNumber: 'PS-00028' },
    { id: 'tx-5', type: 'CREDIT', amount: 50,  reason: 'TOPUP_GATEWAY',  createdAt: '2026-06-10T18:30:00' },
  ],
};

/* ---------------------------------------------------------------------------
 * NOTIFICATIONS
 * ------------------------------------------------------------------------- */
const NOTIFICATIONS = [
  { id: 'n-1', type: 'ORDER_READY',    titleKey: 'notif.orderReady.title',    bodyKey: 'notif.orderReady.body',    read: false, createdAt: '2026-06-12T09:30:00', meta: { num: 'PS-00036' } },
  { id: 'n-2', type: 'WALLET_DEDUCTED',titleKey: 'notif.walletDeducted.title',bodyKey: 'notif.walletDeducted.body',read: false, createdAt: '2026-06-12T09:40:00', meta: { amount: 96 } },
  { id: 'n-3', type: 'ORDER_PLACED',   titleKey: 'notif.orderPlaced.title',   bodyKey: 'notif.orderPlaced.body',   read: false, createdAt: '2026-06-12T09:40:00', meta: { num: 'PS-00042' } },
  { id: 'n-4', type: 'LOW_BALANCE',    titleKey: 'notif.lowBalance.title',    bodyKey: 'notif.lowBalance.body',    read: true,  createdAt: '2026-06-12T09:41:00', meta: { amount: 24 } },
  { id: 'n-5', type: 'ORDER_ACCEPTED', titleKey: 'notif.orderAccepted.title', bodyKey: 'notif.orderAccepted.body', read: true,  createdAt: '2026-06-12T08:56:00', meta: { num: 'PS-00039' } },
];

/* ---------------------------------------------------------------------------
 * SLOTS (wizard step 1)  — some full/disabled
 * ------------------------------------------------------------------------- */
const SLOT_GRID = [
  { time: '09:00–09:30', state: 'full' },
  { time: '09:30–10:00', state: 'open' },
  { time: '10:00–10:30', state: 'open' },
  { time: '10:30–11:00', state: 'open' },
  { time: '11:00–11:30', state: 'full' },
  { time: '11:30–12:00', state: 'open' },
  { time: '14:00–14:30', state: 'open' },
  { time: '14:30–15:00', state: 'closed' },
  { time: '15:00–15:30', state: 'open' },
];

/* ---------------------------------------------------------------------------
 * OWNER — slot templates per date with usage
 * ------------------------------------------------------------------------- */
const OWNER_SLOTS = [
  { time: '09:00–09:30', isOpen: true,  maxOrders: 10, used: 3 },
  { time: '09:30–10:00', isOpen: true,  maxOrders: 10, used: 7 },
  { time: '10:00–10:30', isOpen: true,  maxOrders: 8,  used: 8 },
  { time: '10:30–11:00', isOpen: false, maxOrders: 8,  used: 0 },
  { time: '11:00–11:30', isOpen: true,  maxOrders: 12, used: 2 },
];

/* OWNER analytics */
const OWNER_ANALYTICS = {
  totalOrders: 142, revenue: 8640, avgProcessingMins: 14,
  byStatus: { QUEUED: 4, PROCESSING: 2, READY: 3, COLLECTED: 128, CANCELLED: 5 },
};

/* OWNER staff */
const OWNER_STAFF = [
  { id: 'u-101', name: 'Karim Uddin',  email: 'karim@campusprint.bd',  phone: '+880 1712-000111' },
  { id: 'u-102', name: 'Nadia Islam',  email: 'nadia@campusprint.bd',  phone: '+880 1712-000222' },
];

/* ---------------------------------------------------------------------------
 * ADMIN
 * ------------------------------------------------------------------------- */
const ADMIN_SHOPS = [
  { id: 'as-1', name: 'CampusPrint Hub',   address: '12 Mirpur Road, Dhanmondi',  status: 'ACTIVE',    reason: null },
  { id: 'as-2', name: 'Newprint Gulshan',  address: '5 Gulshan Ave, Dhaka',        status: 'PENDING',   reason: null },
  { id: 'as-3', name: 'Speedy Copy Center', address: '90 Mohakhali, Dhaka',         status: 'PENDING',   reason: null },
  { id: 'as-4', name: 'OldTown Printers',  address: '33 Old Dhaka, Sadarghat',     status: 'SUSPENDED', reason: 'Repeated customer complaints — under review.' },
  { id: 'as-5', name: 'Ghost Print Co.',   address: '1 Unknown St, Dhaka',          status: 'REJECTED',  reason: 'Address could not be verified.' },
];

const ADMIN_ANALYTICS = {
  totalShops: 24, activeShops: 19, totalOrders: 3120, revenue: 184500, pendingApprovals: 2,
  revenuePerShop: [
    { name: 'CampusPrint Hub', revenue: 86400 },
    { name: 'QuickCopy Express', revenue: 54200 },
    { name: 'PrintWorks Studio', revenue: 31900 },
    { name: 'Uttara Doc Center', revenue: 12000 },
  ],
};

const ADMIN_CONFIG = [
  { key: 'LOW_BALANCE_THRESHOLD', value: '50', descKey: 'admin.config.lowBalanceDesc' },
  { key: 'SLOT_DURATION_MINS',    value: '30', descKey: 'admin.config.slotDurationDesc' },
];

const ADMIN_TEMPLATES = [
  { id: 't-1', time: '09:00–09:30' },
  { id: 't-2', time: '09:30–10:00' },
  { id: 't-3', time: '10:00–10:30' },
  { id: 't-4', time: '10:30–11:00' },
  { id: 't-5', time: '11:00–11:30' },
];

/* ---------------------------------------------------------------------------
 * i18n  —  EN canonical + real Bengali
 * {n} / {x} simple interpolation handled in app.js t()
 * ------------------------------------------------------------------------- */
const I18N = {
  en: {
    'app.tagline': 'Skip the queue, print with ease',
    'common.signIn': 'Sign In', 'common.signUp': 'Sign Up', 'common.email': 'Email',
    'common.password': 'Password', 'common.name': 'Full name', 'common.phone': 'Phone',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.confirm': 'Confirm',
    'common.back': 'Back', 'common.next': 'Next', 'common.retry': 'Retry', 'common.add': 'Add',
    'common.edit': 'Edit', 'common.delete': 'Delete', 'common.close': 'Close', 'common.seeAll': 'See all',
    'common.search': 'Search', 'common.files': '{n} files', 'common.file': '{n} file',
    'common.offline': 'You are offline. Showing cached data.',
    'common.logout': 'Log out', 'common.done': 'Done',

    'role.CUSTOMER': 'Customer', 'role.STAFF': 'Staff', 'role.SHOP_OWNER': 'Shop Owner', 'role.PLATFORM_ADMIN': 'Platform Admin',

    'tab.home': 'Home', 'tab.orders': 'Orders', 'tab.wallet': 'Wallet', 'tab.notifications': 'Alerts',
    'tab.jobs': 'Jobs', 'tab.profile': 'Profile', 'tab.shop': 'Shop', 'tab.slots': 'Slots',
    'tab.staff': 'Staff', 'tab.analytics': 'Analytics', 'tab.shops': 'Shops', 'tab.config': 'Config', 'tab.templates': 'Templates',

    'status.QUEUED': 'Queued', 'status.SCHEDULED': 'Scheduled', 'status.PROCESSING': 'Processing',
    'status.READY': 'Ready', 'status.COLLECTED': 'Collected', 'status.CANCELLED': 'Cancelled',

    'auth.welcome': 'Welcome back', 'auth.subtitle': 'Sign in to manage your prints',
    'auth.noAccount': "Don't have an account?", 'auth.haveAccount': 'Already have an account?',
    'auth.createAccount': 'Create account', 'auth.registerTitle': 'Create your account',
    'auth.registerSub': 'Join PrintSlot in seconds', 'auth.iAmA': 'I am a',

    'home.greeting': 'Hello, {name}', 'home.searchHint': 'Search shops or orders',
    'home.activeOrders': 'Active Orders', 'home.recentOrders': 'Recent Orders',
    'home.browseShops': 'Browse shops', 'home.position': 'Position {p} · ~{m} min',
    'home.noActive': 'No active orders', 'home.noActiveSub': 'Place an order to track it live here.',

    'shops.title': 'Browse Shops', 'shops.active': 'ACTIVE', 'shops.empty': 'No shops found',
    'shops.emptySub': 'Try a different search term.', 'shops.loading': 'Loading shops…',
    'shop.pricing': 'Pricing', 'shop.color': 'Color (per page)', 'shop.bw': 'B&W (per page)',
    'shop.a3': 'A3 surcharge', 'shop.duplex': 'Duplex discount', 'shop.openNow': 'Open now · closes {t}',
    'shop.closed': 'Closed now', 'shop.printNow': 'Print Now', 'shop.schedule': 'Schedule Pickup',
    'shop.phone': 'Call shop',

    'wizard.step': 'Step {a} of {b}', 'wizard.pickSlot': 'Pick a slot', 'wizard.today': 'Today',
    'wizard.filesConfig': 'Files & Config', 'wizard.priceReview': 'Price Review', 'wizard.payment': 'Payment',
    'wizard.full': 'Full', 'wizard.closed': 'Closed', 'wizard.copies': 'Copies', 'wizard.duplex': 'Duplex',
    'wizard.pageRange': 'Page range', 'wizard.pageRangeHint': 'e.g. 1-5 or 1,3,5 — blank = all',
    'wizard.color': 'Color', 'wizard.bwShort': 'B&W', 'wizard.portrait': 'Portrait', 'wizard.landscape': 'Landscape',
    'wizard.subtotal': 'Subtotal', 'wizard.total': 'Total', 'wizard.pages': '{n} pages',
    'wizard.placeOrder': 'Place Order', 'wizard.payWallet': 'Pay with Wallet', 'wizard.payCash': 'Pay Cash at Counter',
    'wizard.walletBalance': 'Balance {amt}', 'wizard.addFile': 'Add file',
    'wizard.insufficientTitle': 'Insufficient balance', 'wizard.insufficientBody': 'Your wallet balance is too low for this order. Top up or pay cash at the counter.',
    'wizard.topUp': 'Top up wallet', 'wizard.successTitle': 'Order placed!', 'wizard.successBody': 'Your order {num} is in the queue.',
    'wizard.viewOrder': 'View order',

    'order.detailTitle': 'Order', 'order.timeline': 'Status timeline', 'order.shop': 'Shop',
    'order.filesTitle': 'Files', 'order.payment': 'Payment', 'order.method': 'Method',
    'order.total': 'Total', 'order.cancelOrder': 'Cancel Order', 'order.advance': 'Advance status (dev)',
    'order.cancelConfirmTitle': 'Cancel this order?', 'order.cancelConfirmBody': 'This cannot be undone. A refund is issued if you paid by wallet.',
    'order.keepOrder': 'Keep order', 'order.confirmCancel': 'Yes, cancel',
    'order.position': 'Position {p}', 'order.eta': '~{m} min', 'order.disconnected': 'Live updates reconnecting…',
    'order.collectedNote': 'Collected — thank you!', 'order.cancelledNote': 'This order was cancelled.',

    'history.title': 'My Orders', 'history.newOrder': 'New Order', 'history.empty': 'No orders yet',
    'history.emptySub': 'Your placed orders will appear here.', 'history.relTime': '{t}',

    'wallet.title': 'Wallet', 'wallet.balance': 'Wallet balance', 'wallet.topUp': 'Top Up',
    'wallet.transactions': 'Transactions', 'wallet.lowWarn': 'Low balance — top up to keep printing',
    'wallet.simulateLow': 'Simulate low balance', 'wallet.credit': 'Credit', 'wallet.debit': 'Debit',
    'wallet.topUpHint': 'Top up at the counter — an admin credits your wallet',
    'reason.TOPUP_ADMIN': 'Admin top-up', 'reason.TOPUP_GATEWAY': 'Online top-up',
    'reason.ORDER_PAYMENT': 'Order payment', 'reason.ORDER_REFUND': 'Order refund',

    'notif.title': 'Notifications', 'notif.markAll': 'Mark all read', 'notif.empty': 'No notifications',
    'notif.emptySub': "You're all caught up.",
    'notif.orderReady.title': 'Order ready for pickup', 'notif.orderReady.body': 'Order {num} is ready at the counter.',
    'notif.walletDeducted.title': 'Payment deducted', 'notif.walletDeducted.body': '{amount} debited for your order.',
    'notif.orderPlaced.title': 'Order placed', 'notif.orderPlaced.body': 'Order {num} is now in the queue.',
    'notif.lowBalance.title': 'Low wallet balance', 'notif.lowBalance.body': 'Balance below threshold after debit of {amount}.',
    'notif.orderAccepted.title': 'Order accepted', 'notif.orderAccepted.body': 'Order {num} is being processed.',

    'profile.title': 'Profile', 'profile.editName': 'Full name', 'profile.editPhone': 'Phone',
    'profile.language': 'Language', 'profile.theme': 'Theme', 'profile.themeLight': 'Light',
    'profile.themeDark': 'Dark', 'profile.themeSystem': 'System', 'profile.logoutConfirm': 'Log out of PrintSlot?',
    'profile.logoutBody': 'You can sign back in anytime.', 'profile.account': 'Account',
    'profile.preferences': 'Preferences',

    'staff.jobsTitle': 'Job Queue', 'staff.slotJobs': 'Slot pickups', 'staff.queueJobs': 'Walk-in queue',
    'staff.customer': 'Customer', 'staff.jobDetail': 'Job', 'staff.startProcessing': 'Start Processing',
    'staff.markReady': 'Mark Ready', 'staff.markCollected': 'Mark Collected', 'staff.config': 'Print configuration',
    'staff.empty': 'No active jobs', 'staff.emptySub': 'New orders will appear here.',

    'owner.shopTitle': 'My Shop', 'owner.shopActive': 'Shop is live', 'owner.pendingBanner': 'Your shop is pending admin approval.',
    'owner.rejectedBanner': 'Your shop was rejected.', 'owner.resubmit': 'Resubmit for review',
    'owner.rates': 'Print rates', 'owner.slotsTitle': 'Manage Slots', 'owner.maxOrders': 'Max',
    'owner.usage': '{u}/{m}', 'owner.staffTitle': 'Staff', 'owner.promote': 'Promote by user ID',
    'owner.userIdHint': 'Enter customer user ID', 'owner.removeStaff': 'Remove this staff member?',
    'owner.removeStaffBody': 'They will return to a regular customer account.',
    'owner.analyticsTitle': 'Analytics', 'owner.totalOrders': 'Total Orders', 'owner.revenue': 'Revenue',
    'owner.avgProcessing': 'Avg Processing', 'owner.breakdown': 'Status breakdown', 'owner.revenueNote': 'Revenue = collected orders only',
    'owner.mins': '{n} min',

    'admin.shopsTitle': 'Shop Approvals', 'admin.pending': 'Pending', 'admin.all': 'All',
    'admin.approve': 'Approve', 'admin.reject': 'Reject', 'admin.suspend': 'Suspend',
    'admin.reinstate': 'Reinstate', 'admin.rejectTitle': 'Reject shop', 'admin.rejectReason': 'Reason for rejection',
    'admin.rejectHint': 'At least 5 characters', 'admin.submitReject': 'Submit rejection',
    'admin.analyticsTitle': 'Platform Analytics', 'admin.totalShops': 'Total Shops', 'admin.activeShops': 'Active',
    'admin.totalOrders': 'Total Orders', 'admin.revenue': 'Revenue', 'admin.pendingApprovals': '{n} pending approvals',
    'admin.revenuePerShop': 'Revenue per shop', 'admin.configTitle': 'App Config',
    'admin.config.lowBalanceDesc': 'BDT threshold for low-balance alerts', 'admin.config.slotDurationDesc': 'Slot window length in minutes',
    'admin.templatesTitle': 'Slot Templates', 'admin.addTemplate': 'Add template', 'admin.deleteTemplate': 'Delete this template?',
    'admin.deleteTemplateBody': 'Soft delete — existing slots stay valid.', 'admin.editValue': 'Edit value',
    'admin.startTime': 'Start time', 'admin.endTime': 'End time', 'admin.readonly': 'Read-only',

    'toast.saved': 'Saved', 'toast.statusAdvanced': 'Status advanced to {s}', 'toast.cancelled': 'Order cancelled',
    'toast.markedRead': 'All marked read', 'toast.staffRemoved': 'Staff removed', 'toast.staffAdded': 'Staff added',
    'toast.approved': 'Shop approved', 'toast.rejected': 'Shop rejected', 'toast.suspended': 'Shop suspended',
    'toast.reinstated': 'Shop reinstated', 'toast.templateDeleted': 'Template deleted', 'toast.templateAdded': 'Template added',
    'toast.toppedUp': 'Wallet topped up', 'toast.loggedOut': 'Logged out', 'toast.configUpdated': 'Config updated',
    'toast.slotUpdated': 'Slot updated',
  },
  bn: {
    'app.tagline': 'লাইন এড়িয়ে সহজে প্রিন্ট করুন',
    'common.signIn': 'সাইন ইন', 'common.signUp': 'সাইন আপ', 'common.email': 'ইমেইল',
    'common.password': 'পাসওয়ার্ড', 'common.name': 'পুরো নাম', 'common.phone': 'ফোন',
    'common.save': 'সংরক্ষণ করুন', 'common.cancel': 'বাতিল', 'common.confirm': 'নিশ্চিত করুন',
    'common.back': 'পিছনে', 'common.next': 'পরবর্তী', 'common.retry': 'আবার চেষ্টা', 'common.add': 'যোগ করুন',
    'common.edit': 'সম্পাদনা', 'common.delete': 'মুছুন', 'common.close': 'বন্ধ', 'common.seeAll': 'সব দেখুন',
    'common.search': 'খুঁজুন', 'common.files': '{n}টি ফাইল', 'common.file': '{n}টি ফাইল',
    'common.offline': 'আপনি অফলাইনে আছেন। সংরক্ষিত তথ্য দেখানো হচ্ছে।',
    'common.logout': 'লগ আউট', 'common.done': 'সম্পন্ন',

    'role.CUSTOMER': 'গ্রাহক', 'role.STAFF': 'স্টাফ', 'role.SHOP_OWNER': 'দোকান মালিক', 'role.PLATFORM_ADMIN': 'প্ল্যাটফর্ম অ্যাডমিন',

    'tab.home': 'হোম', 'tab.orders': 'অর্ডার', 'tab.wallet': 'ওয়ালেট', 'tab.notifications': 'বিজ্ঞপ্তি',
    'tab.jobs': 'কাজ', 'tab.profile': 'প্রোফাইল', 'tab.shop': 'দোকান', 'tab.slots': 'স্লট',
    'tab.staff': 'স্টাফ', 'tab.analytics': 'বিশ্লেষণ', 'tab.shops': 'দোকান', 'tab.config': 'কনফিগ', 'tab.templates': 'টেমপ্লেট',

    'status.QUEUED': 'সারিতে', 'status.SCHEDULED': 'নির্ধারিত', 'status.PROCESSING': 'প্রক্রিয়াধীন',
    'status.READY': 'প্রস্তুত', 'status.COLLECTED': 'সংগৃহীত', 'status.CANCELLED': 'বাতিল',

    'auth.welcome': 'আবার স্বাগতম', 'auth.subtitle': 'আপনার প্রিন্ট পরিচালনা করতে সাইন ইন করুন',
    'auth.noAccount': 'অ্যাকাউন্ট নেই?', 'auth.haveAccount': 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    'auth.createAccount': 'অ্যাকাউন্ট তৈরি করুন', 'auth.registerTitle': 'আপনার অ্যাকাউন্ট তৈরি করুন',
    'auth.registerSub': 'কয়েক সেকেন্ডে PrintSlot এ যোগ দিন', 'auth.iAmA': 'আমি একজন',

    'home.greeting': 'হ্যালো, {name}', 'home.searchHint': 'দোকান বা অর্ডার খুঁজুন',
    'home.activeOrders': 'চলমান অর্ডার', 'home.recentOrders': 'সাম্প্রতিক অর্ডার',
    'home.browseShops': 'দোকান দেখুন', 'home.position': 'অবস্থান {p} · ~{m} মিনিট',
    'home.noActive': 'কোনো চলমান অর্ডার নেই', 'home.noActiveSub': 'লাইভ ট্র্যাক করতে একটি অর্ডার দিন।',

    'shops.title': 'দোকান দেখুন', 'shops.active': 'সক্রিয়', 'shops.empty': 'কোনো দোকান পাওয়া যায়নি',
    'shops.emptySub': 'অন্য কিছু খুঁজে দেখুন।', 'shops.loading': 'দোকান লোড হচ্ছে…',
    'shop.pricing': 'মূল্য তালিকা', 'shop.color': 'রঙিন (প্রতি পাতা)', 'shop.bw': 'সাদাকালো (প্রতি পাতা)',
    'shop.a3': 'A3 সারচার্জ', 'shop.duplex': 'ডুপ্লেক্স ছাড়', 'shop.openNow': 'খোলা · বন্ধ হবে {t}',
    'shop.closed': 'এখন বন্ধ', 'shop.printNow': 'এখনই প্রিন্ট', 'shop.schedule': 'পিকআপ নির্ধারণ করুন',
    'shop.phone': 'দোকানে কল করুন',

    'wizard.step': 'ধাপ {a} / {b}', 'wizard.pickSlot': 'একটি স্লট বাছুন', 'wizard.today': 'আজ',
    'wizard.filesConfig': 'ফাইল ও কনফিগ', 'wizard.priceReview': 'মূল্য পর্যালোচনা', 'wizard.payment': 'পেমেন্ট',
    'wizard.full': 'পূর্ণ', 'wizard.closed': 'বন্ধ', 'wizard.copies': 'কপি', 'wizard.duplex': 'ডুপ্লেক্স',
    'wizard.pageRange': 'পাতার পরিসর', 'wizard.pageRangeHint': 'যেমন 1-5 বা 1,3,5 — খালি = সব',
    'wizard.color': 'রঙিন', 'wizard.bwShort': 'সাদাকালো', 'wizard.portrait': 'পোর্ট্রেট', 'wizard.landscape': 'ল্যান্ডস্কেপ',
    'wizard.subtotal': 'উপমোট', 'wizard.total': 'মোট', 'wizard.pages': '{n} পাতা',
    'wizard.placeOrder': 'অর্ডার দিন', 'wizard.payWallet': 'ওয়ালেট দিয়ে পরিশোধ', 'wizard.payCash': 'কাউন্টারে নগদ',
    'wizard.walletBalance': 'ব্যালেন্স {amt}', 'wizard.addFile': 'ফাইল যোগ করুন',
    'wizard.insufficientTitle': 'অপর্যাপ্ত ব্যালেন্স', 'wizard.insufficientBody': 'এই অর্ডারের জন্য আপনার ওয়ালেট ব্যালেন্স কম। টপ আপ করুন বা কাউন্টারে নগদ দিন।',
    'wizard.topUp': 'ওয়ালেট টপ আপ', 'wizard.successTitle': 'অর্ডার সম্পন্ন!', 'wizard.successBody': 'আপনার অর্ডার {num} সারিতে আছে।',
    'wizard.viewOrder': 'অর্ডার দেখুন',

    'order.detailTitle': 'অর্ডার', 'order.timeline': 'স্ট্যাটাস টাইমলাইন', 'order.shop': 'দোকান',
    'order.filesTitle': 'ফাইল', 'order.payment': 'পেমেন্ট', 'order.method': 'পদ্ধতি',
    'order.total': 'মোট', 'order.cancelOrder': 'অর্ডার বাতিল', 'order.advance': 'স্ট্যাটাস এগিয়ে নিন (dev)',
    'order.cancelConfirmTitle': 'এই অর্ডার বাতিল করবেন?', 'order.cancelConfirmBody': 'এটি ফেরানো যাবে না। ওয়ালেটে পরিশোধ করলে রিফান্ড দেওয়া হবে।',
    'order.keepOrder': 'রাখুন', 'order.confirmCancel': 'হ্যাঁ, বাতিল করুন',
    'order.position': 'অবস্থান {p}', 'order.eta': '~{m} মিনিট', 'order.disconnected': 'লাইভ আপডেট পুনঃসংযোগ হচ্ছে…',
    'order.collectedNote': 'সংগৃহীত — ধন্যবাদ!', 'order.cancelledNote': 'এই অর্ডারটি বাতিল করা হয়েছে।',

    'history.title': 'আমার অর্ডার', 'history.newOrder': 'নতুন অর্ডার', 'history.empty': 'এখনো কোনো অর্ডার নেই',
    'history.emptySub': 'আপনার অর্ডার এখানে দেখা যাবে।', 'history.relTime': '{t}',

    'wallet.title': 'ওয়ালেট', 'wallet.balance': 'ওয়ালেট ব্যালেন্স', 'wallet.topUp': 'টপ আপ',
    'wallet.transactions': 'লেনদেন', 'wallet.lowWarn': 'ব্যালেন্স কম — প্রিন্ট চালিয়ে যেতে টপ আপ করুন',
    'wallet.simulateLow': 'কম ব্যালেন্স সিমুলেট', 'wallet.credit': 'ক্রেডিট', 'wallet.debit': 'ডেবিট',
    'wallet.topUpHint': 'কাউন্টারে টপ আপ করুন — অ্যাডমিন আপনার ব্যালেন্স যোগ করবেন',
    'reason.TOPUP_ADMIN': 'অ্যাডমিন টপ-আপ', 'reason.TOPUP_GATEWAY': 'অনলাইন টপ-আপ',
    'reason.ORDER_PAYMENT': 'অর্ডার পেমেন্ট', 'reason.ORDER_REFUND': 'অর্ডার রিফান্ড',

    'notif.title': 'বিজ্ঞপ্তি', 'notif.markAll': 'সব পঠিত করুন', 'notif.empty': 'কোনো বিজ্ঞপ্তি নেই',
    'notif.emptySub': 'সব দেখা হয়ে গেছে।',
    'notif.orderReady.title': 'অর্ডার পিকআপের জন্য প্রস্তুত', 'notif.orderReady.body': 'অর্ডার {num} কাউন্টারে প্রস্তুত।',
    'notif.walletDeducted.title': 'পেমেন্ট কাটা হয়েছে', 'notif.walletDeducted.body': 'আপনার অর্ডারের জন্য {amount} কাটা হয়েছে।',
    'notif.orderPlaced.title': 'অর্ডার সম্পন্ন', 'notif.orderPlaced.body': 'অর্ডার {num} এখন সারিতে।',
    'notif.lowBalance.title': 'ওয়ালেট ব্যালেন্স কম', 'notif.lowBalance.body': '{amount} কাটার পর ব্যালেন্স সীমার নিচে।',
    'notif.orderAccepted.title': 'অর্ডার গৃহীত', 'notif.orderAccepted.body': 'অর্ডার {num} প্রক্রিয়াধীন।',

    'profile.title': 'প্রোফাইল', 'profile.editName': 'পুরো নাম', 'profile.editPhone': 'ফোন',
    'profile.language': 'ভাষা', 'profile.theme': 'থিম', 'profile.themeLight': 'লাইট',
    'profile.themeDark': 'ডার্ক', 'profile.themeSystem': 'সিস্টেম', 'profile.logoutConfirm': 'PrintSlot থেকে লগ আউট?',
    'profile.logoutBody': 'আপনি যেকোনো সময় আবার সাইন ইন করতে পারবেন।', 'profile.account': 'অ্যাকাউন্ট',
    'profile.preferences': 'পছন্দ',

    'staff.jobsTitle': 'কাজের সারি', 'staff.slotJobs': 'স্লট পিকআপ', 'staff.queueJobs': 'ওয়াক-ইন সারি',
    'staff.customer': 'গ্রাহক', 'staff.jobDetail': 'কাজ', 'staff.startProcessing': 'প্রসেসিং শুরু',
    'staff.markReady': 'প্রস্তুত চিহ্নিত', 'staff.markCollected': 'সংগৃহীত চিহ্নিত', 'staff.config': 'প্রিন্ট কনফিগারেশন',
    'staff.empty': 'কোনো চলমান কাজ নেই', 'staff.emptySub': 'নতুন অর্ডার এখানে দেখা যাবে।',

    'owner.shopTitle': 'আমার দোকান', 'owner.shopActive': 'দোকান চালু আছে', 'owner.pendingBanner': 'আপনার দোকান অ্যাডমিন অনুমোদনের অপেক্ষায়।',
    'owner.rejectedBanner': 'আপনার দোকান প্রত্যাখ্যাত হয়েছে।', 'owner.resubmit': 'পুনরায় জমা দিন',
    'owner.rates': 'প্রিন্ট রেট', 'owner.slotsTitle': 'স্লট পরিচালনা', 'owner.maxOrders': 'সর্বোচ্চ',
    'owner.usage': '{u}/{m}', 'owner.staffTitle': 'স্টাফ', 'owner.promote': 'ইউজার আইডি দিয়ে প্রমোট',
    'owner.userIdHint': 'গ্রাহকের ইউজার আইডি দিন', 'owner.removeStaff': 'এই স্টাফকে সরাবেন?',
    'owner.removeStaffBody': 'তারা সাধারণ গ্রাহক অ্যাকাউন্টে ফিরে যাবে।',
    'owner.analyticsTitle': 'বিশ্লেষণ', 'owner.totalOrders': 'মোট অর্ডার', 'owner.revenue': 'আয়',
    'owner.avgProcessing': 'গড় প্রসেসিং', 'owner.breakdown': 'স্ট্যাটাস বিভাজন', 'owner.revenueNote': 'আয় = শুধু সংগৃহীত অর্ডার',
    'owner.mins': '{n} মিনিট',

    'admin.shopsTitle': 'দোকান অনুমোদন', 'admin.pending': 'অপেক্ষমাণ', 'admin.all': 'সব',
    'admin.approve': 'অনুমোদন', 'admin.reject': 'প্রত্যাখ্যান', 'admin.suspend': 'স্থগিত',
    'admin.reinstate': 'পুনর্বহাল', 'admin.rejectTitle': 'দোকান প্রত্যাখ্যান', 'admin.rejectReason': 'প্রত্যাখ্যানের কারণ',
    'admin.rejectHint': 'কমপক্ষে ৫টি অক্ষর', 'admin.submitReject': 'প্রত্যাখ্যান জমা দিন',
    'admin.analyticsTitle': 'প্ল্যাটফর্ম বিশ্লেষণ', 'admin.totalShops': 'মোট দোকান', 'admin.activeShops': 'সক্রিয়',
    'admin.totalOrders': 'মোট অর্ডার', 'admin.revenue': 'আয়', 'admin.pendingApprovals': '{n}টি অনুমোদন অপেক্ষমাণ',
    'admin.revenuePerShop': 'প্রতি দোকান আয়', 'admin.configTitle': 'অ্যাপ কনফিগ',
    'admin.config.lowBalanceDesc': 'কম-ব্যালেন্স সতর্কতার BDT সীমা', 'admin.config.slotDurationDesc': 'স্লট উইন্ডোর দৈর্ঘ্য (মিনিট)',
    'admin.templatesTitle': 'স্লট টেমপ্লেট', 'admin.addTemplate': 'টেমপ্লেট যোগ', 'admin.deleteTemplate': 'এই টেমপ্লেট মুছবেন?',
    'admin.deleteTemplateBody': 'সফট ডিলিট — বিদ্যমান স্লট বৈধ থাকবে।', 'admin.editValue': 'মান সম্পাদনা',
    'admin.startTime': 'শুরুর সময়', 'admin.endTime': 'শেষ সময়', 'admin.readonly': 'কেবল পঠনযোগ্য',

    'toast.saved': 'সংরক্ষিত', 'toast.statusAdvanced': 'স্ট্যাটাস {s} এ এগিয়েছে', 'toast.cancelled': 'অর্ডার বাতিল',
    'toast.markedRead': 'সব পঠিত চিহ্নিত', 'toast.staffRemoved': 'স্টাফ সরানো হয়েছে', 'toast.staffAdded': 'স্টাফ যোগ হয়েছে',
    'toast.approved': 'দোকান অনুমোদিত', 'toast.rejected': 'দোকান প্রত্যাখ্যাত', 'toast.suspended': 'দোকান স্থগিত',
    'toast.reinstated': 'দোকান পুনর্বহাল', 'toast.templateDeleted': 'টেমপ্লেট মুছে ফেলা হয়েছে', 'toast.templateAdded': 'টেমপ্লেট যোগ হয়েছে',
    'toast.toppedUp': 'ওয়ালেট টপ আপ হয়েছে', 'toast.loggedOut': 'লগ আউট হয়েছে', 'toast.configUpdated': 'কনফিগ আপডেট হয়েছে',
    'toast.slotUpdated': 'স্লট আপডেট হয়েছে',
  },
};

/* Status order for timeline rendering per pickup mode */
const TIMELINE_QUEUE = ['QUEUED', 'PROCESSING', 'READY', 'COLLECTED'];
const TIMELINE_SLOT  = ['SCHEDULED', 'PROCESSING', 'READY', 'COLLECTED'];

/* Next-status map for advancing */
const NEXT_STATUS = { QUEUED: 'PROCESSING', SCHEDULED: 'PROCESSING', PROCESSING: 'READY', READY: 'COLLECTED' };
