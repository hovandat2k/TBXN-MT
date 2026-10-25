const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf("  const DBK = 'tbxn_db'"),end=html.indexOf('  /* Sửa dữ liệu đã đọc',start);
assert(start>0&&end>start);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function runtime(initial,respond){
  const local=new Map(Object.entries(initial)),calls=[];
  const sessionStorage={getItem:()=>JSON.stringify({token:'demo',user:'admin',name:'Demo',role:'Toàn quyền'}),setItem(){},removeItem(){}};
  const context={console,AbortController,setTimeout,clearTimeout,sessionStorage,localStorage:{setItem:(k,v)=>local.set(k,JSON.parse(v)),removeItem:k=>local.delete(k)},
    LS:{get:(k,d)=>local.has(k)?local.get(k):d,set:(k,v)=>local.set(k,v)},
    syncUI(){},changed(){},logout(){},
    lotPdfFile:async id=>({name:id+'.pdf',b64:'pdf-bytes'}),sampleImgFile:async()=>({name:'sample.png',b64:'png-bytes'}),
    fetch:async(url,options)=>{const p=JSON.parse(options.body);calls.push(p);return respond(p,calls);}};
  vm.createContext(context);vm.runInContext(html.slice(start,end),context);
  const api=vm.runInContext('({enqueue,flush,flushFiles,q:()=>Q,fq:()=>FQ,fileError:()=>fileErr})',context);
  return {api,calls,local,context};
}
const result=data=>({json:async()=>data});
const features={fastSync:true,deferredFiles:true};
const op=(id,requestId)=>({action:'saveBatch',requestId,batch:{id,rows:[{rid:id+'-R1',thuc:1000}]},fileJob:{kind:'batch',id}});
const ack=p=>result({ok:true,features,completed:p.ops.map(x=>x.requestId),files:p.ops.map(x=>({kind:'batch',id:x.batch.id,revision:x.requestId,remove:false}))});
(async()=>{
  {
    let release;const barrier=new Promise(resolve=>release=resolve);
    const r=runtime({tbxn_q:[op('L1','request1'),op('L2','request2')],tbxn_db:{rows:[{batch:'L1',rid:'R1'},{batch:'L2',rid:'R2'}],samples:[]}},async p=>{
      if(p.action==='ping')return result({ok:true,features});
      if(p.action==='saveMany')return ack(p);
      assert.equal(p.action,'saveFile');await barrier;return result({ok:true,features});
    });
    await r.api.flush();
    assert.equal(r.api.q().length,0,'data acknowledged before image completes');assert.equal(r.api.fq().length,2);
    const data=r.calls.find(p=>p.action==='saveMany');assert.equal(data.ops.length,2);assert(!data.ops.some(p=>p.file||p.fileJob),'no base64 in data request');
    // A pending image does not prevent a new data request.
    r.api.enqueue(op('L3','request3'));await r.api.flush();
    assert.equal(r.calls.filter(p=>p.action==='saveMany').length,2);
    release();for(let i=0;i<12;i++)await tick();assert.equal(r.api.fq().length,0);
  }
  {
    let failed=false;
    const r=runtime({tbxn_q:[{...op('L4','stable-id'),fileJob:null}]},async p=>{
      if(p.action==='ping')return result({ok:true,features});
      if(!failed){failed=true;const e=new Error('timeout');e.name='AbortError';throw e;}
      return ack(p);
    });
    await r.api.flush();assert.equal(r.api.q()[0].requestId,'stable-id');
    await r.api.flush();assert.equal(r.api.q().length,0);
    assert(r.calls.filter(p=>p.action==='saveMany').every(p=>p.ops[0].requestId==='stable-id'),'retry uses same request ID');
  }
  {
    const r=runtime({tbxn_q:[op('legacy','legacy-id')]},async p=>result({ok:true}));
    await r.api.flush();assert.equal(r.api.q().length,0);
    assert.equal(r.calls[1].action,'saveBatch');assert.equal(r.calls[1].file.b64,'pdf-bytes');
    assert(!r.calls.some(p=>p.action==='saveFile'||p.action==='saveMany'),'old deployed server remains compatible');
  }
  {
    const r=runtime({tbxn_q:[op('L5','file-fail')],tbxn_db:{rows:[{batch:'L5',rid:'R5'}],samples:[]}},async p=>{
      if(p.action==='ping')return result({ok:true,features});if(p.action==='saveMany')return ack(p);
      throw new TypeError('offline');
    });
    await r.api.flush();for(let i=0;i<5;i++)await tick();
    assert.equal(r.api.q().length,0);assert.equal(r.api.fq().length,1);assert(r.api.fileError());
    assert.equal(r.local.get('tbxn_file_q').length,1,'persist deferred file retry');
  }
  console.log('PASS: batched metadata without base64, data does not wait for PDF, parallel file/data lanes, stable retry IDs, legacy fallback and durable file errors.');
})().catch(e=>{console.error(e);process.exitCode=1;});
