import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appSource = fs.readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
const snapshot = JSON.parse(fs.readFileSync(new URL('../data/campus.snapshot.json', import.meta.url), 'utf8'));

function makeElement() {
  return { innerHTML:'', textContent:'', value:'', disabled:false, className:'', dataset:{}, style:{},
    querySelector:()=>null, querySelectorAll:()=>[], addEventListener:()=>{}, append:()=>{}, remove:()=>{}, focus:()=>{}, select:()=>{},
    setAttribute:()=>{}, getAttribute:()=>null, classList:{add:()=>{},remove:()=>{},toggle:()=>{}} };
}
const app = makeElement();
const body = makeElement();
body.dataset = {};
const document = {
  body,
  querySelector(sel){ if(sel==='#app') return app; if(sel==='#toast-root'||sel==='#modal-root') return makeElement(); return null; },
  querySelectorAll(){ return []; },
  createElement(){ return makeElement(); },
  scripts: [], addEventListener:()=>{}
};
const storage = new Map();
const localStorage = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) };
let search='?demo=1';
const location = { pathname:'/', hash:'', search, reload:()=>{} };
const history = { state:null, pushState(_s,_t,p){ this.state=_s; location.pathname=String(p).split('?')[0]||'/'; }, replaceState(_s,_t,p){ this.state=_s; location.pathname=String(p).split('?')[0]||'/'; }, back(){} };
const window = { addEventListener:()=>{}, location, scrollTo:()=>{}, history };
const fetch = async (url)=>{
  if(String(url)==='/api/auth/status') return {ok:true,status:200,json:async()=>({ok:true,connected:false,user:null})};
  if(String(url)==='/api/demo/snapshot') return {ok:true,status:200,json:async()=>snapshot};
  throw new Error(`Unexpected fetch in runtime test: ${url}`);
};
const consoleProxy = {log(){},warn(){},error(){}};
const context = {window,document,localStorage,location,history,fetch,console:consoleProxy,Headers,URLSearchParams,URL,Date,Number,String,Boolean,Math,JSON,setTimeout,clearTimeout};
vm.createContext(context);
vm.runInContext(appSource, context, {filename:'app.js'});
await new Promise(r=>setTimeout(r,30));
assert.ok(app.innerHTML.length > 500, 'bootstrap must render visible UI');
assert.match(app.innerHTML, /Campus\s*FA|Campus Nova/i, 'rendered UI should contain branding');
assert.ok(app.innerHTML.includes('Главная') || app.innerHTML.includes('Мои курсы'), 'demo UI should contain navigation');
console.log('PASS browser-runtime bootstrap render');
