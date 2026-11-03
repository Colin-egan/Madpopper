import test from 'node:test';
import assert from 'node:assert/strict';
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
const base = { size: 'mini', quantity: 100, flavors: 2, options: [], fulfillment: 'pickup', date: '2027-06-25' };

test('100 minis, pickup, standard lead time: 15% volume discount', () => {
  const q = calculateQuote(base, TODAY);
  assert.equal(q.ok, true);
  assert.equal(q.discountRate, 0.15);
  assert.equal(q.total, 106.25); // 125 - 18.75
  assert.equal(q.perBag, 1.06); // 106.25/100 rounded to cents
});

test('add-ons are not discounted; setup is one-time', () => {
  const q = calculateQuote({ ...base, options: ['brandedLabel', 'giftTag'] }, TODAY);
  // 106.25 + 100*0.30 + 75 + 100*0.20 = 231.25
  assert.equal(q.total, 231.25);
});

test('extra flavors beyond 2 cost $25 each', () => {
  assert.equal(calculateQuote({ ...base, flavors: 4 }, TODAY).total, 156.25);
});

test('delivery zones add a flat fee', () => {
  assert.equal(calculateQuote({ ...base, fulfillment: 'durham' }, TODAY).total, 141.25);
  assert.equal(calculateQuote({ ...base, fulfillment: 'wake' }, TODAY).total, 161.25);
});

test('rush (3 business days out) adds 25% of discounted bag subtotal', () => {
  // 2027-06-17 is 3 business days after Mon 06-14
  const q = calculateQuote({ ...base, date: '2027-06-17' }, TODAY);
  assert.equal(q.rush, true);
  assert.equal(q.total, 132.81); // 106.25 + 26.5625 -> 132.8125 -> 132.81
});

test('rejects too-soon dates, Sundays, past dates, and far-future dates', () => {
  assert.equal(calculateQuote({ ...base, date: '2027-06-15' }, TODAY).ok, false); // 1 business day
  assert.equal(calculateQuote({ ...base, date: '2027-06-27' }, TODAY).ok, false); // Sunday
  assert.equal(calculateQuote({ ...base, date: '2027-06-01' }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, date: '2029-01-01' }, TODAY).ok, false);
});

test('validates quantity, size, flavors, options, fulfillment', () => {
  assert.equal(calculateQuote({ ...base, quantity: 10 }, TODAY).ok, false);      // below minimum
  assert.equal(calculateQuote({ ...base, quantity: 12.5 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, size: 'huge' }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 0 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 7 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, options: ['glitter'] }, TODAY).ok, false);
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
  assert.equal(q.total, 937.5);
});
