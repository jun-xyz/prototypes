import assert from 'node:assert/strict';
import { createGame, tick, moveTo, moveRight, action, serve, atStation, matchRecipe, compatible, nextStep, grade, TIMES, STATIONS, STATION_X, RECIPES, newCup } from './game.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const run = (s, sec, dt = 0.05) => { for (let i = 0; i < Math.round(sec / dt); i++) tick(s, dt); return s; };
const idx = (n) => STATIONS.indexOf(n);
const goto = (s, name) => { moveTo(s, idx(name)); run(s, Math.abs(STATION_X[idx(name)] - s.armPos) / TIMES.speed + 0.06); assert.equal(atStation(s), name, 'arrive ' + name); };
const wait = (s) => run(s, Math.max(0, s.busyUntil - s.t) + 0.06);
const rec = (id) => RECIPES.find(r => r.id === id);

// 1. 이동: 기계 한 칸(36px) 0.4초, 노즐 한 칸(16px) 약 0.18초, 이동 중 동작 불가
{
  const s = createGame({ firstOrderAt: 999 });
  moveRight(s); run(s, 0.2);
  assert.equal(atStation(s), null); assert.equal(action(s).reason, 'moving');
  run(s, 0.21); assert.equal(atStation(s), 'ice');
  moveTo(s, idx('milk')); run(s, 0.7); assert.equal(atStation(s), 'milk');
  moveRight(s); run(s, 0.1); assert.equal(atStation(s), null); run(s, 0.1); assert.equal(atStation(s), 'choco');
}

// 2. 컵DP: 동작으로만 집고, 손이 차면 못 집음
{
  const s = createGame({ firstOrderAt: 999 });
  assert.equal(action(s).did, 'cup'); assert.ok(s.hand);
  assert.equal(action(s).reason, 'busy'); wait(s);
  assert.equal(action(s).reason, 'hand_full');
}

// 3. 슬롯: 얼음 기계에 넣고 → 팔 자유 → 다른 컵 집기 → 돌아와 꺼내기
{
  const s = createGame({ firstOrderAt: 999 });
  action(s); wait(s); goto(s, 'ice');
  const put = action(s); assert.equal(put.did, 'put'); assert.equal(s.hand, null); assert.ok(s.slots.ice);
  wait(s); assert.equal(action(s).reason, 'working');          // 아직 일하는 중
  goto(s, 'cup'); action(s); wait(s); assert.ok(s.hand);          // 그 사이 새 컵
  goto(s, 'ice'); run(s, TIMES.ice);
  const sw = action(s); assert.equal(sw.did, 'swap');            // 새 컵과 교체: 손엔 얼음 컵
  assert.ok(s.hand.ice); assert.ok(s.slots.ice && s.slots.ice.cup.ice);
  wait(s); assert.equal(action(s).reason, 'working');
  run(s, TIMES.ice); assert.equal(action(s).reason, 'hand_full'); // 손 컵은 이미 얼음 → 교체 불가
  serve(s); wait(s);                                             // (주문 없음 → 폐기) 손 비움
  assert.equal(action(s).did, 'take'); assert.ok(s.hand.ice);
}

// 4. 샷 슬롯 4초 병렬 + 서빙 매칭
{
  const s = createGame({ firstOrderAt: 0, orderGap: [99, 99] }, seq([0]));
  run(s, 0.1); assert.equal(s.orders[0].recipe.id, 'hot_ame');
  action(s); wait(s); goto(s, 'coffee'); assert.equal(action(s).did, 'put'); wait(s);
  assert.equal(action(s).reason, 'working');
  run(s, TIMES.coffee); assert.equal(action(s).did, 'take'); assert.ok(s.hand.shot);
  wait(s); const sv = serve(s); assert.equal(sv.did, 'served'); assert.equal(s.revenue, 3200);
  assert.equal(serve(s).reason, 'busy');
}

