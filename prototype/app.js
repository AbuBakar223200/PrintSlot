/* ============================================================================
 * PrintSlot — Design Prototype  ·  App logic (vanilla JS)
 * Tiny router + state + render functions. No framework, no network.
 * Depends on data.js (loaded first).
 * ==========================================================================*/

/* ------------------------------------------------------------------ State */
const S = {
  role: 'CUSTOMER',
  theme: 'light',
  lang: 'en',
  authed: false,         // customer flow starts at login
  screen: 'login',
  params: {},
  history: [],
  offline: false,
  // mutable copies of data so interactions persist within a session
  orders: null,
  jobs: null,
  notifications: null,
  wallet: null,
  adminShops: null,
  ownerSlots: null,
  ownerStaff: null,
  adminTemplates: null,
  walletLowSim: false,
  shopsLoading: false,
  // wizard
  wiz: null,
};

function seed() {
  S.orders = JSON.parse(JSON.stringify(ORDERS));
  S.jobs = JSON.parse(JSON.stringify(JOBS));
  S.notifications = JSON.parse(JSON.stringify(NOTIFICATIONS));
  S.wallet = JSON.parse(JSON.stringify(WALLET));
  S.adminShops = JSON.parse(JSON.stringify(ADMIN_SHOPS));
  S.ownerSlots = JSON.parse(JSON.stringify(OWNER_SLOTS));
  S.ownerStaff = JSON.parse(JSON.stringify(OWNER_STAFF));
  S.adminTemplates = JSON.parse(JSON.stringify(ADMIN_TEMPLATES));
  S.walletLowSim = false;
}
seed();

/* ------------------------------------------------------------ i18n + nums */
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
function bnNum(str) {
  if (S.lang !== 'bn') return String(str);
  return String(str).replace(/[0-9]/g, d => BN_DIGITS[+d]);
}
/* localize numbers but keep PS-XXXXX ascii */
function L(str) {
  if (S.lang !== 'bn') return String(str);
  return String(str).replace(/PS-\d+|\d+/g, m => m.startsWith('PS-') ? m : bnNum(m));
}
function t(key, vars) {
  const dict = I18N[S.lang] || I18N.en;
  let s = dict[key] != null ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  return s;
}
const money = (n) => bnNum('৳' + Number(n).toFixed(Number.isInteger(+n) ? 0 : 2));
const moneyDec = (n) => bnNum('৳' + Number(n).toFixed(2));

/* relative time mock */
function rel(iso) {
  const map = {
    '2026-06-12T09:52:00': '8m', '2026-06-12T09:41:00': '19m', '2026-06-12T09:40:00': '20m',
    '2026-06-12T09:30:00': '30m', '2026-06-12T09:20:00': '40m', '2026-06-12T08:56:00': '1h',
    '2026-06-12T08:55:00': '1h', '2026-06-12T08:10:00': '2h', '2026-06-11T16:20:00': 'Yesterday',
    '2026-06-11T11:06:00': 'Yesterday', '2026-06-11T11:05:00': 'Yesterday', '2026-06-10T18:30:00': '2d',
    '2026-06-12T07:00:00': '3h',
  };
  const v = map[iso] || '1h';
  return S.lang === 'bn' ? translateRel(v) : v;
}
function translateRel(v) {
  if (v === 'Yesterday') return 'গতকাল';
  return bnNum(v).replace('m', ' মিনিট').replace('h', ' ঘণ্টা').replace('d', ' দিন');
}

/* ------------------------------------------------------------ DOM helpers */
const $ = (sel, root = document) => root.querySelector(sel);
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
function shopById(id) { return SHOPS.find(s => s.id === id); }
function orderById(id) { return S.orders.find(o => o.id === id); }
function jobById(id) { return S.jobs.find(j => j.id === id); }

/* status badge html */
function badge(status, extraClass = '') {
  const m = STATUS_META[status];
  return `<span class="badge tone-${m.tone} ${extraClass}" data-status="${status}">
    <i data-lucide="${m.icon}"></i>${t(m.labelKey)}</span>`;
}

/* mime → icon */
const MIME_IC = { pdf: 'file-text', docx: 'file-type', pptx: 'presentation', xlsx: 'sheet', jpg: 'image', png: 'image' };
function fileChips(f) {
  const parts = [
    f.colorMode === 'COLOR' ? t('wizard.color') : t('wizard.bwShort'),
    f.paperSize,
    f.orientation === 'PORTRAIT' ? t('wizard.portrait') : t('wizard.landscape'),
    bnNum(f.copies) + '×',
  ];
  if (f.duplex) parts.push(t('wizard.duplex'));
  if (f.pageRange) parts.push(L(f.pageRange));
  return parts.map(p => `<span class="chip">${p}</span>`).join('');
}

/* =========================================================================
 * ROUTER
 * =======================================================================*/
function go(screen, params = {}, pushHistory = true) {
  if (pushHistory && S.screen) S.history.push({ screen: S.screen, params: S.params });
  S.screen = screen; S.params = params;
  render();
}
function back() {
  const prev = S.history.pop();
  if (prev) { S.screen = prev.screen; S.params = prev.params; render(); }
}

/* =========================================================================
 * TOP-LEVEL RENDER
 * =======================================================================*/
function render() {
  document.documentElement.setAttribute('data-theme', S.theme);
  document.documentElement.setAttribute('data-lang', S.lang);
  syncControls();

  // clean up floating elements that live outside #app
  const oldFab = $('#histFab'); if (oldFab) oldFab.remove();
  closeSheet();

  const app = $('#app');
  // not-authed customer → login/register screens (no tab bar)
  const noTabs = !S.authed || ['login', 'register', 'wizard', 'orderDetail', 'shopDetail', 'jobDetail', 'profile'].includes(S.screen);

  app.className = 'app' + (noTabs ? ' no-tabs' : '');
  app.innerHTML = `
    ${S.offline ? `<div class="offline-banner"><i data-lucide="wifi-off"></i>${t('common.offline')}</div>` : ''}
    <div class="app-scroll" id="scroll"></div>
    ${noTabs ? '' : tabBar()}
  `;
  $('#scroll').appendChild(screenEl());
  // FAB only on history screen
  refreshIcons();
}

