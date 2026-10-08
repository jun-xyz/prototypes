// 바리스 되기 60초 — 게임 로직 (순수 상태 머신, 화면 없음)
// 스펙: docs/superpowers/specs/2026-10-08-baris-game-design.md

// 컵 빼고는 전부 슬롯: 컵을 넣어 두면 기계가 혼자 일하고 팔은 자유
export const TIMES = { cup: 0.5, ice: 1.5, coffee: 4, drink: 2.5, handle: 0.4, serve: 1.0, speed: 90 }; // speed: 레일 px/초

// 음료DP = 파우더 4 + 시럽 4 (바리스브루 Beverage v2.0 DP 구조)
export const INGREDIENTS = { // num: 화면·키보드에 쓰는 번호(1~8)
  milk:    { name: '밀크',   kind: 'powder', color: '#f1e3c6', num: 1 },
  choco:   { name: '초코',   kind: 'powder', color: '#4a2c1a', num: 2 },
  icetea:  { name: '아이스티', kind: 'powder', color: '#e9a24a', num: 3 },
  grape:   { name: '자몽',   kind: 'powder', color: '#ef6a7a', num: 4 },
  vanilla: { name: '바닐라', kind: 'syrup',  color: '#ffd76a', num: 5 },
  blacktea:{ name: '홍차',   kind: 'syrup',  color: '#a2442c', num: 6 },
  orange:  { name: '오렌지', kind: 'syrup',  color: '#ff8c2e', num: 7 },
  brownsugar:{ name: '흑당', kind: 'syrup',  color: '#2d1a10', num: 8 },
};
export const ING_KEYS = Object.keys(INGREDIENTS);
export const MAX_INGS = 2;

// 레일 정거장 11칸: 컵·얼음·샷 + 파우더DP 노즐 4 + 시럽DP 노즐 4. 픽업존은 로봇 앞 카운터
export const STATIONS = ['cup', 'ice', 'coffee', ...ING_KEYS];
// 레일 위 x 좌표(논리 px). 기계 3대는 36px 칸, 재료 노즐은 16px 칸
export const STATION_X = [18, 54, 90, 116, 132, 148, 164, 180, 196, 212, 228];
export const STATION_LABEL = { cup: '컵DP', ice: '아이스DP', coffee: '커피DP', ...Object.fromEntries(ING_KEYS.map(k => [k, INGREDIENTS[k].name])) };
export const isIngStation = (st) => !!INGREDIENTS[st];

const R = (id, name, short, price, ice, shot, ings, w = 1) => ({ id, name, short, price, ice, shot, ings, w });
export const RECIPES = [
  R('hot_ame',   '핫 아메리카노',    '아메',    3200, false, true,  [], 3),
  R('ice_ame',   '아이스 아메리카노', '아메',    3200, true,  true,  [], 3),
  R('hot_latte', '핫 카페라떼',      '라떼',    3900, false, true,  ['milk'], 2),
  R('ice_latte', '아이스 카페라떼',   '라떼',    3900, true,  true,  ['milk'], 2),
  R('hot_mocha', '핫 카페모카',      '모카',    4300, false, true,  ['milk', 'choco']),
  R('ice_mocha', '아이스 카페모카',   '모카',    4300, true,  true,  ['milk', 'choco']),
  R('hot_vlatte','핫 바닐라라떼',    '바닐라', 4300, false, true, ['milk', 'vanilla']),
  R('ice_vlatte','아이스 바닐라라떼', '바닐라', 4300, true, true,  ['milk', 'vanilla']),
  R('hot_choco', '핫 초코라떼',      '초코',    3800, false, false, ['choco']),
  R('ice_choco', '아이스 초코라떼',   '초코',    3800, true,  false, ['choco']),
  R('ice_tea',   '아이스티',         '티',     3500, true,  false, ['icetea'], 2),
  R('ice_otea',  '오렌지 아이스티',   '오렌지', 3900, true,  false, ['icetea', 'orange']),
  R('hot_mtea',  '핫 밀크티',        '밀크티',  4000, false, false, ['milk', 'blacktea']),
  R('ice_mtea',  '아이스 밀크티',     '밀크티',  4000, true,  false, ['milk', 'blacktea']),
  R('ice_grape', '자몽허니티',        '자몽티',  4200, true,  false, ['grape'], 2),
  R('ice_ashot', '아샷추',           '아샷추',  4000, true,  true,  ['icetea']),
  R('hot_bsl',   '핫 흑당라떼',      '흑당', 4300, false, false, ['milk', 'brownsugar']),
  R('ice_bsl',   '아이스 흑당라떼',   '흑당', 4300, true,  false, ['milk', 'brownsugar']),
];