// 5. 재료 노즐: 노즐마다 정거장·슬롯, 중복 불가, 최대 2개, 순서 무관 매칭
{
  const s = createGame({ firstOrderAt: 999 });
  s.hand = newCup(); goto(s, 'milk');
  assert.equal(action(s).did, 'put'); assert.ok(s.slots.milk); wait(s);
  goto(s, 'cup'); action(s); wait(s); goto(s, 'blacktea'); action(s); wait(s);   // 두 번째 컵은 홍차 노즐에
  assert.ok(s.slots.blacktea && s.slots.milk);                                   // 노즐 두 곳에 동시에
  goto(s, 'milk'); run(s, TIMES.drink); assert.equal(action(s).did, 'take'); wait(s);
  assert.equal(action(s).reason, 'dup');
  goto(s, 'blacktea'); run(s, TIMES.drink);
  assert.equal(action(s).did, 'swap'); wait(s);                                  // 밀크 컵을 홍차 노즐에, 손엔 홍차 컵
  assert.deepEqual(s.hand.ings, ['blacktea']);
  run(s, TIMES.drink); assert.equal(action(s).reason, 'hand_full');             // 손 컵도 홍차 있음 → 교체 불가
  serve(s); wait(s); assert.equal(action(s).did, 'take');
  assert.deepEqual(s.hand.ings, ['milk', 'blacktea']); wait(s);
  goto(s, 'vanilla'); assert.equal(action(s).reason, 'already');
  assert.equal(matchRecipe(s.hand).id, 'hot_mtea');
  const cup2 = { ice: false, shot: false, ings: ['blacktea', 'milk'] }; assert.equal(matchRecipe(cup2).id, 'hot_mtea');
}

// 6. 가장 오래된 일치 주문 처리, 불일치는 폐기
{
  const s = createGame({ firstOrderAt: 999 });
  s.orders.push({ id: 1, recipe: rec('ice_latte'), createdAt: 0, expiresAt: 99 });
  s.orders.push({ id: 2, recipe: rec('hot_ame'), createdAt: 1, expiresAt: 99 });
  s.orders.push({ id: 3, recipe: rec('hot_ame'), createdAt: 2, expiresAt: 99 });
  s.hand = { ice: false, shot: true, ings: [] }; goto(s, 'milk');
  const r = serve(s); assert.equal(r.did, 'served'); assert.equal(r.price, 3200);
  assert.deepEqual(s.orders.map(o => o.id), [1, 3]); wait(s);
  s.hand = { ice: true, shot: false, ings: ['grape'] };
  assert.equal(serve(s).did, 'waste'); assert.equal(s.wasted, 1);
  wait(s); assert.equal(serve(s).reason, 'no_cup');
  s.hand = newCup(); moveTo(s, 0); assert.equal(serve(s).reason, 'moving');
}

// 7. 호환·다음 단계 안내
{
  const cup = { ice: true, shot: false, ings: ['milk'] };
  assert.equal(compatible(cup, rec('ice_mtea')), true);
  assert.equal(compatible(cup, rec('ice_latte')), true);
  assert.equal(compatible(cup, rec('hot_latte')), false);
  assert.equal(nextStep(cup, rec('ice_latte')), 'shot');
  assert.equal(nextStep(cup, rec('ice_mtea')), 'blacktea');
  assert.equal(nextStep({ ice: true, shot: true, ings: ['milk'] }, rec('ice_latte')), 'serve');
}

// 8. 인내심·종료·등급
{
  const s = createGame({ firstOrderAt: 0, orderGap: [99, 99], patience: 25 }, seq([0]));
  run(s, 1); assert.equal(s.orders.length, 1);
  run(s, 24.1); assert.equal(s.orders.length, 0); assert.equal(s.angry, 1);
  const e = createGame({ orderGap: [5, 5], orderGapLate: [5, 5] }, seq([0.5])); run(e, 61);
  assert.equal(e.ended, true); assert.ok(e.orders.length <= 6); assert.equal(action(e).reason, 'busy');
  assert.equal(grade(0), '견습 바리스타'); assert.equal(grade(36000), '바리스급');
}

console.log('all tests passed');