function screenEl() {
  const r = SCREENS[S.screen];
  return r ? r() : el(`<div class="screen"><p>Unknown screen: ${S.screen}</p></div>`);
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

/* =========================================================================
 * CONTROL BAR (outside frame) sync + handlers
 * =======================================================================*/
function syncControls() {
  document.querySelectorAll('[data-ctl-role]').forEach(b => b.classList.toggle('active', b.dataset.ctlRole === S.role));
  document.querySelectorAll('[data-ctl-theme]').forEach(b => b.classList.toggle('active', b.dataset.ctlTheme === S.theme));
  document.querySelectorAll('[data-ctl-lang]').forEach(b => b.classList.toggle('active', b.dataset.ctlLang === S.lang));
}

function setRole(role) {
  S.role = role; S.history = [];
  if (role === 'CUSTOMER') { S.authed = false; S.screen = 'login'; }
  else { S.authed = true; S.screen = roleHome(role); }
  render();
}
function roleHome(role) {
  return { CUSTOMER: 'home', STAFF: 'staffJobs', SHOP_OWNER: 'ownerShop', PLATFORM_ADMIN: 'adminShops' }[role];
}
function setTheme(theme) { S.theme = theme; render(); }
function setLang(lang) { S.lang = lang; render(); }
function resetAll() {
  seed(); S.history = []; S.offline = false;
  S.theme = 'light'; S.lang = 'en';
  S._shopsLoaded = false; S._placed = 0;
  S.ownerShopState = 'ACTIVE'; S.adminFilter = 'PENDING'; S.regRole = 'CUSTOMER';
  setRole('CUSTOMER');
}

/* =========================================================================
 * TOAST + SHEET
 * =======================================================================*/
function toast(msg, icon = 'check-circle') {
  let wrap = $('#toastWrap');
  if (!wrap) { wrap = el('<div class="toast-wrap" id="toastWrap"></div>'); $('#screen-root .device-screen').appendChild(wrap); }
  const tt = el(`<div class="toast"><i data-lucide="${icon}"></i><span>${msg}</span></div>`);
  wrap.appendChild(tt); refreshIcons();
  setTimeout(() => { tt.style.transition = 'opacity .3s, transform .3s'; tt.style.opacity = '0'; tt.style.transform = 'translateY(10px)'; setTimeout(() => tt.remove(), 320); }, 1900);
}

function openSheet(innerHtml, opts = {}) {
  closeSheet();
  const scrim = el(`<div class="scrim" id="sheetScrim"><div class="sheet ${opts.cls || ''}" onclick="event.stopPropagation()">
    <div class="sheet-grip"></div>${innerHtml}</div></div>`);
  scrim.addEventListener('click', closeSheet);
  $('#screen-root .device-screen').appendChild(scrim);
  refreshIcons();
}
function closeSheet() { const s = $('#sheetScrim'); if (s) s.remove(); }

/* =========================================================================
 * SHARED LAYOUT BITS
 * =======================================================================*/
function header(title, opts = {}) {
  const avatar = opts.avatar ? `<div class="avatar" role="button" tabindex="0" aria-label="${t('profile.title')}" onclick="go('profile')">R</div>` : '';
  const backBtn = opts.back ? `<button class="hdr-back" aria-label="${t('common.back')}" onclick="back()"><i data-lucide="chevron-left"></i></button>` : '';
  const sub = opts.sub ? `<div class="hdr-sub">${opts.sub}</div>` : '';
  return `<div class="hdr">${backBtn}<div class="grow"><div class="hdr-title">${title}</div>${sub}</div>${opts.right || ''}${avatar}</div>`;
}

function tabBar() {
  const tabs = TAB_CONFIG[S.role];
  const unread = S.notifications.filter(n => !n.read).length;
  return `<nav class="tabbar" role="tablist">${tabs.map(tb => {
    const active = S.screen === tb.screen;
    const showBadge = tb.badge === 'notif' && unread > 0;
    return `<button class="tab ${active ? 'active' : ''}" role="tab" aria-selected="${active}" onclick="go('${tb.screen}', {}, false)">
      <i data-lucide="${tb.icon}"></i>
      ${showBadge ? `<span class="tbadge tnum">${bnNum(unread)}</span>` : ''}
      <span class="tl">${t(tb.label)}</span>
    </button>`;
  }).join('')}</nav>`;
}

const TAB_CONFIG = {
  CUSTOMER: [
    { screen: 'home', icon: 'house', label: 'tab.home' },
    { screen: 'history', icon: 'receipt', label: 'tab.orders' },
    { screen: 'wallet', icon: 'wallet', label: 'tab.wallet' },
    { screen: 'notifications', icon: 'bell', label: 'tab.notifications', badge: 'notif' },
  ],
  STAFF: [
    { screen: 'staffJobs', icon: 'clipboard-list', label: 'tab.jobs' },
    { screen: 'profile', icon: 'user', label: 'tab.profile' },
  ],
  SHOP_OWNER: [
    { screen: 'ownerShop', icon: 'store', label: 'tab.shop' },
    { screen: 'ownerJobs', icon: 'clipboard-list', label: 'tab.jobs' },
    { screen: 'ownerSlots', icon: 'calendar-clock', label: 'tab.slots' },
    { screen: 'ownerStaff', icon: 'users', label: 'tab.staff' },
    { screen: 'ownerAnalytics', icon: 'chart-column', label: 'tab.analytics' },
  ],
  PLATFORM_ADMIN: [
    { screen: 'adminShops', icon: 'store', label: 'tab.shops' },
    { screen: 'adminAnalytics', icon: 'chart-column', label: 'tab.analytics' },
    { screen: 'adminConfig', icon: 'settings', label: 'tab.config' },
    { screen: 'adminTemplates', icon: 'calendar-clock', label: 'tab.templates' },
  ],
};

/* =========================================================================
 * SCREENS
 * =======================================================================*/
const SCREENS = {};

/* ---------- LOGIN -------------------------------------------------------- */
SCREENS.login = () => el(`<div class="screen login-wrap">
  <div class="brand">
    <div class="brand-mark"><i data-lucide="printer"></i></div>
    <div class="brand-name">Print<span class="slot">Slot</span></div>
    <div class="brand-tag">${t('app.tagline')}</div>
  </div>
  <div class="frost pad stack">
    <div class="field"><label>${t('common.email')}</label>
      <div class="input-wrap"><i data-lucide="mail" class="lead"></i>
        <input class="input has-lead" type="email" value="rimon@printslot.bd" aria-label="${t('common.email')}"></div></div>
    <div class="field"><label>${t('common.password')}</label>
      <div class="input-wrap"><i data-lucide="lock" class="lead"></i>
        <input class="input has-lead" type="password" id="pw" value="password" aria-label="${t('common.password')}">
        <button class="input-eye" aria-label="toggle" onclick="togglePw('pw', this)"><i data-lucide="eye"></i></button></div></div>
    <button class="btn btn-primary" onclick="doLogin()"><i data-lucide="log-in"></i>${t('common.signIn')}</button>
    <div class="row between" style="justify-content:center;gap:6px;font-size:13.5px;color:var(--text-secondary)">
      <span>${t('auth.noAccount')}</span>
      <a style="color:var(--primary);font-weight:700" onclick="go('register')">${t('common.signUp')}</a>
    </div>
  </div>
</div>`);

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
  refreshIcons();
}
function doLogin() { S.authed = true; S.history = []; go('home', {}, false); }

/* ---------- REGISTER ----------------------------------------------------- */
SCREENS.register = () => {
  S.regRole = S.regRole || 'CUSTOMER';
  return el(`<div class="screen">
    ${header(t('auth.registerTitle'), { back: true, sub: t('auth.registerSub') })}
    <div class="stack" style="margin-top:6px">
      <div class="field"><label>${t('auth.iAmA')}</label>
        <div class="seg">
          <button class="${S.regRole==='CUSTOMER'?'active':''}" onclick="S.regRole='CUSTOMER';render()"><i data-lucide="user"></i>${t('role.CUSTOMER')}</button>
          <button class="${S.regRole==='SHOP_OWNER'?'active':''}" onclick="S.regRole='SHOP_OWNER';render()"><i data-lucide="store"></i>${t('role.SHOP_OWNER')}</button>
        </div></div>
      <div class="field"><label>${t('common.name')}</label>
        <div class="input-wrap"><i data-lucide="user" class="lead"></i><input class="input has-lead" placeholder="Rimon Hasan"></div></div>
      <div class="field"><label>${t('common.email')}</label>
        <div class="input-wrap"><i data-lucide="mail" class="lead"></i><input class="input has-lead" type="email" placeholder="you@email.com"></div></div>
      <div class="field"><label>${t('common.phone')}</label>
        <div class="input-wrap"><i data-lucide="phone" class="lead"></i><input class="input has-lead" placeholder="+880 1700-000000"></div></div>
      <div class="field"><label>${t('common.password')}</label>
        <div class="input-wrap"><i data-lucide="lock" class="lead"></i><input class="input has-lead" type="password" id="rpw" placeholder="••••••••">
          <button class="input-eye" aria-label="toggle" onclick="togglePw('rpw', this)"><i data-lucide="eye"></i></button></div></div>
      <button class="btn btn-primary" style="margin-top:6px" onclick="doLogin()"><i data-lucide="user-plus"></i>${t('auth.createAccount')}</button>
    </div>
  </div>`);
};

/* ---------- CUSTOMER HOME ----------------------------------------------- */
SCREENS.home = () => {
  const active = S.orders.filter(o => ['QUEUED','SCHEDULED','PROCESSING','READY'].includes(o.status));
  const recent = S.orders.slice(0, 3);
  return el(`<div class="screen">
    ${header(t('home.greeting', { name: 'Rimon' }), { avatar: true })}
    <div class="search input-wrap" style="margin-bottom:8px">
      <i data-lucide="search" class="lead"></i><input class="input has-lead" placeholder="${t('home.searchHint')}">
    </div>

    <div class="section-title">${t('home.activeOrders')}</div>
    ${active.length ? `<div class="active-scroller">${active.map(activeCard).join('')}</div>`
      : emptyState('inbox', t('home.noActive'), t('home.noActiveSub'))}

    <div class="section-title">${t('home.recentOrders')}<span class="link" onclick="go('history',{},false)">${t('common.seeAll')}</span></div>
    <div class="stack">${recent.map(orderRowCard).join('')}</div>

    <button class="btn btn-secondary" style="margin-top:16px" onclick="go('shops')"><i data-lucide="store"></i>${t('home.browseShops')}</button>
  </div>`);
};

function activeCard(o) {
  const shop = shopById(o.shopId);
  const live = o.status === 'PROCESSING' || o.status === 'QUEUED'
    ? `<div class="live"><span class="live-dot"></span>${t('home.position', { p: bnNum(o.position), m: bnNum(o.etaMins) })}</div>`
    : `<div class="live" style="color:var(--success)"><i data-lucide="package-check" style="width:15px;height:15px"></i>${t('order.collectedNote')}</div>`;
  return `<div class="active-card frost" onclick="go('orderDetail',{id:'${o.id}'})">
    <div class="row between"><span class="ordnum">${o.orderNumber}</span>${badge(o.status)}</div>
    <div class="order-meta">${shop.name}</div>
    ${o.status==='READY' ? `<div class="live" style="color:var(--success)"><i data-lucide="package-check" style="width:15px;height:15px"></i>${t('status.READY')}</div>` : live}
  </div>`;
}

function orderRowCard(o) {
  const shop = shopById(o.shopId);
  const fileLabel = o.files.length === 1 ? t('common.file', { n: bnNum(1) }) : t('common.files', { n: bnNum(o.files.length) });
  return `<div class="card order-card" onclick="go('orderDetail',{id:'${o.id}'})">
    <div class="row between"><span class="ordnum">${o.orderNumber}</span>${badge(o.status)}</div>
    <div class="row between">
      <div class="order-meta">${shop.name}<span class="sep"></span>${fileLabel}</div>
      <span class="price tnum">${money(o.totalPrice)}</span>
    </div>
    <div class="order-meta muted" style="font-size:12px">${rel(o.createdAt)}</div>
  </div>`;
}

