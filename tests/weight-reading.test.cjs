const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext("const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[đĐ]/g,'d').toLowerCase();",ctx);
for(const name of ['isPdfSummaryPage','parseKg','fixDate','reconcile','parsePdfWeightRows','applyPdfWeights']){
  const start=html.indexOf('function '+name+'(');
  vm.runInContext(html.slice(start,html.indexOf('\n}',start)+2),ctx);
}
vm.runInContext(html.match(/^const fmtKg = .*$/m)[0],ctx);
const wrong={tl1:15020,tl2:8770,tlh:6250,bi:3,thuc:6219};
const conflict=ctx.reconcile(wrong);
assert.equal(conflict.ok,false,'two calculations sharing the same bad tare are not independent evidence');
assert.equal(conflict.vals.thuc,6219,'never overwrite the correctly read net weight');
assert.equal(ctx.reconcile({...wrong,bi:31}).ok,true);
assert.equal(ctx.reconcile({...wrong,bi:null}).vals.bi,31);
assert.equal(ctx.reconcile({...wrong,bi:31,thuc:null}).vals.thuc,6219);
assert.equal(ctx.reconcile({...wrong,tlh:6260,bi:41}).ok,false,'gross conflict is still flagged');
function item(str,y,x=0){return {str,transform:[1,0,0,1,x,y]};}
const printed=ctx.parsePdfWeightRows([
  item('STT Số xe TL Lần 1 TL Lần 2 TL Hàng TL Bì TL Thực Giờ cân',700),
  item('Ngày cân :25/10/2026',680),
  item('8 49C 12345 DEMO 15,020 8,770 6,250 31 6,219 23:26:34',650),
  item('Ngày cân :26/10/2026',600),
  item('1 49A 54321 DEMO 11,280 3,120 8,160 41 8,119 00:19:13',580)
]);
assert.equal(printed.length,2);assert.equal(printed[0].bi,31);
const row={date:'25/10/2026',stt:'8',soxe:'49C12345',gio:'23:26',bi:'3',thuc:'6,247',ghichu:'Keep',xanh:'20',flags:{bi:true,thuc:true}};
ctx.applyPdfWeights([row],printed);
assert.equal(row.bi,'31');assert.equal(row.thuc,'6,219');assert.equal(row.flags.thucOk,true);
assert.equal(row.flags.bi,undefined);assert.equal(row.ghichu,'Keep');assert.equal(row.xanh,'20');
const ambiguous={...row,bi:'3'};ctx.applyPdfWeights([ambiguous],[...printed,printed[0]]);assert.equal(ambiguous.bi,'3');
const mismatch={...row,date:'24/10/2026',bi:'3'};ctx.applyPdfWeights([mismatch],printed);assert.equal(mismatch.bi,'3');
assert.equal(ctx.parsePdfWeightRows([item('scanned PDF',700)]).length,0);

// Only a positively identified summary-only native PDF page may bypass OCR.
{
 const head=item('STT Số xe Hàng hóa Khách hàng TL Lần 1 TL Lần 2 TL Hàng TL Bì TL Thực Giờ cân',700);
 const totals=[head,item('Tổng cộng : 1,000',670),item('Trọng lượng tổng cộng : 1,005 Ngày báo cáo :29/10/2026',640),item('Trọng lượng bì tổng cộng : 5 Người lập báo cáo',620),item('Trọng lượng thực tế tổng cộng : 1,000',600),item('Trang : 2/2',10)];
 assert.equal(ctx.isPdfSummaryPage(totals),true);
 for(const line of ['1 49C 12345 DEMO 1,100 95 1,005 5 1,000 10:00:00','2 MÁY CÀY DEMO 1,100 95 1,005 5 1,000 10:00:00','3 5555 DEMO 1,100 95 1,005 5 1,000 10:00:00','Nội dung không xác định']) assert.equal(ctx.isPdfSummaryPage([...totals,item(line,680)]),false);
 assert.equal(ctx.isPdfSummaryPage([]),false);assert.equal(ctx.isPdfSummaryPage(totals.slice(1)),false);
 assert.equal(ctx.isPdfSummaryPage([head]),false);
}

console.log('PASS: conflicting OCR, missing values, PDF weights, dates, exact matching, ambiguity and unrelated fields.');
// Optional local verification against an actual PDF, using the app's PDF.js version.
if(process.argv[2]) (async()=>{
  const pdfjs=require('../tmp/pdfs/pdf.cjs');pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../tmp/pdfs/pdf.worker.js');
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))}).promise;
  const extracted=[];
  for(let p=1;p<=doc.numPages;p++) extracted.push(...ctx.parsePdfWeightRows((await (await doc.getPage(p)).getTextContent()).items));
  const target=extracted.find(r=>r.tl1===15020&&r.tl2===8770);
  assert(target,'source row must be extracted');assert.equal(target.bi,31);assert.equal(target.thuc,6219);
  assert.equal(extracted.length,21);
  console.log(`PASS actual PDF: ${extracted.length} rows; target tare ${target.bi} kg, net ${target.thuc} kg.`);
  await doc.destroy();
})().catch(e=>{console.error(e);process.exitCode=1;});
