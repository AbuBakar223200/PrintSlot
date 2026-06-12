/**
 * F6 — Bengali base namespace (mirrors en.ts keys). Full translations land in the
 * i18n slice; this seeds the primitive-facing keys so BN mode reads correctly.
 */
const bn: Record<string, string> = {
  'status.QUEUED': 'সারিতে',
  'status.SCHEDULED': 'নির্ধারিত',
  'status.PROCESSING': 'প্রসেসিং',
  'status.READY': 'প্রস্তুত',
  'status.COLLECTED': 'সংগৃহীত',
  'status.CANCELLED': 'বাতিল',

  'tab.home': 'হোম',
  'tab.orders': 'অর্ডার',
  'tab.wallet': 'ওয়ালেট',
  'tab.notifications': 'বিজ্ঞপ্তি',
  'tab.shop': 'শপ',
  'tab.jobs': 'জব',
  'tab.slots': 'স্লট',
  'tab.staff': 'স্টাফ',
  'tab.analytics': 'অ্যানালিটিক্স',
  'tab.shops': 'শপস',
  'tab.config': 'কনফিগ',
  'tab.templates': 'টেমপ্লেট',
  'tab.profile': 'প্রোফাইল',

  'notif.title': 'বিজ্ঞপ্তি',

  'common.signIn': 'সাইন ইন',
  'common.signUp': 'সাইন আপ',
  'common.email': 'ইমেইল',
  'common.password': 'পাসওয়ার্ড',
  'common.name': 'নাম',
  'common.phone': 'ফোন',
  'common.save': 'সংরক্ষণ',
  'common.cancel': 'বাতিল',
  'common.retry': 'আবার চেষ্টা',
  'common.back': 'পিছনে',
  'common.next': 'পরবর্তী',
  'common.add': 'যোগ করুন',
  'common.edit': 'সম্পাদনা',
  'common.delete': 'মুছুন',
  'common.logout': 'লগ আউট',
  'common.offline': 'আপনি অফলাইন',
  'common.seeAll': 'সব দেখুন',
};

export default bn;