/* ---------- SHOP LIST --------------------------------------------------- */
SCREENS.shops = () => {
  const wrap = el(`<div class="screen">
    ${header(t('shops.title'), { back: true })}
    <div class="search input-wrap" style="margin-bottom:12px">
      <i data-lucide="search" class="lead"></i><input class="input has-lead" placeholder="${t('home.searchHint')}">
    </div>
    <div class="stack" id="shopList"></div>
  </div>`);
  // simulate skeleton then content (only first time)
  const list = wrap.querySelector('#shopList');
  if (!S._shopsLoaded) {
    list.innerHTML = skelRows(3);
    setTimeout(() => { S._shopsLoaded = true; list.innerHTML = SHOPS.map(shopRow).join(''); refreshIcons(); }, 850);
  } else {
    list.innerHTML = SHOPS.map(shopRow).join('');
  }
  return wrap;
};
function shopRow(s) {
  const init = s.name.split(' ').map(w => w[0]).slice(0,2).join('');
  return `<div class="card list-row" onclick="go('shopDetail',{id:'${s.id}'})">
    <div class="avatar sm" style="border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--violet))">${init}</div>
    <div class="grow">
      <div class="ttl">${s.name}</div>
      <div class="sub"><i data-lucide="map-pin" style="width:12px;height:12px;vertical-align:-1px"></i> ${s.address}</div>
    </div>
    <span class="dot-active" title="Active"></span>
    <span class="chev"><i data-lucide="chevron-right"></i></span>
  </div>`;
}
function skelRows(n) {
  return Array.from({length:n}).map(() => `<div class="card skel-row">
    <div class="skel skel-ic"></div>
    <div class="grow stack sm"><div class="skel skel-line" style="width:60%"></div><div class="skel skel-line" style="width:85%"></div></div>
  </div>`).join('');
}

/* ---------- SHOP DETAIL ------------------------------------------------- */
SCREENS.shopDetail = () => {
  const s = shopById(S.params.id) || SHOPS[0];
  return el(`<div class="screen">
    ${header('', { back: true })}
    <div class="frost pad stack" style="margin-bottom:14px">
      <div class="hdr-title" style="font-size:21px">${s.name}</div>
      <div class="order-meta"><i data-lucide="map-pin" style="width:14px;height:14px"></i>${s.address}</div>
      <div class="row" style="gap:14px;font-size:13.5px;color:var(--text-secondary)">
        <span class="row" style="gap:5px"><i data-lucide="phone" style="width:14px;height:14px"></i>${s.phone}</span>
      </div>
    </div>

    <div class="banner ${s.openNow ? 'success' : 'warn'}" style="margin-bottom:14px">
      <i data-lucide="${s.openNow ? 'clock' : 'clock-alert'}"></i>
      ${s.openNow ? t('shop.openNow', { t: s.closes }) : t('shop.closed')}
    </div>

    <div class="section-title">${t('shop.pricing')}</div>
    <div class="card pad">
      <div class="kv"><span class="k">${t('shop.color')}</span><span class="v">${money(s.colorRate)}</span></div>
      <div class="kv"><span class="k">${t('shop.bw')}</span><span class="v">${money(s.bwRate)}</span></div>
      <div class="kv"><span class="k">${t('shop.a3')}</span><span class="v">+${money(s.a3Surcharge)}</span></div>
      <div class="kv"><span class="k">${t('shop.duplex')}</span><span class="v">${bnNum(Math.round((1-s.duplexDiscount)*100))}%</span></div>
    </div>

    <div class="sticky-actions">
      <div class="btn-row">
        <button class="btn btn-primary" ${!s.openNow ? 'disabled' : ''} onclick="startWizard('${s.id}','QUEUE')"><i data-lucide="zap"></i>${t('shop.printNow')}</button>
        <button class="btn btn-ghost" onclick="startWizard('${s.id}','SLOT')"><i data-lucide="calendar-clock"></i>${t('shop.schedule')}</button>
      </div>
    </div>
  </div>`);
};

