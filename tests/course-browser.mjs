import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appSource = fs.readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');

function el() {
  return { innerHTML:'', textContent:'', value:'', disabled:false, className:'', dataset:{}, style:{},
    querySelector:()=>null, querySelectorAll:()=>[], addEventListener:()=>{}, append:()=>{}, remove:()=>{}, focus:()=>{}, select:()=>{},
    setAttribute:()=>{}, getAttribute:()=>null, classList:{add:()=>{},remove:()=>{},toggle:()=>{}} };
}
const app = el();
const body = el();
const document = {
  body,
  querySelector(sel){ if(sel==='#app') return app; if(sel==='#toast-root'||sel==='#modal-root') return el(); return null; },
  querySelectorAll(){ return []; },
  createElement(){ return el(); },
  scripts: [], addEventListener:()=>{}
};
const localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
const location = { pathname:'/course/101', hash:'', search:'' };
const listeners = new Map();
const stack = [{state:{nova:true,route:'course',param:'101'},path:'/course/101'}]; let index=0;
const history = {
  state: stack[index].state,
  pushState(s,_t,p){ index++; stack.splice(index); stack.push({state:s,path:String(p)}); this.state=s; location.pathname=String(p).split('?')[0]||'/'; },
  replaceState(s,_t,p){ stack[index]={state:s,path:String(p)}; this.state=s; location.pathname=String(p).split('?')[0]||'/'; },
  back(){ if(index===0)return; index--; this.state=stack[index].state; location.pathname=stack[index].path; listeners.get('popstate')?.forEach(fn=>fn()); },
  forward(){ if(index>=stack.length-1)return; index++; this.state=stack[index].state; location.pathname=stack[index].path; listeners.get('popstate')?.forEach(fn=>fn()); }
};
const window = { addEventListener:(name,fn)=>{ const a=listeners.get(name)||[]; a.push(fn); listeners.set(name,a); }, location, history, scrollTo:()=>{} };

const courses = {
  101:{id:101,title:'Информатика',description:'Базовый курс',sections:[{id:1,name:'Введение',activities:[{id:10,type:'assign',name:'Домашнее задание',url:'/mod/assign/view.php?id=10'}]},{id:2,name:'Материалы',activities:[{id:11,type:'resource',name:'Лекция',url:'/mod/resource/view.php?id=11'},{id:12,type:'quiz',name:'Тест',url:'/mod/quiz/view.php?id=12'}]}]},
  202:{id:202,title:'Математический анализ',description:'Большой курс',sections:[{id:1,name:'Тема 1',activities:Array.from({length:12},(_,i)=>({id:i+1,type:i%3===0?'assign':i%3===1?'resource':'quiz',name:`Активность ${i+1}`,url:`/mod/${i%3===0?'assign':i%3===1?'resource':'quiz'}/view.php?id=${i+1}`}))}]}
};
const fetch = async url => {
  const u=String(url);
  if(u==='/api/auth/status') return {ok:true,status:200,json:async()=>({ok:true,connected:true,user:{id:42,fullname:'Студент'}})};
  const m=u.match(/^\/api\/course\?id=(\d+)/); if(m && courses[Number(m[1])]) return {ok:true,status:200,json:async()=>({ok:true,course:courses[Number(m[1])]})};
  throw new Error(`Unexpected fetch: ${u}`);
};
const consoleProxy={log(){},warn(){},error(){}};
const context={window,document,localStorage,location,history,fetch,console:consoleProxy,Headers,URLSearchParams,URL,Date,Number,String,Boolean,Math,JSON,setTimeout,clearTimeout,AbortController};
vm.createContext(context);
vm.runInContext(appSource, context, {filename:'app.js'});
await new Promise(r=>setTimeout(r,80));
assert.match(app.innerHTML,/Информатика/,'direct course URL must render the course title');
assert.match(app.innerHTML,/Домашнее задание/,'course activities must render');
assert.match(app.innerHTML,/Тест/,'quiz activity must render');
assert.equal(location.pathname,'/course/101');

context.navigate('course','202');
await new Promise(r=>setTimeout(r,50));
assert.equal(location.pathname,'/course/202');
assert.match(app.innerHTML,/Математический анализ/,'second course must open from SPA navigation');
assert.match(app.innerHTML,/Активность 12/,'large course content must render');

history.back();
await new Promise(r=>setTimeout(r,60));
assert.equal(location.pathname,'/course/101');
assert.match(app.innerHTML,/Информатика/,'Back must restore course A');

history.forward();
await new Promise(r=>setTimeout(r,60));
assert.equal(location.pathname,'/course/202');
assert.match(app.innerHTML,/Математический анализ/,'Forward must restore course B');

console.log('PASS course browser: direct URL, multiple courses, large course, Back/Forward');
