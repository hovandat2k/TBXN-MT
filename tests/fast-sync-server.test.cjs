const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const properties=new Map(); let uuid=0;
const pr={getProperty:k=>properties.get(k)||null,setProperty(k,v){properties.set(k,v);},setProperties(o){Object.entries(o).forEach(([k,v])=>properties.set(k,v));}};
const ctx={PropertiesService:{getScriptProperties:()=>pr},Utilities:{getUuid:()=>`generated-${++uuid}`},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../apps-script/Code.gs'),'utf8'),ctx);
const cols=name=>vm.runInContext(name,ctx);
class Sheet{
  constructor(columns,objects){this.columns=columns;this.data=[columns.map(c=>c[1]),...objects.map(o=>columns.map(c=>o[c[0]]??''))];this.writes=[];this.reads=0;this.formats=0;this.max=2000;}
  getLastRow(){return this.data.length;} getMaxRows(){return this.max;} insertRowsAfter(_,count){this.max+=count;}
  deleteRows(start,count){this.data.splice(start-1,count);}
  getRange(row,col,n,w){return {getValues:()=>{this.reads++;return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>this.data[row+i-1]?.[col+j-1]??''));},
    setValues:values=>{this.writes.push({row,n:values.length});values.forEach((a,i)=>{this.data[row+i-1]??=[];a.forEach((v,j)=>this.data[row+i-1][col+j-1]=v);});},setNumberFormats:()=>{this.formats++;}};}
}
const T=cols('COT_TUOI'),S=cols('COT_THUHOI');
const row=(id,batch='L1')=>({rid:id,batch,khach:'Demo '+id,thuc:1000,tlh:1010,bi:10,date:'25/10/2026',savedAt:'old',savedBy:'Demo'});
const user={user:'admin',name:'Admin',role:'Toàn quyền'};
const db=(rows,samples=[])=>({tuoi:new Sheet(T,rows),thuhoi:new Sheet(S,samples)});
const decoded=(sheet,columns)=>sheet.data.slice(1).map(a=>Object.fromEntries(columns.map((c,i)=>[c[0],a[i]])));
{
  const initial=Array.from({length:1000},(_,i)=>row('R'+i,i<27?'L1':'other'));
  const b=db(initial),batch=initial.slice(0,27).map(r=>({...r}));batch[8].khach='Edited';
  const op={action:'saveBatch',requestId:'req-change-one',batch:{id:'L1',savedAt:'now',rows:batch}};
  const result=ctx.luuNhieu(b,[op],user);
  assert.equal(result.stats.tuoi.updated,1);assert.equal(b.tuoi.writes.length,1);assert.equal(b.tuoi.writes[0].n,1);
  assert.equal(b.tuoi.formats,0,'do not format existing columns on every save');
  assert.equal(decoded(b.tuoi,T)[999].khach,'Demo R999');
  const count=b.tuoi.writes.length;ctx.luuNhieu(b,[op],user);
  assert.equal(b.tuoi.writes.length,count,'ambiguous timeout retry must not write again');
}
{
  const b=db([row('R1'),row('hidden','L2'),row('R2')]);
  const result=ctx.luuNhieu(b,[{action:'saveBatch',requestId:'req-replace',batch:{id:'L1',rows:[{...row('R2'),thuc:1200},row('R3')],savedAt:'now'}}],user);
  const rows=decoded(b.tuoi,T);assert.equal(rows.length,3);assert.equal(rows[0].rid,'hidden');
  assert.equal(rows.find(r=>r.rid==='R2').thuc,1200);assert(rows.some(r=>r.rid==='R3'));assert(!rows.some(r=>r.rid==='R1'));
  assert.equal(result.stats.tuoi.removed,1);assert.equal(b.tuoi.formats,1,'format only newly appended range');
}
{
  const b=db([],[{id:'M1',rid:'R1',thuhoi:5},{id:'M2',rid:'R2',thuhoi:6}]);
  const result=ctx.luuNhieu(b,[{action:'saveSample',requestId:'req-s1',sample:{id:'M1',rid:'R1',thuhoi:5.5}},{action:'saveSample',requestId:'req-s2',sample:{id:'M2',rid:'R2',thuhoi:6.5}}],user);
  assert.equal(b.thuhoi.reads,1,'read once for several samples');assert.equal(b.thuhoi.writes.length,1,'write one contiguous block');assert.equal(result.completed.length,2);
  assert.equal(decoded(b.thuhoi,S)[1].thuhoi,6.5);
  ctx.luuNhieu(b,[{action:'deleteSample',requestId:'req-del',id:'M1'}],user);assert.equal(decoded(b.thuhoi,S)[0].id,'M2');
  assert.equal(JSON.parse(properties.get('FILE_sample_M1')).dead,true);
  assert.equal(ctx.luuPhieu({kind:'sample',id:'M1',revision:'req-s1',file:{b64:'old'}},user).stale,true,'old image cannot overwrite a deletion');
}
{
  const b=db([row('R1')]);
  assert.throws(()=>ctx.luuNhieu(b,[{action:'saveSample',sample:{id:'M-new'}},{action:'saveBatch',batch:{id:'L1',rows:[]}}],{...user,role:'Thu hồi'}));
  assert.equal(b.tuoi.writes.length,0);assert.equal(b.thuhoi.writes.length,0,'validate whole request before writing');
  assert.throws(()=>ctx.luuNhieu(b,[{action:'saveBatch',batch:{id:'L1',rows:[row('R1'),row('R1')]}}],user));
  assert.equal(b.tuoi.data.length,2);
}
{
  const b=db([],[{id:'M-old',rid:'R1',thuhoi:5}]);
  const r=ctx.luuNhieu(b,[{action:'saveSample',requestId:'req-replace-sample',sample:{id:'M-new',rid:'R1',thuhoi:6}}],user);
  assert.equal(decoded(b.thuhoi,S).length,1);assert.equal(decoded(b.thuhoi,S)[0].id,'M-new');
  assert(r.files.some(f=>f.id==='M-old'&&f.remove));
}
console.log('PASS: 1 edited row among 1000 -> 1 row write; batched samples, retry dedup, add/delete, permissions and stale-file protection.');