/* ---------- ORDER WIZARD ------------------------------------------------- */
function startWizard(shopId, mode) {
  S.wiz = {
    shopId, mode, step: 1,
    slot: mode === 'SLOT' ? null : '10:00–10:30',
    dateIdx: 0,
    payment: 'WALLET',
    files: [
      { fileName: 'document-1.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: '', detectedPages: 12 },
      { fileName: 'cover-image.jpg', mime: 'jpg', colorMode: 'COLOR', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: false, pageRange: '', detectedPages: 1 },
    ],
  };
  go('wizard');
}

function wizPrice(f) {
  const s = shopById(S.wiz.shopId);
  const pages = f.pageRange && /^\d/.test(f.pageRange) ? rangeLen(f.pageRange) : f.detectedPages;
  const rate = f.colorMode === 'COLOR' ? s.colorRate : s.bwRate;
  let base = pages * f.copies * rate;
  const surcharge = f.paperSize === 'A3' ? pages * f.copies * s.a3Surcharge : 0;
  const discounted = f.duplex ? base * s.duplexDiscount : base;
  return { resolvedPages: pages, subtotal: Math.round(discounted + surcharge) };
}
function rangeLen(r) {
  try {
    let total = 0;
    r.split(',').forEach(part => {
      if (part.includes('-')) { const [a,b] = part.split('-').map(Number); total += Math.max(0, b - a + 1); }
      else if (part.trim()) total += 1;
    });
    return total || 1;
  } catch { return 1; }
}

SCREENS.wizard = () => {
  const w = S.wiz; const titles = ['wizard.pickSlot','wizard.filesConfig','wizard.priceReview','wizard.payment'];
  const bars = [1,2,3,4].map(n => `<span class="seg-bar ${n <= w.step ? 'done' : ''}"></span>`).join('');
  const body = [wizStep1, wizStep2, wizStep3, wizStep4][w.step - 1]();
  return el(`<div class="screen">
    ${header(t(titles[w.step-1]), { back: true })}
    <div class="wiz-steps">${bars}</div>
    <div class="wiz-label" style="margin-bottom:14px">${t('wizard.step', { a: bnNum(w.step), b: bnNum(4) })}</div>
    ${body}
  </div>`);
};

function wizStep1() {
  const w = S.wiz;
  const dates = [t('wizard.today'), '+1', '+2', '+3'];
  const days = ['Thu','Fri','Sat','Sun'];
  return `
    <div class="date-chips" style="margin-bottom:14px">
      ${dates.map((d,i) => `<button class="date-chip ${i===w.dateIdx?'active':''}" onclick="S.wiz.dateIdx=${i};render()">
        ${d}<span class="d">${days[i]}</span></button>`).join('')}
    </div>
    <div class="slot-grid">
      ${SLOT_GRID.map(s => {
        const cls = s.state === 'open' ? (w.slot === s.time ? 'open selected' : 'open') : s.state;
        const st = s.state === 'full' ? t('wizard.full') : s.state === 'closed' ? t('wizard.closed') : '';
        return `<button class="slot-cell ${cls}" ${s.state==='open'?`onclick="S.wiz.slot='${s.time}';render()"`:''}>
          ${L(s.time)}${st?`<span class="st">${st}</span>`:`<span class="st">${w.slot===s.time?'<i data-lucide=check style="width:13px;height:13px"></i>':' '}</span>`}</button>`;
      }).join('')}
    </div>
    <div class="sticky-actions">
      <button class="btn btn-primary" ${!w.slot?'disabled':''} onclick="S.wiz.step=2;render()">${t('common.next')}<i data-lucide="arrow-right"></i></button>
    </div>`;
}

function wizStep2() {
  const w = S.wiz;
  return `<div class="stack">
    ${w.files.map((f,i) => wizFileCard(f,i)).join('')}
    <button class="btn btn-ghost" onclick="addWizFile()"><i data-lucide="plus"></i>${t('wizard.addFile')}</button>
  </div>
  <div class="sticky-actions">
    <button class="btn btn-primary" onclick="S.wiz.step=3;render()">${t('common.next')}<i data-lucide="arrow-right"></i></button>
  </div>`;
}
function wizFileCard(f, i) {
  const ic = MIME_IC[f.mime] || 'file';
  return `<div class="card pad stack sm">
    <div class="file-row" style="padding:0">
      <div class="file-ic"><i data-lucide="${ic}"></i></div>
      <div class="grow"><div class="file-name">${f.fileName}</div>
        <div class="muted" style="font-size:12px">${bnNum(f.detectedPages)} ${t('wizard.pages',{n:''}).trim()||'pages'}</div></div>
    </div>
    <div class="seg compact" style="width:100%">
      <button class="${f.colorMode==='COLOR'?'active':''}" onclick="setFile(${i},'colorMode','COLOR')">${t('wizard.color')}</button>
      <button class="${f.colorMode==='BW'?'active':''}" onclick="setFile(${i},'colorMode','BW')">${t('wizard.bwShort')}</button>
    </div>
    <div class="seg compact" style="width:100%">
      <button class="${f.paperSize==='A4'?'active':''}" onclick="setFile(${i},'paperSize','A4')">A4</button>
      <button class="${f.paperSize==='A3'?'active':''}" onclick="setFile(${i},'paperSize','A3')">A3</button>
    </div>
    <div class="seg compact" style="width:100%">
      <button class="${f.orientation==='PORTRAIT'?'active':''}" onclick="setFile(${i},'orientation','PORTRAIT')">${t('wizard.portrait')}</button>
      <button class="${f.orientation==='LANDSCAPE'?'active':''}" onclick="setFile(${i},'orientation','LANDSCAPE')">${t('wizard.landscape')}</button>
    </div>
    <div class="row between">
      <span class="secondary" style="font-weight:600;font-size:13px">${t('wizard.copies')}</span>
      <div class="stepper">
        <button onclick="bumpCopies(${i},-1)"><i data-lucide="minus"></i></button>
        <span class="val tnum">${bnNum(f.copies)}</span>
        <button onclick="bumpCopies(${i},1)"><i data-lucide="plus"></i></button>
      </div>
    </div>
    <div class="row between">
      <span class="secondary" style="font-weight:600;font-size:13px">${t('wizard.duplex')}</span>
      <div class="switch ${f.duplex?'on':''}" role="switch" aria-checked="${f.duplex}" onclick="toggleDuplex(${i})"></div>
    </div>
    <div class="field">
      <label>${t('wizard.pageRange')}</label>
      <input class="input" placeholder="${t('wizard.pageRangeHint')}" value="${f.pageRange}" oninput="setFile(${i},'pageRange',this.value)">
    </div>
  </div>`;
}
function setFile(i, k, v) { S.wiz.files[i][k] = v; render(); }
function bumpCopies(i, d) { S.wiz.files[i].copies = Math.max(1, S.wiz.files[i].copies + d); render(); }
function toggleDuplex(i) { S.wiz.files[i].duplex = !S.wiz.files[i].duplex; render(); }
function addWizFile() {
  S.wiz.files.push({ fileName: 'document-' + (S.wiz.files.length+1) + '.pdf', mime: 'pdf', colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: '', detectedPages: 8 });
  render();
}

function wizStep3() {
  const w = S.wiz;
  const rows = w.files.map(f => { const p = wizPrice(f); return { f, ...p }; });
  const total = rows.reduce((s,r) => s + r.subtotal, 0);
  S.wiz.total = total;
  return `<div class="stack">
    ${rows.map(r => `<div class="card pad">
      <div class="row between"><div class="file-name">${r.f.fileName}</div><span class="price tnum">${money(r.subtotal)}</span></div>
      <div class="chips" style="margin-top:8px">${fileChips({...r.f, resolvedPages:r.resolvedPages})}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${bnNum(r.resolvedPages)} × ${bnNum(r.f.copies)} ${t('wizard.subtotal')}</div>
    </div>`).join('')}
    <div class="frost pad">
      <div class="kv" style="border:none"><span class="k" style="font-size:16px;font-weight:700;color:var(--text-primary)">${t('wizard.total')}</span>
        <span class="v" style="font-size:22px;font-weight:800;color:var(--primary)">${money(total)}</span></div>
    </div>
  </div>
  <div class="sticky-actions">
    <button class="btn btn-primary" onclick="S.wiz.step=4;render()">${t('common.next')}<i data-lucide="arrow-right"></i></button>
  </div>`;
}

function wizStep4() {
  const w = S.wiz;
  const bal = S.wallet.balance;
  return `<div class="stack">
    <div class="card pad row between ${w.payment==='WALLET'?'':''}" style="border:2px solid ${w.payment==='WALLET'?'var(--primary)':'var(--border)'}" onclick="S.wiz.payment='WALLET';render()">
      <div class="row"><div class="tx-ic credit" style="background:var(--tint-soft);color:var(--primary)"><i data-lucide="wallet"></i></div>
        <div><div style="font-weight:700">${t('wizard.payWallet')}</div><div class="muted" style="font-size:12.5px">${t('wizard.walletBalance',{amt:money(bal)})}</div></div></div>
      <i data-lucide="${w.payment==='WALLET'?'circle-check-big':'circle'}" style="color:${w.payment==='WALLET'?'var(--primary)':'var(--text-muted)'}"></i>
    </div>
    <div class="card pad row between" style="border:2px solid ${w.payment==='CASH'?'var(--primary)':'var(--border)'}" onclick="S.wiz.payment='CASH';render()">
      <div class="row"><div class="tx-ic credit" style="background:var(--tint-soft);color:var(--primary)"><i data-lucide="banknote"></i></div>
        <div><div style="font-weight:700">${t('wizard.payCash')}</div></div></div>
      <i data-lucide="${w.payment==='CASH'?'circle-check-big':'circle'}" style="color:${w.payment==='CASH'?'var(--primary)':'var(--text-muted)'}"></i>
    </div>
    <div class="frost pad">
      <div class="kv" style="border:none"><span class="k" style="font-size:16px;font-weight:700;color:var(--text-primary)">${t('wizard.total')}</span>
        <span class="v" style="font-size:22px;font-weight:800;color:var(--primary)">${money(w.total||0)}</span></div>
    </div>
  </div>
  <div class="sticky-actions">
    <button class="btn btn-primary" onclick="placeOrder()"><i data-lucide="check"></i>${t('wizard.placeOrder')}</button>
  </div>`;
}

function placeOrder() {
  const w = S.wiz;
  // Demonstrate 402 insufficient balance when wallet pay and total > balance
  if (w.payment === 'WALLET' && (w.total || 0) > S.wallet.balance) {
    openSheet(`
      <div class="sheet-ic" style="background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)"><i data-lucide="alert-triangle"></i></div>
      <div class="sheet-title">${t('wizard.insufficientTitle')}</div>
      <div class="sheet-body">${t('wizard.insufficientBody')}</div>
      <button class="btn btn-primary" onclick="closeSheet();go('wallet',{},false)"><i data-lucide="wallet"></i>${t('wizard.topUp')}</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="S.wiz.payment='CASH';closeSheet();render()">${t('wizard.payCash')}</button>
    `);
    return;
  }
  // success — create a new order, deduct wallet
  const num = 'PS-000' + (43 + (S._placed || 0));
  S._placed = (S._placed || 0) + 1;
  const newOrder = {
    id: 'ord-new' + S._placed, orderNumber: num, shopId: w.shopId,
    pickupMode: w.mode, status: w.mode === 'SLOT' ? 'SCHEDULED' : 'QUEUED', paymentMethod: w.payment,
    position: 4, etaMins: 16, createdAt: '2026-06-12T09:52:00', slotTime: w.slot,
    totalPrice: w.total || 0, customerName: 'Rimon Hasan', customerPhone: '+880 1700-000042',
    files: w.files.map(f => { const p = wizPrice(f); return { ...f, resolvedPages: p.resolvedPages, subtotalPrice: p.subtotal, pageRange: f.pageRange || null }; }),
  };
  S.orders.unshift(newOrder);
  if (w.payment === 'WALLET') S.wallet.balance -= (w.total || 0);

  openSheet(`
    <div class="sheet-ic" style="background:color-mix(in srgb,var(--success) 16%,transparent);color:var(--success)"><i data-lucide="party-popper"></i></div>
    <div class="sheet-title">${t('wizard.successTitle')}</div>
    <div class="sheet-body">${t('wizard.successBody',{num})}</div>
    <button class="btn btn-primary" onclick="closeSheet();go('orderDetail',{id:'${newOrder.id}'},false)"><i data-lucide="arrow-right"></i>${t('wizard.viewOrder')}</button>
  `, { cls: 'success-beat' });
}

/* ---------- ORDER DETAIL ------------------------------------------------ */
SCREENS.orderDetail = () => {
  const o = orderById(S.params.id) || S.orders[0];
  const shop = shopById(o.shopId);
  const order = TIMELINE_QUEUE.includes('QUEUED') && o.pickupMode === 'SLOT' ? TIMELINE_SLOT : TIMELINE_QUEUE;
  const canCancel = ['QUEUED','SCHEDULED'].includes(o.status);
  const canAdvance = NEXT_STATUS[o.status];
  const liveBlock = (o.status === 'QUEUED' || o.status === 'PROCESSING')
    ? `<div class="frost pad row between" style="margin-bottom:14px">
        <div class="row" style="gap:9px"><span class="live-dot"></span>
          <span style="font-weight:700">${t('order.position',{p:bnNum(o.position)})}</span></div>
        <span class="price tnum" id="etaVal" style="color:var(--primary);font-size:18px">${t('order.eta',{m:bnNum(o.etaMins)})}</span>
       </div>` : '';

  const node = el(`<div class="screen">
    ${header('', { back: true })}
    <div class="frost pad stack" style="margin-bottom:14px">
      <div class="row between">
        <div class="hdr-title" style="font-size:26px">${o.orderNumber}</div>
        <span id="badgeSlot">${badge(o.status)}</span>
      </div>
      <div class="order-meta">${shop.name}${o.slotTime?`<span class="sep"></span>${L(o.slotTime)}`:''}</div>
    </div>

    ${o.status === 'PROCESSING' ? `<div class="offline-banner" style="position:static;margin:0 0 14px;background:#33260a;color:#fcd34d">
      <i data-lucide="wifi-off"></i>${t('order.disconnected')}</div>` : ''}

    ${liveBlock}

    <div class="section-title">${t('order.timeline')}</div>
    <div class="card pad"><div class="timeline" id="timeline">${timelineHtml(o, order)}</div></div>

    <div class="section-title">${t('order.shop')}</div>
    <div class="card list-row">
      <div class="avatar sm" style="border-radius:12px">${shop.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
      <div class="grow"><div class="ttl">${shop.name}</div><div class="sub"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${shop.address}</div></div>
    </div>

    <div class="section-title">${t('order.filesTitle')}</div>
    <div class="stack">${o.files.map(f => `<div class="card pad">
      <div class="row between"><div class="file-name">${f.fileName}</div><span class="price tnum">${money(f.subtotalPrice)}</span></div>
      <div class="chips" style="margin-top:8px">${fileChips(f)}</div>
    </div>`).join('')}</div>

    <div class="section-title">${t('order.payment')}</div>
    <div class="card pad">
      <div class="kv"><span class="k">${t('order.method')}</span><span class="v">${o.paymentMethod==='WALLET'?t('wizard.payWallet'):t('wizard.payCash')}</span></div>
      <div class="kv"><span class="k" style="font-weight:700;color:var(--text-primary)">${t('order.total')}</span><span class="v" style="color:var(--primary);font-size:17px">${money(o.totalPrice)}</span></div>
    </div>

    <div class="stack" style="margin-top:18px">
      ${canCancel ? `<button class="btn btn-danger" onclick="confirmCancel('${o.id}')"><i data-lucide="x-circle"></i>${t('order.cancelOrder')}</button>` : ''}
      ${canAdvance ? `<button class="btn btn-secondary" onclick="advanceOrder('${o.id}')"><i data-lucide="play"></i>${t('order.advance')}</button>` : ''}
    </div>
  </div>`);
  return node;
};

function timelineHtml(o, order) {
  // when cancelled, show cancelled state
  if (o.status === 'CANCELLED') {
    return `<div class="tl-node current"><div class="tl-rail"><div class="tl-dot" style="background:var(--error)"><i data-lucide="x-circle"></i></div></div>
      <div class="tl-label"><div class="t">${t('status.CANCELLED')}</div><div class="ts">${t('order.cancelledNote')}</div></div></div>`;
  }
  const curIdx = order.indexOf(o.status);
  return order.map((st, i) => {
    const cls = i < curIdx ? 'done' : i === curIdx ? 'current' : '';
    const m = STATUS_META[st];
    return `<div class="tl-node ${cls}">
      <div class="tl-rail"><div class="tl-dot"><i data-lucide="${i < curIdx ? 'check' : m.icon}"></i></div><div class="tl-line"></div></div>
      <div class="tl-label"><div class="t">${t(m.labelKey)}</div>${i===curIdx?`<div class="ts">${st==='READY'?t('order.collectedNote'):''}</div>`:''}</div>
    </div>`;
  }).join('');
}

function advanceOrder(id) {
  const o = orderById(id);
  const next = NEXT_STATUS[o.status];
  if (!next) return;
  o.status = next;
  if (next === 'READY' || next === 'COLLECTED') { o.position = 0; o.etaMins = 0; }
  else if (next === 'PROCESSING') { o.position = 1; o.etaMins = Math.max(4, o.etaMins - 6); }
  render();
  // animate badge + eta count-up after re-render
  setTimeout(() => {
    const b = $('#badgeSlot .badge'); if (b) b.classList.add('crossfade');
    countUpEta();
    toast(t('toast.statusAdvanced', { s: t(STATUS_META[next].labelKey) }));
  }, 30);
}
function countUpEta() {
  const node = $('#etaVal'); if (!node) return;
  node.classList.add('tick');
}

function confirmCancel(id) {
  openSheet(`
    <div class="sheet-ic" style="background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)"><i data-lucide="x-circle"></i></div>
    <div class="sheet-title">${t('order.cancelConfirmTitle')}</div>
    <div class="sheet-body">${t('order.cancelConfirmBody')}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="closeSheet()">${t('order.keepOrder')}</button>
      <button class="btn btn-danger" onclick="doCancel('${id}')">${t('order.confirmCancel')}</button>
    </div>
  `);
}
function doCancel(id) {
  const o = orderById(id); o.status = 'CANCELLED';
  if (o.paymentMethod === 'WALLET') S.wallet.balance += o.totalPrice;
  closeSheet(); render(); toast(t('toast.cancelled'), 'x-circle');
}

/* ---------- ORDER HISTORY ----------------------------------------------- */
SCREENS.history = () => {
  const node = el(`<div class="screen">
    ${header(t('history.title'), { avatar: true })}
    <div class="stack">${S.orders.map(orderRowCard).join('')}</div>
  </div>`);
  // FAB
  const fab = el(`<button class="fab" onclick="go('shops')"><i data-lucide="plus"></i>${t('history.newOrder')}</button>`);
  // attach fab to device-screen so it floats above tab bar
  setTimeout(() => { const root = $('#screen-root .device-screen'); if (root && !$('#histFab')) { fab.id = 'histFab'; root.appendChild(fab); refreshIcons(); } }, 0);
  return node;
};

/* ---------- WALLET ------------------------------------------------------- */
SCREENS.wallet = () => {
  const bal = S.walletLowSim ? S.wallet.lowBalance : S.wallet.balance;
  const low = bal < 50;
  return el(`<div class="screen">
    ${header(t('wallet.title'), { avatar: true })}
    <div class="frost wallet-hero" style="margin-bottom:14px">
      <div class="lbl">${t('wallet.balance')}</div>
      <div class="amt tick" id="balAmt"><span class="cur">৳</span><span>${bnNum(Number(bal).toFixed(2))}</span></div>
      <div class="muted" style="font-size:12px;margin-top:8px">${t('wallet.topUpHint')}</div>
    </div>

    ${low ? `<div class="banner warn" style="margin-bottom:14px"><i data-lucide="alert-triangle"></i>${t('wallet.lowWarn')}</div>` : ''}

    <div class="demo-toggle" style="margin-bottom:16px">
      <span class="demo-tag">DEMO</span>
      <div class="grow"><div class="ttl" style="font-size:13.5px;font-weight:600">${t('wallet.simulateLow')}</div></div>
      <div class="switch ${S.walletLowSim?'on':''}" role="switch" aria-checked="${S.walletLowSim}" onclick="S.walletLowSim=!S.walletLowSim;render()"></div>
    </div>

    <div class="section-title">${t('wallet.transactions')}</div>
    <div class="stack">${S.wallet.transactions.map(txRow).join('')}</div>
  </div>`);
};
function txRow(x) {
  const credit = x.type === 'CREDIT';
  return `<div class="card tx-row">
    <div class="tx-ic ${credit?'credit':'debit'}"><i data-lucide="${credit?'arrow-up':'arrow-down'}"></i></div>
    <div class="grow"><div style="font-weight:600;font-size:14px">${t('reason.'+x.reason)}</div>
      <div class="muted" style="font-size:12px">${x.orderNumber?x.orderNumber+' · ':''}${rel(x.createdAt)}</div></div>
    <span class="tx-amt ${credit?'credit':'debit'} tnum">${credit?'+':'−'}${money(x.amount)}</span>
  </div>`;
}

/* ---------- NOTIFICATIONS ----------------------------------------------- */
SCREENS.notifications = () => {
  const items = S.notifications;
  const right = `<button class="btn btn-sm btn-ghost" onclick="markAllRead()" style="width:auto">${t('notif.markAll')}</button>`;
  return el(`<div class="screen">
    ${header(t('notif.title'), { right, avatar: true })}
    ${items.length ? `<div class="stack">${items.map(notifRow).join('')}</div>` : emptyState('bell-off', t('notif.empty'), t('notif.emptySub'))}
  </div>`);
};
function notifRow(n) {
  const m = NOTIF_META[n.type];
  return `<div class="card notif-row ${n.read?'':'unread'}" onclick="readNotif('${n.id}')">
    <div class="notif-ic tone-${m.tone}"><i data-lucide="${m.icon}"></i></div>
    <div class="grow">
      <div class="notif-ttl">${t(n.titleKey)}</div>
      <div class="notif-body">${t(n.bodyKey, n.meta && n.meta.amount!=null ? {...n.meta, amount: money(n.meta.amount)} : n.meta)}</div>
      <div class="notif-time">${rel(n.createdAt)}</div>
    </div>
    ${n.read?'':'<span class="unread-dot"></span>'}
  </div>`;
}
function readNotif(id) {
  const n = S.notifications.find(x => x.id === id);
  if (n && !n.read) { n.read = true; render(); }
}
function markAllRead() { S.notifications.forEach(n => n.read = true); render(); toast(t('toast.markedRead')); }

/* ---------- PROFILE ------------------------------------------------------ */
SCREENS.profile = () => el(`<div class="screen">
  ${header(t('profile.title'), { back: true })}
  <div class="frost pad row" style="gap:14px;margin-bottom:16px">
    <div class="avatar lg">R</div>
    <div><div class="hdr-title" style="font-size:19px">Rimon Hasan</div><div class="muted" style="font-size:13.5px">rimon@printslot.bd</div></div>
  </div>

  <div class="section-title">${t('profile.account')}</div>
  <div class="stack">
    <div class="field"><label>${t('profile.editName')}</label><input class="input" value="Rimon Hasan"></div>
    <div class="field"><label>${t('profile.editPhone')}</label><input class="input" value="+880 1700-000042"></div>
    <button class="btn btn-primary btn-sm" style="width:auto" onclick="toast(t('toast.saved'))"><i data-lucide="check"></i>${t('common.save')}</button>
  </div>

  <div class="section-title">${t('profile.preferences')}</div>
  <div class="card pad stack">
    <div class="field"><label>${t('profile.language')}</label>
      <div class="seg">
        <button class="${S.lang==='en'?'active':''}" onclick="setLang('en')">EN</button>
        <button class="${S.lang==='bn'?'active':''}" onclick="setLang('bn')">বাংলা</button>
      </div></div>
    <div class="field"><label>${t('profile.theme')}</label>
      <div class="seg">
        <button class="${S.theme==='light'?'active':''}" onclick="setTheme('light')"><i data-lucide="sun"></i>${t('profile.themeLight')}</button>
        <button class="${S.theme==='dark'?'active':''}" onclick="setTheme('dark')"><i data-lucide="moon"></i>${t('profile.themeDark')}</button>
        <button onclick="setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')"><i data-lucide="monitor"></i>${t('profile.themeSystem')}</button>
      </div></div>
  </div>

  <button class="btn btn-danger" style="margin-top:18px" onclick="confirmLogout()"><i data-lucide="log-out"></i>${t('common.logout')}</button>
</div>`);

function confirmLogout() {
  openSheet(`
    <div class="sheet-ic" style="background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)"><i data-lucide="log-out"></i></div>
    <div class="sheet-title">${t('profile.logoutConfirm')}</div>
    <div class="sheet-body">${t('profile.logoutBody')}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="closeSheet()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="doLogout()">${t('common.logout')}</button>
    </div>
  `);
}
function doLogout() {
  closeSheet();
  if (S.role === 'CUSTOMER') { S.authed = false; S.history = []; go('login', {}, false); }
  else { go(roleHome(S.role), {}, false); }
  toast(t('toast.loggedOut'), 'log-out');
}

/* =========================================================================
 * STAFF
 * =======================================================================*/
SCREENS.staffJobs = () => {
  const slot = S.jobs.filter(j => j.mode === 'SLOT');
  const queue = S.jobs.filter(j => j.mode === 'QUEUE');
  return el(`<div class="screen">
    ${header(t('staff.jobsTitle'), { avatar: true })}
    ${S.jobs.length === 0 ? emptyState('clipboard-list', t('staff.empty'), t('staff.emptySub')) : `
    <div class="section-title"><i data-lucide="calendar-clock" style="width:16px;height:16px;vertical-align:-2px"></i> ${t('staff.slotJobs')}</div>
    <div class="stack">${slot.map(jobRow).join('') || `<div class="muted" style="padding:8px">—</div>`}</div>
    <div class="section-title"><i data-lucide="list-ordered" style="width:16px;height:16px;vertical-align:-2px"></i> ${t('staff.queueJobs')}</div>
    <div class="stack">${queue.map(jobRow).join('') || `<div class="muted" style="padding:8px">—</div>`}</div>`}
  </div>`);
};
function jobRow(j) {
  const initial = j.customerName.split(' ')[0];
  const lastInit = (j.customerName.split(' ')[1] || ' ')[0];
  const time = j.slotTime ? L(j.slotTime) : rel(j.createdAt);
  const fileLabel = j.files.length === 1 ? t('common.file', { n: bnNum(1) }) : t('common.files', { n: bnNum(j.files.length) });
  return `<div class="card order-card" onclick="go('jobDetail',{id:'${j.id}'})">
    <div class="row between"><span class="ordnum">${j.orderNumber}</span>${badge(j.status)}</div>
    <div class="row between">
      <div class="order-meta"><span class="avatar sm" style="width:26px;height:26px;font-size:11px;border-radius:8px">${lastInit}</span>${initial} ${lastInit}.<span class="sep"></span>${fileLabel}</div>
      <span class="muted" style="font-size:12.5px">${time}</span>
    </div>
  </div>`;
}

SCREENS.jobDetail = () => {
  const j = jobById(S.params.id) || S.jobs[0];
  const next = NEXT_STATUS[j.status];
  const nextLabel = j.status === 'PROCESSING' ? t('staff.markReady') : j.status === 'READY' ? t('staff.markCollected') : t('staff.startProcessing');
  return el(`<div class="screen">
    ${header('', { back: true })}
    <div class="frost pad stack" style="margin-bottom:14px">
      <div class="row between"><div class="hdr-title" style="font-size:26px">${j.orderNumber}</div><span id="jobBadge">${badge(j.status)}</span></div>
      <div class="row between">
        <div><div style="font-weight:700">${j.customerName}</div>
          <div class="muted row" style="gap:5px;font-size:13px;margin-top:2px"><i data-lucide="phone" style="width:13px;height:13px"></i>${j.customerPhone}</div></div>
        ${j.slotTime?`<span class="pill"><i data-lucide="calendar-clock"></i>${L(j.slotTime)}</span>`:''}
      </div>
    </div>

    <div class="card pad" style="margin-bottom:14px">
      <div class="kv"><span class="k">${t('order.method')}</span><span class="v">${j.paymentMethod==='WALLET'?t('wizard.payWallet'):t('wizard.payCash')}</span></div>
      <div class="kv"><span class="k" style="font-weight:700;color:var(--text-primary)">${t('order.total')}</span><span class="v" style="color:var(--primary);font-size:17px">${money(j.totalPrice)}</span></div>
    </div>

    <div class="section-title">${t('staff.config')}</div>
    <div class="stack">${j.files.map(jobFileRow).join('')}</div>

    ${next ? `<div class="sticky-actions"><button class="btn btn-primary" onclick="advanceJob('${j.id}')"><i data-lucide="arrow-right"></i>${nextLabel}</button></div>` : `
      <div class="banner success" style="margin-top:16px"><i data-lucide="check-check"></i>${t('order.collectedNote')}</div>`}
  </div>`);
};
function jobFileRow(f) {
  const ic = MIME_IC[f.mime] || 'file';
  return `<div class="card pad">
    <div class="file-row" style="padding:0;margin-bottom:8px"><div class="file-ic"><i data-lucide="${ic}"></i></div>
      <div class="grow"><div class="file-name">${f.fileName}</div></div><span class="price tnum">${money(f.subtotalPrice)}</span></div>
    <div class="kv"><span class="k">${t('wizard.color')}/${t('wizard.bwShort')}</span><span class="v">${f.colorMode==='COLOR'?t('wizard.color'):t('wizard.bwShort')}</span></div>
    <div class="kv"><span class="k">${t('shop.pricing')}</span><span class="v">${f.paperSize} · ${f.orientation==='PORTRAIT'?t('wizard.portrait'):t('wizard.landscape')}</span></div>
    <div class="kv"><span class="k">${t('wizard.copies')} / ${t('wizard.duplex')}</span><span class="v">${bnNum(f.copies)}× · ${f.duplex?t('wizard.duplex'):'—'}</span></div>
    <div class="kv"><span class="k">${t('wizard.pageRange')}</span><span class="v">${f.pageRange?L(f.pageRange):'—'} (${bnNum(f.resolvedPages)} ${t('wizard.pages',{n:''}).trim()||'pages'})</span></div>
  </div>`;
}
function advanceJob(id) {
  const j = jobById(id); const next = NEXT_STATUS[j.status]; if (!next) return;
  j.status = next; render();
  setTimeout(() => { const b = $('#jobBadge .badge'); if (b) b.classList.add('crossfade'); toast(t('toast.statusAdvanced',{s:t(STATUS_META[next].labelKey)})); }, 30);
}

/* =========================================================================
 * OWNER
 * =======================================================================*/
SCREENS.ownerShop = () => {
  S.ownerShopState = S.ownerShopState || 'ACTIVE';
  const st = S.ownerShopState;
  const s = SHOPS[0];
  const banner = st === 'PENDING' ? `<div class="banner warn" style="margin-bottom:14px"><i data-lucide="clock"></i>${t('owner.pendingBanner')}</div>`
    : st === 'REJECTED' ? `<div class="banner error" style="margin-bottom:14px"><i data-lucide="x-circle"></i>${t('owner.rejectedBanner')}</div>`
    : `<div class="banner success" style="margin-bottom:14px"><i data-lucide="badge-check"></i>${t('owner.shopActive')}</div>`;
  return el(`<div class="screen">
    ${header(t('owner.shopTitle'), { avatar: true })}
    <div class="seg compact" style="width:100%;margin-bottom:12px">
      <button class="${st==='ACTIVE'?'active':''}" onclick="S.ownerShopState='ACTIVE';render()">ACTIVE</button>
      <button class="${st==='PENDING'?'active':''}" onclick="S.ownerShopState='PENDING';render()">PENDING</button>
      <button class="${st==='REJECTED'?'active':''}" onclick="S.ownerShopState='REJECTED';render()">REJECTED</button>
    </div>
    ${banner}
    ${st==='REJECTED' ? `<button class="btn btn-primary" style="margin-bottom:14px" onclick="S.ownerShopState='PENDING';render();toast(t('toast.saved'))"><i data-lucide="rotate-ccw"></i>${t('owner.resubmit')}</button>`:''}
    <div class="card pad stack">
      <div class="field"><label>${t('common.name')}</label><input class="input" value="${s.name}" ${st==='REJECTED'?'disabled':''}></div>
      <div class="field"><label>${t('shop.phone')}</label><input class="input" value="${s.phone}" ${st==='REJECTED'?'disabled':''}></div>
      <div class="field"><label>${t('owner.rates')}</label>
        <div class="row" style="gap:8px">
          <input class="input" value="${s.colorRate}" ${st==='REJECTED'?'disabled':''}>
          <input class="input" value="${s.bwRate}" ${st==='REJECTED'?'disabled':''}>
        </div></div>
      <button class="btn btn-primary btn-sm" style="width:auto" ${st==='REJECTED'?'disabled':''} onclick="toast(t('toast.saved'))"><i data-lucide="check"></i>${t('common.save')}</button>
    </div>
  </div>`);
};

SCREENS.ownerJobs = () => {
  const slot = S.jobs.filter(j => j.mode === 'SLOT');
  const queue = S.jobs.filter(j => j.mode === 'QUEUE');
  return el(`<div class="screen">
    ${header(t('staff.jobsTitle'), { avatar: true })}
    <div class="section-title">${t('staff.slotJobs')}</div>
    <div class="stack">${slot.map(jobRow).join('')}</div>
    <div class="section-title">${t('staff.queueJobs')}</div>
    <div class="stack">${queue.map(jobRow).join('')}</div>
  </div>`);
};

SCREENS.ownerSlots = () => el(`<div class="screen">
  ${header(t('owner.slotsTitle'), { avatar: true })}
  <div class="date-chips" style="margin-bottom:14px">
    ${[t('wizard.today'),'+1','+2','+3'].map((d,i)=>`<button class="date-chip ${i===0?'active':''}">${d}</button>`).join('')}
  </div>
  <div class="stack">${S.ownerSlots.map((s,i)=>`<div class="card pad">
    <div class="row between" style="margin-bottom:10px">
      <span style="font-weight:700">${L(s.time)}</span>
      <div class="switch ${s.isOpen?'on':''}" role="switch" aria-checked="${s.isOpen}" onclick="toggleOwnerSlot(${i})"></div>
    </div>
    <div class="row between">
      <div class="row" style="gap:8px">
        <span class="secondary" style="font-size:13px;font-weight:600">${t('owner.maxOrders')}</span>
        <div class="stepper"><button onclick="bumpMax(${i},-1)"><i data-lucide="minus"></i></button><span class="val tnum">${bnNum(s.maxOrders)}</span><button onclick="bumpMax(${i},1)"><i data-lucide="plus"></i></button></div>
      </div>
      <span class="pill ${s.used>=s.maxOrders?'':''}" style="${s.used>=s.maxOrders?'background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)':''}">${t('owner.usage',{u:bnNum(s.used),m:bnNum(s.maxOrders)})}</span>
    </div>
  </div>`).join('')}</div>
</div>`);
function toggleOwnerSlot(i) { S.ownerSlots[i].isOpen = !S.ownerSlots[i].isOpen; render(); toast(t('toast.slotUpdated')); }
function bumpMax(i, d) { S.ownerSlots[i].maxOrders = Math.max(1, S.ownerSlots[i].maxOrders + d); render(); }

SCREENS.ownerStaff = () => el(`<div class="screen">
  ${header(t('owner.staffTitle'), { avatar: true })}
  <div class="card pad stack" style="margin-bottom:14px">
    <div class="field"><label>${t('owner.promote')}</label>
      <input class="input" id="promoteId" placeholder="${t('owner.userIdHint')}"></div>
    <button class="btn btn-primary btn-sm" style="width:auto" onclick="addStaff()"><i data-lucide="user-plus"></i>${t('common.add')}</button>
  </div>
  <div class="stack">${S.ownerStaff.map(staffRow).join('')}</div>
</div>`);
function staffRow(u) {
  return `<div class="card list-row">
    <div class="avatar sm">${u.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
    <div class="grow"><div class="ttl">${u.name}</div><div class="sub">${u.email}</div></div>
    <button class="hdr-back" style="border-color:color-mix(in srgb,var(--error) 30%,transparent);color:var(--error)" aria-label="${t('owner.removeStaff')}" onclick="event.stopPropagation();confirmRemoveStaff('${u.id}')"><i data-lucide="user-minus"></i></button>
  </div>`;
}
function confirmRemoveStaff(id) {
  openSheet(`
    <div class="sheet-ic" style="background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)"><i data-lucide="user-minus"></i></div>
    <div class="sheet-title">${t('owner.removeStaff')}</div>
    <div class="sheet-body">${t('owner.removeStaffBody')}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="closeSheet()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="removeStaff('${id}')">${t('common.delete')}</button>
    </div>
  `);
}
function removeStaff(id) { S.ownerStaff = S.ownerStaff.filter(u => u.id !== id); closeSheet(); render(); toast(t('toast.staffRemoved'), 'user-minus'); }
function addStaff() {
  S.ownerStaff.push({ id: 'u-' + (200 + S.ownerStaff.length), name: 'New Staff', email: 'new@campusprint.bd', phone: '+880 1700-000000' });
  render(); toast(t('toast.staffAdded'), 'user-plus');
}

SCREENS.ownerAnalytics = () => {
  const a = OWNER_ANALYTICS;
  return el(`<div class="screen">
    ${header(t('owner.analyticsTitle'), { avatar: true })}
    <div class="stat-grid" style="margin-bottom:14px">
      ${statCard('package','owner.totalOrders', bnNum(a.totalOrders))}
      ${statCard('banknote','owner.revenue', money(a.revenue))}
      ${statCard('timer','owner.avgProcessing', t('owner.mins',{n:bnNum(a.avgProcessingMins)}))}
      ${statCard('check-check','status.COLLECTED', bnNum(a.byStatus.COLLECTED))}
    </div>
    <div class="section-title">${t('owner.breakdown')}</div>
    <div class="card pad">
      <div class="donut-wrap">${donut(a.byStatus)}</div>
      <div class="muted" style="font-size:12px;margin-top:14px"><i data-lucide="info" style="width:13px;height:13px;vertical-align:-2px"></i> ${t('owner.revenueNote')}</div>
    </div>
  </div>`);
};
function statCard(icon, key, val) {
  return `<div class="card stat-card"><div class="ic"><i data-lucide="${icon}"></i></div>
    <div class="v">${val}</div><div class="k">${t(key)}</div></div>`;
}
function donut(byStatus) {
  const tones = { QUEUED:'var(--info)', PROCESSING:'var(--warn)', READY:'var(--success)', COLLECTED:'var(--violet)', CANCELLED:'var(--error)' };
  const entries = Object.entries(byStatus).filter(([,v]) => v > 0);
  const total = entries.reduce((s,[,v]) => s+v, 0);
  let acc = 0; const C = 2 * Math.PI * 42;
  const segs = entries.map(([k,v]) => {
    const frac = v/total; const dash = frac * C; const off = -acc * C; acc += frac;
    return `<circle cx="60" cy="60" r="42" fill="none" stroke="${tones[k]}" stroke-width="16"
      stroke-dasharray="${dash} ${C-dash}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"></circle>`;
  }).join('');
  const legend = entries.map(([k,v]) => `<div class="legend-item">
    <span class="legend-swatch" style="background:${tones[k]}"></span>${t(STATUS_META[k].labelKey)}
    <span class="legend-val tnum">${bnNum(v)}</span></div>`).join('');
  return `<svg class="donut" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="42" fill="none" stroke="var(--border)" stroke-width="16"></circle>${segs}
    <text x="60" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text-primary)">${bnNum(total)}</text>
    <text x="60" y="74" text-anchor="middle" font-size="9" fill="var(--text-muted)">${t('owner.totalOrders')}</text>
  </svg><div class="legend">${legend}</div>`;
}

/* =========================================================================
 * ADMIN
 * =======================================================================*/
SCREENS.adminShops = () => {
  S.adminFilter = S.adminFilter || 'PENDING';
  const items = S.adminFilter === 'PENDING' ? S.adminShops.filter(s => s.status === 'PENDING') : S.adminShops;
  return el(`<div class="screen">
    ${header(t('admin.shopsTitle'), { avatar: true })}
    <div class="seg" style="margin-bottom:14px">
      <button class="${S.adminFilter==='PENDING'?'active':''}" onclick="S.adminFilter='PENDING';render()">${t('admin.pending')}</button>
      <button class="${S.adminFilter==='ALL'?'active':''}" onclick="S.adminFilter='ALL';render()">${t('admin.all')}</button>
    </div>
    ${items.length ? `<div class="stack">${items.map(adminShopRow).join('')}</div>` : emptyState('store', t('shops.empty'), t('notif.emptySub'))}
  </div>`);
};
function adminShopRow(s) {
  const statusBadge = { ACTIVE:'success', PENDING:'warn', SUSPENDED:'warn', REJECTED:'error' }[s.status];
  const ic = { ACTIVE:'badge-check', PENDING:'clock', SUSPENDED:'pause', REJECTED:'x-circle' }[s.status];
  let actions = '';
  if (s.status === 'PENDING') actions = `<div class="btn-row" style="margin-top:10px">
    <button class="btn btn-sm btn-primary" style="flex:1" onclick="approveShop('${s.id}')"><i data-lucide="check"></i>${t('admin.approve')}</button>
    <button class="btn btn-sm btn-danger" style="flex:1" onclick="rejectShopSheet('${s.id}')"><i data-lucide="x"></i>${t('admin.reject')}</button></div>`;
  else if (s.status === 'ACTIVE') actions = `<button class="btn btn-sm btn-danger" style="margin-top:10px;width:auto" onclick="suspendShop('${s.id}')"><i data-lucide="pause"></i>${t('admin.suspend')}</button>`;
  else if (s.status === 'SUSPENDED') actions = `<div class="btn-row" style="margin-top:10px">
    <button class="btn btn-sm btn-primary" style="flex:1" onclick="reinstateShop('${s.id}')"><i data-lucide="play"></i>${t('admin.reinstate')}</button>
    <button class="btn btn-sm btn-danger" style="flex:1" onclick="rejectShopSheet('${s.id}')"><i data-lucide="x"></i>${t('admin.reject')}</button></div>`;
  else if (s.status === 'REJECTED') actions = `<div class="banner error" style="margin-top:10px;font-weight:500;font-size:12.5px"><i data-lucide="info"></i>${s.reason||t('admin.readonly')}</div>`;
  return `<div class="card pad">
    <div class="row between">
      <div class="grow"><div style="font-weight:700;font-size:15px">${s.name}</div>
        <div class="muted row" style="gap:5px;font-size:12.5px;margin-top:3px"><i data-lucide="map-pin" style="width:12px;height:12px"></i>${s.address}</div></div>
      <span class="badge tone-${statusBadge}"><i data-lucide="${ic}"></i>${s.status}</span>
    </div>
    ${actions}
  </div>`;
}
function approveShop(id) { S.adminShops.find(s=>s.id===id).status='ACTIVE'; render(); toast(t('toast.approved')); }
function suspendShop(id) { const s=S.adminShops.find(s=>s.id===id); s.status='SUSPENDED'; s.reason=null; render(); toast(t('toast.suspended'),'pause'); }
function reinstateShop(id) { S.adminShops.find(s=>s.id===id).status='ACTIVE'; render(); toast(t('toast.reinstated')); }
function rejectShopSheet(id) {
  openSheet(`
    <div class="sheet-title">${t('admin.rejectTitle')}</div>
    <div class="field" style="margin:10px 0 14px"><label>${t('admin.rejectReason')}</label>
      <textarea class="input" id="rejReason" rows="3" style="resize:none;min-height:90px" placeholder="${t('admin.rejectHint')}" oninput="document.getElementById('rejBtn').disabled = this.value.trim().length < 5"></textarea>
      <span class="muted" style="font-size:11.5px;padding-left:2px">${t('admin.rejectHint')}</span></div>
    <button id="rejBtn" class="btn btn-danger" disabled onclick="doReject('${id}')"><i data-lucide="x-circle"></i>${t('admin.submitReject')}</button>
  `);
}
function doReject(id) {
  const reason = document.getElementById('rejReason').value.trim();
  const s = S.adminShops.find(s=>s.id===id); s.status='REJECTED'; s.reason=reason;
  closeSheet(); render(); toast(t('toast.rejected'),'x-circle');
}

SCREENS.adminAnalytics = () => {
  const a = ADMIN_ANALYTICS;
  const max = Math.max(...a.revenuePerShop.map(r=>r.revenue));
  return el(`<div class="screen">
    ${header(t('admin.analyticsTitle'), { avatar: true })}
    <div class="banner info" style="margin-bottom:14px"><i data-lucide="clock"></i>${t('admin.pendingApprovals',{n:bnNum(a.pendingApprovals)})}</div>
    <div class="stat-grid" style="margin-bottom:14px">
      ${statCard('store','admin.totalShops', bnNum(a.totalShops))}
      ${statCard('badge-check','admin.activeShops', bnNum(a.activeShops))}
      ${statCard('package','admin.totalOrders', bnNum(a.totalOrders))}
      ${statCard('banknote','admin.revenue', money(a.revenue))}
    </div>
    <div class="section-title">${t('admin.revenuePerShop')}</div>
    <div class="card pad">
      <div class="bars">${a.revenuePerShop.map(r=>`<div class="bar-row">
        <div class="bl"><span>${r.name}</span><span class="tnum">${money(r.revenue)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.revenue/max*100)}%"></div></div>
      </div>`).join('')}</div>
    </div>
    <div class="card pad" style="margin-top:14px">
      ${a.revenuePerShop.map(r=>`<div class="kv"><span class="k">${r.name}</span><span class="v">${money(r.revenue)}</span></div>`).join('')}
    </div>
  </div>`);
};

