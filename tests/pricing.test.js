import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/pricing-config.js';
import { parseDate, businessDaysBetween, calculateQuote, findCode } from '../site/js/pricing.js';

test('parseDate accepts valid and rejects invalid dates', () => {
  assert.equal(parseDate('2027-06-15').toISOString(), '2027-06-15T00:00:00.000Z');
  assert.equal(parseDate('2027-02-30'), null);
  assert.equal(parseDate('nope'), null);
  assert.equal(parseDate(''), null);
});

test('businessDaysBetween skips Sundays and excludes the start day', () => {
  // Mon 2027-06-14 -> Mon 2027-06-21: Tue,Wed,Thu,Fri,Sat,(Sun skipped),Mon = 6
  assert.equal(businessDaysBetween(parseDate('2027-06-14'), parseDate('2027-06-21')), 6);
  assert.equal(businessDaysBetween(parseDate('2027-06-14'), parseDate('2027-06-14')), 0);
});

const TODAY = '2027-06-14'; // Monday
const base = { size: 'mini', quantity: 100, flavors: 2, fulfillment: 'pickup', date: '2027-06-25' };

test('100 minis, pickup: no volume discount below 1000 bags', () => {
  const q = calculateQuote(base, TODAY);
  assert.equal(q.ok, true);
  assert.equal(q.discountRate, 0);
  assert.equal(q.total, 200); // 100 x $2
  assert.equal(q.perBag, 2);
});

test('mini bag is the only size, at $2', () => {
  assert.deepEqual(Object.keys(CONFIG.sizes), ['mini']);
  assert.equal(CONFIG.sizes.mini.unitPrice, 2);
  assert.equal(calculateQuote({ ...base, size: 'snack' }, TODAY).ok, false);
});

test('no customization or one-time fees: more flavors and stray options cost nothing', () => {
  assert.equal(calculateQuote({ ...base, flavors: 1 }, TODAY).total, 200);
  assert.equal(calculateQuote({ ...base, options: ['brandedLabel'] }, TODAY).total, 200);
  const labels = calculateQuote({ ...base, flavors: 2 }, TODAY).lines.map((l) => l.label).join(' ');
  assert.doesNotMatch(labels, /setup|flavor|label/i);
});

test('delivery is free and there is no rush fee', () => {
  assert.equal(calculateQuote({ ...base, fulfillment: 'durham' }, TODAY).total, 200);
  assert.equal(calculateQuote({ ...base, fulfillment: 'wake' }, TODAY).total, 200);
  const soon = calculateQuote({ ...base, date: '2027-06-17', fulfillment: 'wake' }, TODAY); // 3 business days out
  assert.equal(soon.ok, true);
  assert.equal(soon.total, 200);
  assert.doesNotMatch(soon.lines.map((l) => l.label).join(' '), /rush|delivery/i);
});

test('rejects too-soon dates, Sundays, past dates, and far-future dates', () => {
  const reject = (date, re) => {
    const q = calculateQuote({ ...base, date }, TODAY);
    assert.equal(q.ok, false);
    assert.match(q.errors[0], re);
  };
  reject('2027-06-15', /business days/); // 1 business day
  reject('2027-06-27', /Sunday|closed/); // Sunday
  reject('2027-06-01', /future/);
  reject('2029-01-01', /within the next year/);
});

test('lead time: 2 business days is the shortest accepted', () => {
  assert.equal(calculateQuote({ ...base, date: '2027-06-15' }, TODAY).ok, false); // 1 business day
  assert.equal(calculateQuote({ ...base, date: '2027-06-16' }, TODAY).ok, true); // 2 business days
});

test('inherited object keys are not accepted as size or fulfillment', () => {
  for (const k of ['toString', 'constructor', '__proto__']) {
    assert.equal(calculateQuote({ ...base, fulfillment: k }, TODAY).ok, false);
    assert.equal(calculateQuote({ ...base, size: k }, TODAY).ok, false);
  }
});

test('malformed input fails validation instead of throwing', () => {
  assert.equal(calculateQuote(undefined, TODAY).ok, false);
  assert.equal(calculateQuote(null, TODAY).ok, false);
  assert.equal(calculateQuote('nope', TODAY).ok, false);
});

