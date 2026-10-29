const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
function source(name){const start=html.indexOf('function '+name+'(');return html.slice(html.slice(start-6,start)==='async '?start-6:start,html.indexOf('\n  }',start)+4);}
function run(role){
 const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:'',options:[],hidden:false,textContent:'',attrs:{},listeners:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.listeners[k]=v;},querySelectorAll(){return[];},focus(){},set innerHTML(v){this.html=v;if(id==='#thSel')this.options=[...v.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m=>({value:m[1],textContent:m[2]}));},get innerHTML(){return this.html||'';}});return elements.get(id);}
 const events=[],ctx={console,$:el,DB:{rows:[{rid:'z',khach:'VÂN',soxe:'49C 22222',date:'29/10/2026',gio:'04:00',thuc:'2000'},{rid:'a',khach:'AN',soxe:'49C 11111',date:'29/10/2026',gio:'23:29',thuc:'1000'}],samples:[]},canTH:()=>['Toàn quyền','Thu hồi'].includes(role),rowLabel:r=>r.khach,esc:String,IC:()=>'',numv:v=>+v,fmtKg:String,recoveryQualityHTML:()=>'',dateKey:()=>1,renderSaved(){},renderChung(){},thCalc(){},window:{scrollTo(){}},uid:(()=>{let i=0;return()=>++i;})(),nowStr:()=>'',f2:String,r2:v=>v,toast(){},thClear(){},enqueue:x=>events.push(x)};
 vm.createContext(ctx);vm.runInContext('let editSample=null,extraRids=[],pickOpen=true,MAU=2000;const groupOf=sp=>sp.nhom?DB.samples.filter(s=>s.nhom===sp.nhom):[sp];const groupName=rs=>rs.map(r=>r.khach).join(" + ");',ctx);
 for(const n of ['pending','selRow','selRows','renderMulti','renderRecoveryChoices','renderTH','selChanged','stopEdit','saveGroup'])vm.runInContext(source(n),ctx);
 const a=html.indexOf("  $('#thChoices').addEventListener('change'");const b=html.indexOf("  $('#thChoices').addEventListener('click'",a);vm.runInContext(html.slice(a,b),ctx);
 ctx.renderTH();assert.deepEqual(el('#thSel').options.filter(o=>o.value&&!o.value.startsWith('__')).map(o=>o.value),['a','z']);assert(!el('#thSel').innerHTML.includes('23:29'));
 const choose=(id,checked)=>el('#thChoices').listeners.change({target:{closest:()=>({dataset:{thChoice:id},checked})}});
 choose('z',true);choose('a',true);assert.equal(el('#thChoose').textContent,'2 xe đã chọn');assert.equal(ctx.selRows().length,2);assert(el('#thMulti').innerHTML.includes('3000 kg'));assert(!el('#thMulti').innerHTML.includes('04:00'));assert(!el('#thMulti').innerHTML.includes('Thêm xe chung mẫu'));
 choose('z',false);assert.equal(ctx.selRow().rid,'a');choose('a',false);assert.equal(ctx.selRows().length,0);assert.equal(el('#thChoices').hidden,false);
 choose('a',true);choose('z',true);
 return ctx.saveGroup({mau:2000,res:{kl:350,klq:0,am:12,E:5.5,tong:350,lines:[]}},ctx.selRows(),null).then(()=>{const saves=events.filter(e=>e.action==='saveSample');assert.equal(saves.length,2);assert.equal(saves[0].sample.nhom,saves[1].sample.nhom);assert.equal(saves[0].sample.thuhoi,5.5);assert.equal(saves.filter(e=>e.fileJob).length,1);
 ctx.DB.samples=saves.map(e=>e.sample);vm.runInContext('editSample=DB.samples[0];extraRids=["z"];',ctx);el('#thSel').value='__edit';ctx.renderTH();
 choose('a',false);assert.equal(el('#thSel').value,'__edit');assert.equal(ctx.selRow().rid,'z');
 events.length=0;return ctx.saveGroup({mau:2000,res:{kl:350,klq:0,am:12,E:5.6,tong:350,lines:[]}},ctx.selRows(),vm.runInContext('editSample',ctx)).then(()=>{
 assert.equal(events.filter(e=>e.action==='deleteSample').length,1);assert.equal(events.find(e=>e.action==='deleteSample').id,saves[0].sample.id);
 assert.equal(events.find(e=>e.action==='saveSample').sample.id,saves[1].sample.id);
 });});
}
Promise.all(['Thu hồi','Toàn quyền'].map(run)).then(()=>console.log('PASS: both roles, A–Z, no weighing times, add/remove main and extras, empty selection, grouped save with one file job.')).catch(e=>{console.error(e);process.exitCode=1;});