SCREENS.adminConfig = () => el(`<div class="screen">
  ${header(t('admin.configTitle'), { avatar: true })}
  <div class="stack">${ADMIN_CONFIG.map(c=>`<div class="card cfg-row" onclick="editConfig('${c.key}','${c.value}')">
    <div class="grow"><div class="cfg-k">${c.key}</div><div class="cfg-d">${t(c.descKey)}</div></div>
    <span class="cfg-v">${bnNum(c.value)}</span>
    <span class="chev"><i data-lucide="chevron-right" style="width:18px;height:18px;color:var(--text-muted)"></i></span>
  </div>`).join('')}</div>
</div>`);
function editConfig(key, val) {
  openSheet(`
    <div class="sheet-title">${t('admin.editValue')}</div>
    <div class="field" style="margin:12px 0 16px"><label>${key}</label>
      <input class="input tnum" type="number" id="cfgVal" value="${val}"></div>
    <button class="btn btn-primary" onclick="closeSheet();toast(t('toast.configUpdated'))"><i data-lucide="check"></i>${t('common.save')}</button>
  `);
}

SCREENS.adminTemplates = () => el(`<div class="screen">
  ${header(t('admin.templatesTitle'), { avatar: true, right: `<button class="hdr-back" aria-label="${t('admin.addTemplate')}" onclick="addTemplateSheet()"><i data-lucide="plus"></i></button>` })}
  <div class="stack">${S.adminTemplates.map(tpl=>`<div class="card list-row">
    <div class="lead-ic"><i data-lucide="clock"></i></div>
    <div class="grow"><div class="ttl tnum">${L(tpl.time)}</div></div>
    <button class="hdr-back" aria-label="${t('common.edit')}" onclick="editTemplateSheet('${tpl.id}')"><i data-lucide="pencil"></i></button>
    <button class="hdr-back" style="color:var(--error)" aria-label="${t('common.delete')}" onclick="confirmDeleteTemplate('${tpl.id}')"><i data-lucide="trash-2"></i></button>
  </div>`).join('')}</div>
</div>`);
function addTemplateSheet() {
  openSheet(`
    <div class="sheet-title">${t('admin.addTemplate')}</div>
    <div class="row" style="gap:10px;margin:12px 0 16px">
      <div class="field grow"><label>${t('admin.startTime')}</label><input class="input" type="time" value="11:30"></div>
      <div class="field grow"><label>${t('admin.endTime')}</label><input class="input" type="time" value="12:00"></div>
    </div>
    <button class="btn btn-primary" onclick="addTemplate()"><i data-lucide="plus"></i>${t('common.add')}</button>
  `);
}
function addTemplate() {
  S.adminTemplates.push({ id: 't-'+(S.adminTemplates.length+1), time: '11:30–12:00' });
  closeSheet(); render(); toast(t('toast.templateAdded'));
}
function editTemplateSheet(id) {
  const tpl = S.adminTemplates.find(x=>x.id===id);
  openSheet(`
    <div class="sheet-title">${t('common.edit')}</div>
    <div class="row" style="gap:10px;margin:12px 0 16px">
      <div class="field grow"><label>${t('admin.startTime')}</label><input class="input" type="time" value="${tpl.time.split('–')[0]}"></div>
      <div class="field grow"><label>${t('admin.endTime')}</label><input class="input" type="time" value="${tpl.time.split('–')[1]}"></div>
    </div>
    <button class="btn btn-primary" onclick="closeSheet();toast(t('toast.saved'))"><i data-lucide="check"></i>${t('common.save')}</button>
  `);
}
function confirmDeleteTemplate(id) {
  openSheet(`
    <div class="sheet-ic" style="background:color-mix(in srgb,var(--error) 14%,transparent);color:var(--error)"><i data-lucide="trash-2"></i></div>
    <div class="sheet-title">${t('admin.deleteTemplate')}</div>
    <div class="sheet-body">${t('admin.deleteTemplateBody')}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="closeSheet()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="deleteTemplate('${id}')">${t('common.delete')}</button>
    </div>
  `);
}
function deleteTemplate(id) { S.adminTemplates = S.adminTemplates.filter(x=>x.id!==id); closeSheet(); render(); toast(t('toast.templateDeleted'),'trash-2'); }

/* =========================================================================
 * SHARED: empty state
 * =======================================================================*/
function emptyState(icon, title, sub) {
  return `<div class="empty"><div class="ec"><i data-lucide="${icon}"></i></div>
    <div class="et">${title}</div><div class="es">${sub}</div></div>`;
}

/* =========================================================================
 * CONTROL BAR WIRING + BOOT
 * =======================================================================*/
function wireControls() {
  document.querySelectorAll('[data-ctl-role]').forEach(b => b.onclick = () => setRole(b.dataset.ctlRole));
  document.querySelectorAll('[data-ctl-theme]').forEach(b => b.onclick = () => setTheme(b.dataset.ctlTheme));
  document.querySelectorAll('[data-ctl-lang]').forEach(b => b.onclick = () => setLang(b.dataset.ctlLang));
  $('#ctlReset').onclick = resetAll;
  $('#ctlOffline').onclick = () => { S.offline = !S.offline; render(); };
}

window.addEventListener('DOMContentLoaded', () => {
  wireControls();
  render();
});
