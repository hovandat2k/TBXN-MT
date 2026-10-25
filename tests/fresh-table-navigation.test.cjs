const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const handlers = {}, cells = [];
const context = {
  $: () => ({ addEventListener: (type, fn) => { handlers[type] = fn; } }),
  document: { querySelectorAll: () => cells },
};
vm.createContext(context);
const start = html.indexOf('function summaryArrowTarget(');
vm.runInContext(html.slice(start,html.indexOf('\n}',start)+2),context);
const handlerStart = html.indexOf("$('#tbl').addEventListener('keydown'");
const handlerEnd = html.indexOf("$('#tbl').addEventListener('focusin'",handlerStart);
vm.runInContext(html.slice(handlerStart,handlerEnd),context);
let focused;
function cell(f,x,y,w=100,h=40){
  return { dataset:{f}, matches:()=>true,
    getBoundingClientRect:()=>({left:x,top:y,right:x+w,bottom:y+h,width:w,height:h}),
    focus(){focused=this;},select(){this.selected=true;},scrollIntoView(){},blur(){} };
}
const customer1=cell('khach',0,0,200),plate1=cell('soxe',0,45),time1=cell('gio',100,45),note1=cell('ghichu',200,0);
const customer2=cell('khach',0,100,200),plate2=cell('soxe',0,145),time2=cell('gio',100,145),note2=cell('ghichu',200,100);
cells.push(customer1,plate1,time1,note1,customer2,plate2,time2,note2);
function press(target,key,extra={}){
  focused=null;let prevented=false;
  handlers.keydown({target,key,preventDefault(){prevented=true;},...extra});
  return {focused,prevented};
}
assert.equal(press(customer1,'ArrowDown').focused,customer2,'skip plate below customer: same field');
assert.equal(press(customer2,'ArrowUp').focused,customer1);
assert.equal(press(plate1,'ArrowDown').focused,plate2);
assert.equal(press(time1,'ArrowRight').focused,null,'stay at end of metadata row');
assert.equal(press(plate1,'ArrowRight').focused,time1);
assert.equal(press(time1,'ArrowLeft').focused,plate1);
assert.equal(press(customer1,'ArrowRight').focused,note1);
assert.equal(press(customer1,'ArrowUp').focused,null,'top boundary');
assert.equal(press(customer1,'ArrowDown',{shiftKey:true}).prevented,false,'preserve text selection');
assert.equal(press(customer1,'ArrowDown',{isComposing:true}).prevented,false,'do not interrupt IME');
customer2.disabled=true;
assert.equal(press(customer1,'ArrowDown').focused,null,'skip disabled cell');
customer2.disabled=false;
// Full-column view uses the same delegated handler and DOM field order.
cells.splice(0,cells.length,cell('khach',0,0),cell('thuc',100,0),cell('khach',0,50),cell('thuc',100,50));
assert.equal(press(cells[1],'ArrowDown').focused,cells[3]);
assert.equal(press(cells[3],'ArrowLeft').focused,cells[2]);
assert.equal(press(cells[0],'Enter').focused,cells[2],'preserve Enter navigation');
console.log('PASS: arrows in compact/full tables, metadata, boundaries, disabled cells, selection, IME and Enter.');