// 난이도: 사용자 플레이 기준으로 기존 값(32초·5.5~7.5)이 「어려움」 수준이었다 (2026-10-09)
export const DIFFICULTY = {
  easy:   { label: '쉬움',   patience: 50, orderGap: [9, 11],   orderGapLate: [7, 9],     easyUntil: 20 },
  normal: { label: '보통',   patience: 40, orderGap: [7, 9],    orderGapLate: [5.5, 7.5], easyUntil: 12 },
  hard:   { label: '어려움', patience: 32, orderGap: [5.5, 7.5], orderGapLate: [4.5, 6],  easyUntil: 10 },
};
// 실제 바리스브루: 시간당 최대 100잔(헬로티 2026-05-24) × 영업 12시간 = 하루 1,200잔. 결과 비교에 쓴다
export const ROBOT_PER_HOUR = 100, BUSINESS_HOURS = 12, ROBOT_PER_DAY = ROBOT_PER_HOUR * BUSINESS_HOURS;
// 손님 이름 — XYZ 구성원 이름(성 제외). 2026-10-09 사용자 결정(노션 멤버 목록에서 추림, 게스트·봇·2자 이름 제외)
export const CUSTOMER_NAMES = ['미종','민지','준호','대광','민서','병수','병조','연준','재현','정현','준영','지윤','진오','현국','민규','송현','주철','정욱','원호','원희','호진','수진','소나','형욱','수열','신영','희동','한나','정우','우석','희수','창영','용성','혁수','태연','성재'];
export function nameHash(name) { let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export const DEFAULTS = {
  duration: 100,
  firstOrderAt: 0.5,
  maxOrders: 6,
  difficulty: 'normal',
  ...DIFFICULTY.normal,
};

export function createGame(opts = {}, rng = Math.random) {
  const diff = DIFFICULTY[opts.difficulty] || DIFFICULTY[DEFAULTS.difficulty];
  const cfg = { ...DEFAULTS, ...diff, ...opts };
  return {
    cfg, rng,
    t: 0, ended: false,
    armPos: STATION_X[0], armTarget: 0,      // armPos는 레일 x(px), armTarget은 정거장 번호
    busyUntil: 0, busyWith: null,
    hand: null,                              // { ice, shot, ings: [] }
    slots: Object.fromEntries(STATIONS.slice(1).map(k => [k, null])), // 기계·노즐마다 { cup, readyAt }
    orders: [], nextOrderAt: cfg.firstOrderAt, orderSeq: 0,
    revenue: 0, servedCount: 0, angry: 0, wasted: 0,
    trail: [],                               // { kind: 'served'|'angry'|'waste', recipe?, at }
    events: [],
  };
}

function emit(s, type, data = {}) { s.events.push({ type, t: s.t, ...data }); }
export const newCup = () => ({ ice: false, shot: false, ings: [] });

export function stationIndex(name) { return STATIONS.indexOf(name); }
export function atStation(s) {
  return Math.abs(s.armPos - STATION_X[s.armTarget]) < 1e-6 ? STATIONS[s.armTarget] : null;
}
export function isBusy(s) { return s.t < s.busyUntil; }

export function moveTo(s, idx) {
  if (s.ended || isBusy(s)) return false;
  idx = Math.max(0, Math.min(STATIONS.length - 1, idx));
  if (idx === s.armTarget) return false;
  s.armTarget = idx;
  return true;
}
export function moveLeft(s) { return moveTo(s, s.armTarget - 1); }
export function moveRight(s) { return moveTo(s, s.armTarget + 1); }

function pickRecipe(s) {
  const pool = s.t < s.cfg.easyUntil ? RECIPES.filter(r => r.id.includes('ame')) : RECIPES;
  const total = pool.reduce((a, r) => a + r.w, 0); let x = s.rng() * total;
  for (const r of pool) { x -= r.w; if (x <= 0) return r; }
  return pool[pool.length - 1];
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
export function sameRecipe(cup, r) { return !!cup.ice === r.ice && !!cup.shot === r.shot && sameSet(cup.ings, r.ings); }
export function matchRecipe(cup) { return RECIPES.find(r => sameRecipe(cup, r)) || null; }
// 손의 컵이 이 레시피로 갈 수 있나 (지금까지 넣은 게 전부 레시피에 포함)
export function compatible(cup, r) {
  if (cup.ice && !r.ice) return false; if (cup.shot && !r.shot) return false;
  return cup.ings.every(i => r.ings.includes(i));
}
// 레시피 기준으로 다음에 들를 곳
export function nextStep(cup, r) {
  if (r.ice && !cup.ice) return 'ice';
  if (r.shot && !cup.shot) return 'shot';
  const need = r.ings.find(i => !cup.ings.includes(i)); if (need) return need;
  return 'serve';
}

// 이 기계가 이 컵에 할 일이 남았나
function canUse(st, cup) {
  if (st === 'ice') return !cup.ice ? 'ok' : 'already';
  if (st === 'coffee') return !cup.shot ? 'ok' : 'already';
  if (isIngStation(st)) {
    if (cup.ings.includes(st)) return 'dup';
    if (cup.ings.length >= MAX_INGS) return 'already';
    return 'ok';
  }
  return 'no';
}
function apply(st, cup) {
  if (st === 'ice') cup.ice = true; else if (st === 'coffee') cup.shot = true; else cup.ings.push(st);
}
const procTime = (st) => st === 'ice' ? TIMES.ice : st === 'coffee' ? TIMES.coffee : TIMES.drink;

export function action(s) {
  if (s.ended || isBusy(s)) return { ok: false, reason: 'busy' };
  const st = atStation(s);
  if (!st) return { ok: false, reason: 'moving' };
  const busy = (sec, with_) => { s.busyUntil = s.t + sec; s.busyWith = with_; };

  if (st === 'cup') {
    if (s.hand) return { ok: false, reason: 'hand_full' };
    s.hand = newCup(); busy(TIMES.cup, 'cup'); emit(s, 'cup');
    return { ok: true, did: 'cup' };
  }
  const slot = s.slots[st];
  if (slot) {
    if (s.t < slot.readyAt) return { ok: false, reason: 'working' };
    if (!s.hand) { // 꺼내기
      s.hand = slot.cup; s.slots[st] = null;
      busy(TIMES.handle, 'take'); emit(s, 'take', { station: st });
      return { ok: true, did: 'take', station: st };
    }
    // 교체: 손의 컵이 이 기계를 쓸 수 있을 때만
    const c = canUse(st, s.hand);
    if (c !== 'ok') return { ok: false, reason: 'hand_full' };
    const fresh = s.hand; apply(st, fresh);
    s.hand = slot.cup; s.slots[st] = { cup: fresh, readyAt: s.t + procTime(st) };
    busy(TIMES.handle, 'swap'); emit(s, 'swap', { station: st });
    return { ok: true, did: 'swap', station: st };
  }
  if (!s.hand) return { ok: false, reason: 'no_cup' };
  const c = canUse(st, s.hand);
  if (c !== 'ok') return { ok: false, reason: c };
  const cup = s.hand; apply(st, cup);
  s.slots[st] = { cup, readyAt: s.t + procTime(st) }; s.hand = null;
  busy(TIMES.handle, 'put'); emit(s, 'put', { station: st });
  return { ok: true, did: 'put', station: st };
}

// 서빙: 픽업존은 로봇 앞 카운터라 레일 어디서든 팔을 앞으로 돌려 놓는다 (이동 중엔 불가)
export function serve(s) {
  if (s.ended || isBusy(s)) return { ok: false, reason: 'busy' };
  if (!atStation(s)) return { ok: false, reason: 'moving' };
  if (!s.hand) return { ok: false, reason: 'no_cup' };
  const cup = s.hand; s.hand = null;
  s.busyUntil = s.t + TIMES.serve; s.busyWith = 'serve';
  const idx = s.orders.findIndex(o => sameRecipe(cup, o.recipe));
  if (idx === -1) {
    const r = matchRecipe(cup);
    s.wasted++; s.trail.push({ kind: 'waste', recipe: r, at: s.t });
    emit(s, 'waste', { recipe: r });
    return { ok: true, did: 'waste', recipe: r };
  }
  const [o] = s.orders.splice(idx, 1);
  s.revenue += o.recipe.price; s.servedCount++;
  s.trail.push({ kind: 'served', recipe: o.recipe, at: s.t });
  emit(s, 'served', { recipe: o.recipe, order: o, idx });
  return { ok: true, did: 'served', recipe: o.recipe, price: o.recipe.price };
}

export function tick(s, dt) {
  if (s.ended) return s;
  s.t += dt;
  const tx = STATION_X[s.armTarget];
  if (s.armPos !== tx) {
    const step = dt * TIMES.speed, d = tx - s.armPos;
    if (Math.abs(d) <= step) { s.armPos = tx; emit(s, 'arrive', { station: STATIONS[s.armTarget] }); }
    else s.armPos += Math.sign(d) * step;
  }
  for (const st of STATIONS.slice(1)) {
    const sl = s.slots[st]; if (sl && !sl.done && s.t >= sl.readyAt) { sl.done = true; emit(s, 'ready', { station: st }); }
  }
  while (s.t >= s.nextOrderAt && s.t < s.cfg.duration) {
    if (s.orders.length < s.cfg.maxOrders) {
      const r = pickRecipe(s);
      const inQueue = new Set(s.orders.map(o => o.name));
      const free = CUSTOMER_NAMES.filter(n => !inQueue.has(n));
      const name = free[Math.floor(s.rng() * free.length)] || CUSTOMER_NAMES[0];
      s.orders.push({ id: ++s.orderSeq, name, recipe: r, createdAt: s.nextOrderAt, expiresAt: s.nextOrderAt + s.cfg.patience });
      emit(s, 'order', { recipe: r });
    }
    const gap = s.t < s.cfg.duration / 2 ? s.cfg.orderGap : s.cfg.orderGapLate;
    s.nextOrderAt += gap[0] + s.rng() * (gap[1] - gap[0]);
  }
  for (let i = s.orders.length - 1; i >= 0; i--) {
    const o = s.orders[i];
    if (s.t >= o.expiresAt) { s.orders.splice(i, 1); s.angry++; s.trail.push({ kind: 'angry', recipe: o.recipe, at: s.t }); emit(s, 'angry', { recipe: o.recipe, order: o, idx: i }); }
  }
  if (s.t >= s.cfg.duration) { s.ended = true; emit(s, 'end'); }
  return s;
}

export function patienceRatio(s, o) { return Math.max(0, (o.expiresAt - s.t) / s.cfg.patience); }

export const GRADES = [ // 100초 기준
  { min: 0,     name: '견습 바리스타', coupon: false },
  { min: 20000, name: '숙련 바리스타', coupon: false },
  { min: 40000, name: '마스터 바리스타', coupon: true },
  { min: 60000, name: '바리스급', coupon: true },
];
export function gradeOf(revenue) { let g = GRADES[0]; for (const x of GRADES) if (revenue >= x.min) g = x; return g; }
export function grade(revenue) { return gradeOf(revenue).name; }
// 체험용 쿠폰 코드 — 실제 쿠폰 시스템과 연결돼 있지 않다(더미). 매출·날짜로 정해지는 6자리
export function couponCode(revenue, date = new Date()) {
  const seed = revenue * 31 + date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let x = seed >>> 0, out = '';
  for (let i = 0; i < 6; i++) { x = (x * 1103515245 + 12345) >>> 0; out += A[(x >>> 16) % A.length]; }
  return 'BARIS-' + out;
}

// 바리스 한 줄 평 — 페르소나 1차(gentle·calm·witty) 톤, 검토 중
export function remark(s) {
  const { revenue, servedCount: n, angry, wasted } = s;
  if (n === 0) return '컵을 드는 것부터 시작입니다. 저도 첫날엔 그랬습니다.';
  if (wasted >= 2) return '주문에 없는 음료가 ' + wasted + '잔. 정성은 알겠지만, 손님은 모릅니다.';
  if (angry >= 3) return '돌아간 손님이 ' + angry + '분. 레일 위에서는 순서가 곧 친절입니다.';
  if (revenue >= 60000) return '제 레일을 내어드려도 되겠습니다. 다만 제 자리는 아닙니다.';
  if (revenue >= 40000) return '기계마다 컵을 걸어 두고 다음 컵을 집는 손. 그게 병렬입니다. 보셨죠.';
  if (revenue >= 20000) return '나쁘지 않습니다. 샷 기계가 비는 시간이 아깝긴 했습니다만.';
  return '서두르면 흘립니다. 저는 안 흘립니다.';
}
