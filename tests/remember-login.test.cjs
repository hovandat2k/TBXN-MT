const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('  const SS ='),html.indexOf('  const isAdmin ='));
function runtime(local=new Map(),session=new Map()){
  const ctx={LS:{get:(k,d)=>local.has(k)?local.get(k):d,set:(k,v)=>local.set(k,v)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return vm.runInContext('({saveAuth,auth:()=>AUTH})',ctx);
}
for(const role of ['Toàn quyền','Thu hồi','Chỉ xem']){
  const auth={token:'test-token',user:'demo',name:'Demo',role};
  const local=new Map(),session=new Map();
  let app=runtime(local,session);app.saveAuth(auth,true);
  assert.equal(session.size,0);
  assert.equal(runtime(local,new Map()).auth().token,auth.token,'remembered across browser sessions');
  app=runtime(local,session);app.saveAuth(auth,false);
  assert.equal(local.get('tbxn_auth'),null,'switching off clears remembered token');
  assert.equal(runtime(local,session).auth().token,auth.token,'same session survives reload');
  assert.equal(runtime(local,new Map()).auth(),null,'new session requires login');
  app.saveAuth(auth,true);app.saveAuth(null);
  assert.equal(runtime(local,session).auth(),null,'logout clears both stores');
  assert.equal(Object.hasOwn(local.get('tbxn_auth')||{},'pass'),false);
}
const legacy=new Map([['tbxn_auth',{token:'existing',role:'Thu hồi'}]]);
assert.equal(runtime(legacy).auth().token,'existing','existing remembered sessions remain valid');
console.log('PASS: remembered/session-only login for all roles, restart, preference changes, logout and existing sessions.');
