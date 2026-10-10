import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarWeeks, isSelectableDate, shiftMonth } from '../src/shared/lib/datePicker.ts';
import { seoulToday } from '../src/features/trips/services/tripRules.ts';

test('달력은 윤년·월말·연도 경계에서도 실제 날짜와 일요일 시작 주를 구성한다', () => {
  const weeks = calendarWeeks('2024-02-10');
  assert.equal(weeks[0][4], '2024-02-01');
  assert.equal(weeks.flat().filter(Boolean).length, 29);
  assert.equal(calendarWeeks('2025-02-01').flat().filter(Boolean).length, 28);
  assert.ok(weeks.every(week => week.length === 7));
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2026-01-31', -1), '2025-12-01');
  assert.equal(shiftMonth('0001-01-01', -1), '0001-01-01');
  assert.equal(shiftMonth('9999-12-01', 1), '9999-12-01');
});

test('선택 범위는 시작·종료일을 포함하고 범위 밖·존재하지 않는 날짜를 막는다', () => {
  const selectable = value => isSelectableDate(value, '2026-10-10', '2026-10-12');
  assert.equal(selectable('2026-10-09'), false);
  assert.equal(selectable('2026-10-10'), true);
  assert.equal(selectable('2026-10-12'), true);
  assert.equal(selectable('2026-10-13'), false);
  assert.equal(isSelectableDate('2026-02-29'), false);
  assert.equal(isSelectableDate('2024-02-29'), true);
  assert.equal(isSelectableDate('2026-10-10', '2026-10-10', '2026-10-10'), true);
  const today = seoulToday(Date.UTC(2026, 9, 9, 15));
  assert.equal(today, '2026-10-10');
  assert.equal(isSelectableDate('2026-10-09', today), false);
  assert.equal(isSelectableDate(today, today), true);
});
