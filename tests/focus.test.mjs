import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusScheduler } from '../src/shared/accessibility/focusScheduler.ts';
function fixture() {
  const callbacks = []; const events = []; const cancelled = [];
  const scheduler = createFocusScheduler(callback => { callbacks.push(callback); return callbacks.length; }, frame => cancelled.push(frame));
  return { scheduler, events, cancelled, flush: () => callbacks.splice(0).forEach(callback => callback()) };
}
test('초기 포커스 완료 후 확인창과 복귀, 편집 종료의 포커스 순서', () => {
  const { scheduler, events, flush } = fixture();
  const closeEditor = scheduler.schedule(() => events.push('memo')); flush();
  const closeConfirmation = scheduler.schedule(() => events.push('confirmation')); flush();
  closeConfirmation(); scheduler.restore(() => events.push('discard'));
  closeEditor(); scheduler.restore(() => events.push('addMemo')); flush();
  assert.deepEqual(events, ['memo', 'confirmation', 'discard', 'addMemo']);
});
test('빠른 편집→확인→계속 편집은 미완료 초기 포커스보다 복귀를 우선', () => {
  const { scheduler, events, cancelled, flush } = fixture();
  const closeEditor = scheduler.schedule(() => events.push('memo'));
  const closeConfirmation = scheduler.schedule(() => events.push('confirmation'));
  closeConfirmation(); scheduler.restore(() => events.push('discard'));
  // 취소된 콜백까지 실행해도 오래된 포커스가 복귀를 덮어쓰지 않아야 한다.
  flush(); assert.deepEqual(events, ['discard']); assert.ok(cancelled.includes(1));
  closeEditor(); scheduler.restore(() => events.push('addMemo')); flush();
  assert.deepEqual(events, ['discard', 'addMemo']);
});
test('복귀는 아직 예약된 초기 포커스를 취소하고, 이전 예약의 정리는 새 예약을 취소하지 않음', () => {
  const { scheduler, events, flush } = fixture();
  scheduler.schedule(() => events.push('memo'));
  scheduler.restore(() => events.push('discard')); flush(); assert.deepEqual(events, ['discard']);
  const closeOld = scheduler.schedule(() => events.push('old'));
  scheduler.schedule(() => events.push('new')); closeOld(); flush();
  assert.deepEqual(events, ['discard', 'new']);
});
