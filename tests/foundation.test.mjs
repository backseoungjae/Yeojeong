import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, formatDate, formatNumber, formatTimestamp, initialLanguage } from '../src/shared/i18n/format.ts';
import { translate } from '../src/shared/i18n/translate.ts';
import { messages } from '../src/shared/i18n/messages.ts';
import { colors, resolveTheme } from '../src/shared/theme/tokens.ts';
test('기기 언어 ko 변형 지원, 미지원 언어는 영어', () => {
  for (const tag of ['ko', 'ko-KR', 'KO_kr']) assert.equal(initialLanguage(tag),'ko');
  for (const tag of ['en-US', 'ja-JP', undefined, null, '']) assert.equal(initialLanguage(tag),'en');
});
test('두 언어의 번역 키 일치, 보간·언어별 복수형·숫자 처리', () => {
  assert.deepEqual(Object.keys(messages.ko).sort(),Object.keys(messages.en).sort());
  assert.equal(translate('en','gallery.count',{count:1}),'1 item');
  assert.equal(translate('en','gallery.count',{count:2}),'2 items');
  assert.equal(translate('ko','gallery.count',{count:1000}),'항목 1,000개');
  assert.throws(()=>translate('en','gallery.count'),TypeError);
  assert.throws(()=>translate('ko','gallery.date'),TypeError);
  assert.equal(formatNumber(1234567.89,'en'),'1,234,567.89');
});
test('실제 달력 날짜만 허용하고 윤년·월말 검증', () => {
  assert.equal(calendarDate('2024-02-29').getUTCDate(),29);
  assert.equal(calendarDate('0001-01-01').getUTCFullYear(),1);
  for (const date of ['2023-02-29','2024-02-30','2026-13-01','2026-00-01','2026-01-00','2026-04-31','0000-01-01','2026-1-01','2026-10-08T00:00:00Z']) assert.throws(()=>calendarDate(date),RangeError);
});
test('달력 날짜는 기기 시간대와 독립, 타임스탬프는 한국 여행 시간', () => {
  const before=process.env.TZ;
  try {
    for (const zone of ['Pacific/Honolulu','Asia/Seoul','Pacific/Kiritimati']) {
      process.env.TZ=zone;
      assert.equal(formatDate('2026-10-08','en'),'October 8, 2026');
      assert.equal(formatDate('2026-10-08','ko'),'2026년 10월 8일');
      assert.equal(formatTimestamp(Date.UTC(2026,9,7,15),'en',{dateStyle:'long'}),'October 8, 2026');
    }
  } finally { if(before === undefined) delete process.env.TZ; else process.env.TZ=before; }
});
test('명시 테마는 시스템 테마와 독립, 시스템은 다크 변경을 반영', () => {
  assert.equal(resolveTheme('light','dark'),'light');
  assert.equal(resolveTheme('dark','light'),'dark');
  assert.equal(resolveTheme('system','dark'),'dark');
  assert.equal(resolveTheme('system','light'),'light');
  assert.equal(resolveTheme('system',null),'light');
});
function luminance(hex) {
  const rgb=hex.slice(1).match(/.{2}/g).map(value=>parseInt(value,16)/255).map(value=>value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
test('두 테마에서 본문·보조·버튼·오류 텍스트 대비 4.5 이상', () => {
  for (const palette of Object.values(colors)) for (const [text,bg] of [['text','background'],['text','surface'],['textMuted','background'],['textMuted','surface'],['accent','selected'],['onAccent','accent'],['danger','dangerSurface'],['disabledText','disabledBackground']]) {
    const a=luminance(palette[text]),b=luminance(palette[bg]);
    assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,`${text}/${bg}`);
  }
});

test('입력과 포커스 경계가 표면 대비 3 이상', () => {
  for(const palette of Object.values(colors)) for(const key of ['border','focus']) {
    const a=luminance(palette[key]),b=luminance(palette.surface);
    assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=3,key);
  }
});