test('invalid today is reported as an internal error', () => {
  const q = calculateQuote(base, 'garbage');
  assert.equal(q.ok, false);
  assert.match(q.errors[0], /Internal error/);
});

test('validates quantity, size, flavors, fulfillment', () => {
  assert.equal(calculateQuote({ ...base, quantity: 10 }, TODAY).ok, false);      // below minimum
  assert.equal(calculateQuote({ ...base, quantity: 12.5 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, size: 'huge' }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 0 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 3 }, TODAY).ok, false); // two flavors max
  assert.equal(calculateQuote({ ...base, fulfillment: 'ship' }, TODAY).ok, false); // no shipping
});

test('above max quantity returns needsQuote instead of a price', () => {
  const q = calculateQuote({ ...base, quantity: 5001 }, TODAY);
  assert.equal(q.ok, false);
  assert.equal(q.needsQuote, true);
});

test('WakeMed-scale: 6000 minis is a custom-quote order', () => {
  assert.equal(calculateQuote({ ...base, quantity: 6000 }, TODAY).needsQuote, true);
});

test('volume tiers: 5% from 1000 bags, 10% from 2000 bags', () => {
  const rate = (quantity) => calculateQuote({ ...base, quantity }, TODAY).discountRate;
  assert.equal(rate(999), 0);
  assert.equal(rate(1000), 0.05);
  assert.equal(rate(1999), 0.05);
  assert.equal(rate(2000), 0.10);
  assert.equal(rate(5000), 0.10);
  assert.equal(calculateQuote({ ...base, quantity: 1000 }, TODAY).total, 1900); // 2000 minus 5%
  assert.equal(calculateQuote({ ...base, quantity: 2000 }, TODAY).total, 3600); // 4000 minus 10%
});

test('discount code takes its share off the bags after the volume discount', () => {
  const q = calculateQuote({ ...base, quantity: 1000, code: ' #PopForAPurpose ' }, TODAY);
  assert.equal(q.code, '#popforapurpose');
  assert.equal(q.total, 1710); // 2000 - 100 (5%) = 1900, minus 10% = 1710
  assert.match(q.lines.at(-1).label, /#popforapurpose/);
});

test('#popforapurpose ignores capitals and the #', () => {
  for (const code of ['#popforapurpose', '#POPFORAPURPOSE', 'PopForAPurpose', 'popforapurpose']) {
    assert.deepEqual(findCode(code), { code: '#popforapurpose', rate: 0.1 }, code);
    assert.equal(calculateQuote({ ...base, code }, TODAY).total, 180, code); // 200 minus 10%
  }
  assert.equal(findCode('##popforapurpose'), null);
  assert.equal(findCode('pop for a purpose'), null);
});

test('unknown, blank or missing codes leave the price alone', () => {
  for (const code of ['NOPE', '', '   ', undefined, null, 42, 'toString', '__proto__']) {
    const q = calculateQuote({ ...base, code }, TODAY);
    assert.equal(q.ok, true, String(code));
    assert.equal(q.total, 200, String(code));
    assert.equal(q.code, null, String(code));
  }
  assert.equal(findCode('nope'), null);
  assert.equal(findCode('#'), null);
  assert.equal(findCode('HEALTHCARE10'), null);
});

test('line items foot to the total for every quantity, delivery choice and lead time', () => {
  const sum = (lines) => Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const dates = ['2027-06-25', '2027-06-16']; // well ahead, shortest notice
  for (const quantity of [25, 26, 99, 100, 101, 333, 999, 1000, 1001, 1999, 2000, 2001, 4999, 5000]) {
    for (const fulfillment of ['pickup', 'durham', 'wake']) {
      for (const date of dates) {
        const q = calculateQuote({ ...base, quantity, fulfillment, date, code: '#popforapurpose' }, TODAY);
        assert.equal(q.ok, true);
        assert.equal(sum(q.lines), q.total, `x${quantity} ${fulfillment} ${date}`);
      }
    }
  }
});
