const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const NIGHT_H ='), source.indexOf('const nightRange =')), context);
for (const [date, time, expected] of [
  ['25/10/2026', '16:59:59', '24/10/2026'],
  ['25/10/2026', '17:00:00', '25/10/2026'],
  ['26/10/2026', '00:00', '25/10/2026'],
  ['26/10/2026', '16:59', '25/10/2026'],
  ['26/10/2026', '17:00', '26/10/2026'],
  ['01/01/2027', '16:59', '31/12/2026'],
  ['01/03/2028', '16:59', '29/02/2028']
]) assert.equal(context.nightOf(date, time), expected, `${date} ${time}`);
const groups = context.nightGroups([
  {date:'25/10/2026',gio:'17:00'},
  {date:'26/10/2026',gio:'16:59'},
  {date:'26/10/2026',gio:'17:00'}
]);
assert.equal(groups.length, 2);
assert.equal(groups[0].rows.length, 2);
assert.equal(context.nightLabel('31/12/2026'), 'Đêm 31/12/2026 - Ngày 01/01/2027');
vm.runInContext(source.match(/const nightStart = n => [^\r\n]+/)[0], context);
assert.equal(vm.runInContext("new Date(nightStart('25/10/2026')).getHours()", context), 17);
assert.equal(vm.runInContext("new Date(nightStart('25/10/2026')).getMinutes()", context), 0);
console.log('PASS: 17:00 boundary, overnight grouping, month/year/leap rollover and default range start.');
