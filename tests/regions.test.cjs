const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const props=new Map();let writes=0;
const pr={getProperty:k=>props.get(k)||null,setProperty(k,v){props.set(k,v);},setProperties(v){for(const [k,x]of Object.entries(v))props.set(k,x);}};
const c={console,PropertiesService:{getScriptProperties:()=>pr},Utilities:{getUuid:()=>String(Math.random())}};vm.createContext(c);vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),c);
c.docBang=sh=>sh.data;c.ghiChenhLech=(sh,cols,before,after)=>{sh.data=after;writes++;return{};};c.thuMucGoc=()=>({getUrl:()=>''});
const row=(rid,khuvuc)=>({rid,batch:'B'+rid,khuvuc,khach:'Demo',thuc:1000,xanh:20,noi:15,chin:65});
const db=()=>({tuoi:{data:[row('ld','Lâm Đồng'),row('lao','Lào'),row('sl','Sơn La')]},thuhoi:{data:[{id:'Mld',rid:'ld',khach:'Demo',khuvuc:'Lâm Đồng',thuhoi:5},{id:'Mlao',rid:'lao',khach:'Demo',khuvuc:'Lào',thuhoi:6}]},ss:{getUrl:()=>''}});
const user=(role='ICS',khuvuc='Lâm Đồng')=>({user:'demo',name:'Demo',role,khuvuc});
for(const role of ['ICS','ICS-thuhoi','Thu hồi','Chỉ xem']){
 const list=c.danhSach(db(),user(role));assert.equal(list.rows.length,1);assert.equal(list.rows[0].rid,'ld');assert.equal(list.samples.length,1);
 assert.equal(c.danhSach(db(),user(role),'Lào').denied,true);
}
assert.equal(c.danhSach(db(),user('admin','')).rows.length,3);assert.equal(c.danhSach(db(),user('admin',''),'Sơn La').rows.length,1);
assert.equal(c.chuanQuyen('ICS-thuhoi'),'ICS-thuhoi');assert.equal(c.chuanQuyen('thu hồi'),'Thu hồi');assert.equal(c.chuanQuyen('Toàn quyền'),'');
function denied(op,u=user()) {const b=db(),before=JSON.stringify(b);writes=0;assert.throws(()=>c.luuNhieu(b,[op],u));assert.equal(writes,0);assert.equal(JSON.stringify(b),before);}
denied({action:'saveBatch',batch:{id:'Blao',khuvuc:'Lâm Đồng',rows:[]}});
denied({action:'saveBatch',batch:{id:'new',khuvuc:'Lào',rows:[row('new','Lào')]}});
denied({action:'saveBatch',batch:{id:'new',rows:[row('lao','Lâm Đồng')]}});
denied({action:'saveSample',sample:{id:'Mlao',khuvuc:'Lâm Đồng',khach:'Edited'}});
denied({action:'saveSample',sample:{id:'new',rid:'lao',khach:'Edited'}});
denied({action:'deleteSample',id:'Mlao'});
denied({action:'saveBatch',batch:{id:'new',rows:[]}},user('ICS-thuhoi'));
denied({action:'saveSample',sample:{id:'new',khach:'Demo'}},user('Chỉ xem'));
denied({action:'deleteSample',id:'Mld'},user('Thu hồi'));
props.set('FILE_sample_deleted-other',JSON.stringify({khuvuc:'Lào',dead:true,revision:'r'}));denied({action:'deleteSample',id:'deleted-other'});
c.bangTinh=db;
assert.equal(c.luuPhieu({kind:'sample',id:'Mlao',revision:'old'},user()).denied,true);
for(const role of ['ICS','ICS-thuhoi','Thu hồi']){
 const b=db();c.luuNhieu(b,[{action:'saveSample',sample:{id:'new-'+role.replace(/[^a-z0-9-]/gi,''),khach:'Manual',date:'01/11/2026',klTuoi:'',xanh:'',noi:'',chin:'',thuhoi:5}}],user(role));
 assert.equal(b.thuhoi.data.find(s=>s.id==='new-'+role.replace(/[^a-z0-9-]/gi,'')).khuvuc,'Lâm Đồng');
}
const b=db();c.luuNhieu(b,[{action:'saveBatch',batch:{id:'Bld',rows:[{...row('ld','Lâm Đồng'),khach:'Edited'}]}}],user());assert.equal(b.tuoi.data.find(r=>r.rid==='lao').khach,'Demo');
c.ky=s=>require('crypto').createHash('sha256').update(s).digest('hex');assert.notEqual(c.dauVanTay({user:'x',pass:'p',role:'ICS',khuvuc:'Lào'}),c.dauVanTay({user:'x',pass:'p',role:'ICS',khuvuc:'Sơn La'}));
console.log('PASS: five roles, server-side regional list/write/delete/file checks, ID/replay isolation and optional manual fields.');
// Frontend: compact columns and optional metadata, independent from formula inputs.
const html=fs.readFileSync('index.html','utf8'),els=new Map(),f={console,PF:['xanh','noi','chin'],SHEET:{compact:true},isLSX:()=>true,$:id=>{if(!els.has(id))els.set(id,{value:''});return els.get(id);}};vm.createContext(f);
for(const name of ['parseKg','parsePct','pcts','sheetCols','manualRecovery']){const start=html.indexOf('function '+name+'('),indent=name==='manualRecovery'?'\n  }':'\n}';vm.runInContext(html.slice(start,html.indexOf(indent,start)+indent.length),f);}
assert.deepEqual(Array.from(f.sheetCols(),x=>x[0]),['khach','soxe','thuc','xanh','noi','chin','thuhoi']);
f.$('#tmName').value='Demo';f.$('#tmDate').value='2026-11-01';const m=f.manualRecovery();assert.equal(m.thuc,'');assert.equal(m.xanh,'');assert.equal(m.soxe,'');
f.$('#tmXanh').value='20';f.$('#tmNoi').value='15';assert.equal(f.manualRecovery().chin,65);f.$('#tmWeight').value='bad';assert.throws(()=>f.manualRecovery());f.$('#tmWeight').value='';f.$('#tmName').value='';assert.throws(()=>f.manualRecovery());
console.log('PASS: ICS-thuhoi seven columns, required customer/date, optional plate/weight/quality and valid percentage inference.');
// Exercise the real token authentication path, not only direct permission helpers.
const authUser={user:'regional',pass:'test-only',role:'ICS',name:'Demo',lock:'',khuvuc:'Lào'};
c.taiKhoan=()=>[authUser];c.b64=v=>Buffer.from(v).toString('base64url');
c.Utilities.newBlob=v=>({getBytes:()=>Buffer.from(v),getDataAsString:()=>Buffer.from(v).toString()});
c.Utilities.base64DecodeWebSafe=v=>Buffer.from(v,'base64url');
const login=c.dangNhap({}, {user:'regional',pass:'test-only'});
assert.equal(login.ok,true);assert.equal(c.xacThuc({},login.token).khuvuc,'Lào');
assert.equal(c.danhSach(db(),c.xacThuc({},login.token)).rows[0].rid,'lao');
authUser.khuvuc='Sơn La';assert.equal(c.xacThuc({},login.token),null);
console.log('PASS: authenticated sessions retain region and revoke after regional reassignment.');
// Upgrade only empty legacy data regions; never assign account roles/regions.
const upgrade={console,PropertiesService:{getScriptProperties:()=>pr}};vm.createContext(upgrade);vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),upgrade);
const sheets=new Map();
function sheet(name,regions){return {name,regions,getName:()=>name,getLastRow:()=>regions.length+1,getMaxRows:()=>100,getRange(r,col,n){return {getValues:()=>regions.map(v=>[v]),setValues(v){regions.splice(0,regions.length,...v.map(x=>x[0]));return this;},setDataValidation(){return this;}};}};}
sheets.set('Cà tươi',sheet('Cà tươi',['','Lào']));sheets.set('Thu hồi',sheet('Thu hồi',['','Sơn La']));sheets.set('User',sheet('User',['']));
const ss={getSheets:()=>[...sheets.values()],getId:()=>'test-sheet'};
upgrade.thuMucGoc=()=>({getFilesByName:()=>({hasNext:()=>true,next:()=>({})})});upgrade.trang=(s,name)=>sheets.get(name);
upgrade.SpreadsheetApp={open:()=>ss,newDataValidation:()=>({requireValueInList(){return this;},build:()=>({})})};
upgrade.taoBangTinh(pr);
assert.deepEqual(sheets.get('Cà tươi').regions,['Lâm Đồng','Lào']);assert.deepEqual(sheets.get('Thu hồi').regions,['Lâm Đồng','Sơn La']);assert.deepEqual(sheets.get('User').regions,['']);assert.equal(props.get('APP_SCHEMA'),'3');
console.log('PASS: legacy blank regions migrate to Lâm Đồng and existing regions/accounts are preserved.');
// Sheets returns empty strings for newly added columns on legacy samples.
let legacySample={id:'old',rid:'old-row',klTuoi:1000,xanh:'',noi:'',chin:'',thuhoi:5.6};
const summary={sampleOf:()=>legacySample,str:v=>v==null?'':String(v),kgs:v=>v==null?'':String(v),tOf:()=>0};vm.createContext(summary);
const summaryStart=html.indexOf('  function sheetRowsOf(');vm.runInContext(html.slice(summaryStart,html.indexOf('\n  const LSX',summaryStart)),summary);
const originalRow={rid:'old-row',thuc:1000,xanh:49,noi:15,chin:36};
let restored=summary.sheetRowsOf([originalRow],[])[0];assert.equal(restored.xanh,'49');assert.equal(restored.noi,'15');assert.equal(restored.chin,'36');assert.equal(restored.thuhoi,'5.6');
legacySample={...legacySample,xanh:0,noi:20,chin:80};restored=summary.sheetRowsOf([originalRow],[])[0];assert.equal(restored.xanh,'0');assert.equal(restored.noi,'20');assert.equal(restored.chin,'80');
console.log('PASS: legacy empty sample quality falls back to weighing data, retaining explicit zero/new sample values.');
assert.equal(f.manualRecovery(false).khach,'');assert.throws(()=>f.manualRecovery());
const math={r2:v=>Math.round(v*100)/100,f2:v=>v.toFixed(2),ff:String,degree:String,MOC:12.5,CONG:0.5,TABLE:{15:[0]}};vm.createContext(math);vm.runInContext('let MAU=2000;',math);
for(const name of ['compute','computeWith','savedSampleMass']){const start=html.indexOf('  function '+name+'(');vm.runInContext(html.slice(start,html.indexOf('\n  }',start)+4),math);}
for(const am of [14,15]){
 const normal=math.computeWith(2000,350,25,am),custom=math.computeWith(2500,350,25,am);
 assert(Math.abs(custom.E/normal.E-1.25)<1e-12);assert(custom.lines.at(-1).startsWith('2500 /'));assert.equal(vm.runInContext('MAU',math),2000);
}
assert.equal(math.savedSampleMass({cachtinh:'Khối lượng mẫu: 2500 g | phép tính'}),2500);assert.equal(math.savedSampleMass({mau:'Mẫu riêng'}),2000);assert.equal(math.savedSampleMass({mau:'Mẫu chung'}),10000);
console.log('PASS: anonymous calculation metadata, required save name, custom final numerator in both moisture branches and legacy mass fallback.');
vm.runInContext("let recoveryAutoPct='';",f);
const pctStart=html.indexOf('  function updateRecoveryPercent(');vm.runInContext(html.slice(pctStart,html.indexOf('\n  }',pctStart)+4),f);
const pctFields=['tmXanh','tmNoi','tmChin'];
for(const missing of pctFields){
 pctFields.forEach(id=>f.$('#'+id).value='');vm.runInContext("recoveryAutoPct='';",f);
 const input=pctFields.filter(id=>id!==missing);f.$('#'+input[0]).value='20';f.$('#'+input[1]).value='15';f.updateRecoveryPercent(input[1]);assert.equal(f.$('#'+missing).value,'65');
 f.$('#'+input[0]).value='30';f.updateRecoveryPercent(input[0]);assert.equal(f.$('#'+missing).value,'55');
 f.$('#'+input[1]).value='';f.updateRecoveryPercent(input[1]);assert.equal(f.$('#'+missing).value,'');
}
f.$('#tmXanh').value='80';f.$('#tmNoi').value='30';f.$('#tmChin').value='';f.updateRecoveryPercent('tmNoi');assert.equal(f.$('#tmChin').value,'');
console.log('PASS: live inference for each quality field, source edits/deletion, and invalid total above 100.');
