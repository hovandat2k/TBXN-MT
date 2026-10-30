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

vm.runInContext("const PF=['xanh','noi','chin'];",context);
for(const name of ['parseKg','parsePct','pcts','nightAverages','combineNightAverages']){const start=source.indexOf('function '+name+'(');vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),context);}
const row=o=>({date:'30/10/2026',gio:'01:00',thuc:'1,000',xanh:'20',noi:'10',chin:'70',thuhoi:'5',...o});
const [avg]=context.nightAverages([row({}),row({thuc:'3,000',xanh:'60',noi:'20',chin:'20',thuhoi:'7'}),row({xanh:'',noi:'',chin:'',thuhoi:'x'})]);
assert.equal(avg.night,'29/10/2026');assert.equal(avg.count,3);assert.equal(avg.qualityCount,2);assert.equal(avg.recoveryCount,2);
assert.equal(avg.totalWeight,5000);assert.equal(avg.x,50);assert.equal(avg.n,17.5);assert.equal(avg.c,32.5);assert.equal(avg.th,6.5);
const [inferred]=context.nightAverages([row({chin:'',thuhoi:'0'})]);assert.equal(inferred.c,70);assert.equal(inferred.th,0);
const [missing]=context.nightAverages([row({xanh:'70',noi:'70',chin:'10',thuhoi:''}),row({thuc:'',thuhoi:'8'})]);
assert.equal(missing.totalWeight,1000);assert.equal(missing.x,null);assert.equal(missing.th,null);assert.equal(missing.qualityCount,0);assert.equal(missing.recoveryCount,0);
const nights=context.nightAverages([row({date:'29/10/2026',gio:'16:59'}),row({date:'29/10/2026',gio:'17:00'}),row({date:'30/10/2026',gio:'00:00'})]);
assert.equal(nights.length,2);assert.equal(nights[0].night,'29/10/2026');assert.equal(nights[0].count,2);assert.equal(nights[1].count,1);
assert.equal(context.nightAverages([]).length,0);
console.log('PASS: weighted nightly averages, separate coverage, inferred percentages, missing/invalid values, X markers, zero recovery and night boundaries.');

// The overview reads every night from the database, independently of the detail filters.
const els=new Map();context.$=id=>{if(!els.has(id))els.set(id,{hidden:false,innerHTML:'',style:{}});return els.get(id);};
Object.assign(context,{DB:{rows:[row({date:'29/10/2026',gio:'20:00'}),row({date:'28/10/2026',gio:'20:00',thuhoi:'7'})],samples:[]},LSX:{rows:[row({date:'29/10/2026'})]},lsMode:'avg',lsEditor:false,lsTok:0,document:{querySelectorAll:()=>[]},freeSamples:()=>[],sheetRowsOf:(rows,free)=>[...rows,...free],esc:String,fmtKg:n=>n.toLocaleString("en-US"),fmtPct:String,f2:n=>n.toFixed(2)});
for(const name of ['renderNightAverages','renderLS']){const start=source.indexOf('function '+name+'(');vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),context);}
context.renderLS();const table=els.get('#lsNightAverages').innerHTML;
assert(table.includes('Đêm 29/10/2026'));assert(table.includes('Đêm 28/10/2026'));assert(table.includes('Tổng khối lượng (kg)'));assert(table.includes('1,000'));assert(table.includes('5.00 kg'));assert(table.includes('7.00 kg'));
assert.equal((table.match(/<tr>/g)||[]).length,4);assert.equal(els.get('#lsSheet').hidden,true);assert.equal(els.get('#lsCtl').innerHTML,'');
assert(!table.includes('<small>'),'hide coverage when every vehicle has data');
context.DB.rows.push(row({date:'29/10/2026',gio:'21:00',xanh:'',noi:'',chin:'',thuhoi:'x'}));context.renderLS();
let partial=els.get('#lsNightAverages').innerHTML;assert.equal((partial.match(/<small>1\/2<\/small>/g)||[]).length,4);
context.DB.rows=[row({xanh:'',noi:'',chin:'',thuhoi:''})];context.renderLS();partial=els.get('#lsNightAverages').innerHTML;assert.equal((partial.match(/<small>0\/1<\/small>/g)||[]).length,8);
context.DB.rows=[];context.renderLS();assert(els.get('#lsNightAverages').innerHTML.includes('Chưa có dữ liệu'));assert(!els.get('#lsNightAverages').innerHTML.includes('<table'));
console.log('PASS: all-night overview ignores selected detail rows, hides detail sheet and clears empty data.');

const combined=context.combineNightAverages(context.nightAverages([row({thuc:'1,000',thuhoi:'5'}),row({date:'29/10/2026',gio:'01:00',thuc:'3,000',xanh:'60',noi:'20',chin:'20',thuhoi:'7'}),row({xanh:'',noi:'',chin:'',thuhoi:'x'})]));
assert.equal(combined.totalWeight,5000);assert.equal(combined.count,3);assert.equal(combined.x,50);assert.equal(combined.n,17.5);assert.equal(combined.c,32.5);assert.equal(combined.th,6.5);assert.equal(combined.qualityCount,2);assert.equal(combined.recoveryCount,2);assert(table.includes('<tfoot>'));assert(table.includes('TRUNG BÌNH TẤT CẢ CÁC ĐÊM'));
console.log('PASS: all-night footer uses original eligible weights, total mass and coverage.');
