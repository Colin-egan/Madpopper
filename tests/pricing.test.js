import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/pricing-config.js';
import { parseDate, businessDaysBetween, calculateQuote } from '../site/js/pricing.js';

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

test('100 minis, pickup, standard lead time: 15% volume discount', () => {
  const q = calculateQuote(base, TODAY);
  assert.equal(q.ok, true);
  assert.equal(q.discountRate, 0.15);
  assert.equal(q.total, 170); // 100 x $2 = 200, minus 30
  assert.equal(q.perBag, 1.7);
});

test('mini bag is the only size, at $2', () => {
  assert.deepEqual(Object.keys(CONFIG.sizes), ['mini']);
  assert.equal(CONFIG.sizes.mini.unitPrice, 2);
  assert.equal(calculateQuote({ ...base, size: 'snack' }, TODAY).ok, false);
});

test('no customization or one-time fees: more flavors and stray options cost nothing', () => {
  assert.equal(calculateQuote({ ...base, flavors: 1 }, TODAY).total, 170);
  assert.equal(calculateQuote({ ...base, options: ['brandedLabel'] }, TODAY).total, 170);
  const labels = calculateQuote({ ...base, flavors: 2 }, TODAY).lines.map((l) => l.label).join(' ');
  assert.doesNotMatch(labels, /setup|flavor|label/i);
});

test('delivery is free and there is no rush fee', () => {
  assert.equal(calculateQuote({ ...base, fulfillment: 'durham' }, TODAY).total, 170);
  assert.equal(calculateQuote({ ...base, fulfillment: 'wake' }, TODAY).total, 170);
  const soon = calculateQuote({ ...base, date: '2027-06-17', fulfillment: 'wake' }, TODAY); // 3 business days out
  assert.equal(soon.ok, true);
  assert.equal(soon.total, 170);
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
  const q = calculateQuote({ ...base, quantity: 2500 }, TODAY);
  assert.equal(q.ok, false);
  assert.equal(q.needsQuote, true);
});

test('WakeMed-scale: 6000 minis is a custom-quote order', () => {
  assert.equal(calculateQuote({ ...base, quantity: 6000 }, TODAY).needsQuote, true);
});

test('1000 minis hits the 25% tier', () => {
  const q = calculateQuote({ ...base, quantity: 1000, date: '2027-07-20' }, TODAY);
  assert.equal(q.discountRate, 0.25);
  assert.equal(q.total, 1500); // 1000 x $2 = 2000, minus 25%
});

test('line items foot to the total for every quantity, delivery choice and lead time', () => {
  const sum = (lines) => Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const dates = ['2027-06-25', '2027-06-16']; // well ahead, shortest notice
  for (const quantity of [25, 26, 99, 100, 101, 299, 300, 999, 1000, 2000]) {
    for (const fulfillment of ['pickup', 'durham', 'wake']) {
      for (const date of dates) {
        const q = calculateQuote({ ...base, quantity, fulfillment, date }, TODAY);
        assert.equal(q.ok, true);
        assert.equal(sum(q.lines), q.total, `x${quantity} ${fulfillment} ${date}`);
      }
    }
  }
});
