const state = {
  connected: false,
  user: null,
  campusUrl: localStorage.getItem('nova-campus-url') || '',
  demo: false,
  route: 'dashboard',
  param: '',
  theme: localStorage.getItem('nova-theme') || 'dark',
  search: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  selectedDay: new Date().getDate(),
  data: { dashboard: null, courses: null, tasks: null, grades: null, schedule: null, calendar: null, messages: null, files: null, tests: null, materials: null, profile: null, view: null, activity: null },
  status: { dashboard:'idle', courses:'idle', course:'idle', tasks:'idle', grades:'idle', schedule:'idle', calendar:'idle', messages:'idle', files:'idle', tests:'idle', materials:'idle', profile:'idle', view:'idle', activity:'idle' },
  errors: {},
  selectedConversation: null,
  pageCache: new Map(),
  requests: {},
  routeEpoch: 0,
  courseView: localStorage.getItem('nova-course-view') || 'cards'
};

const NAV = [
  ['dashboard','home','Главная'], ['courses','grid','Курсы'], ['schedule','clock','Расписание'], ['grades','chart','Оценки'],
  ['tasks','check-square','Задания'], ['calendar','calendar','Календарь'], ['messages','message','Сообщения'], ['files','folder','Файлы'], ['materials','folder','Материалы'], ['tests','quiz','Тесты']
];
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = (s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const text = (s='')=>String(s).replace(/\s+/g,' ').trim();

const novaFrame=(callback)=>{
  if(typeof window!=='undefined' &&
     typeof window.requestAnimationFrame==='function'){
    return window.requestAnimationFrame.call(window,callback);
  }

  return setTimeout(()=>callback(Date.now()),0);
};

function icon(name,size=18){
  const paths={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9 21v-6h6v6"/>',
    university:'<path d="M3 9 12 4l9 5"/><path d="M5 9v9M9 11v7M15 11v7M19 9v9"/><path d="M3 18h18M2 21h20"/><path d="M7 9h10"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/>',
    'check-square':'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7.5 12 3 3 6-6"/>',
    calendar:'<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M7 2.5v4M17 2.5v4M3 9.5h18"/>',
    message:'<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5H7l-4 3v-5.5a7.5 7.5 0 0 1 1-3.8A7.5 7.5 0 0 1 10.5 5H13a7.5 7.5 0 0 1 7 6.5Z"/><path d="M7.5 12h.01M12 12h.01M16.5 12h.01"/>',
    folder:'<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M3 9h18"/>',
    quiz:'<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    user:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon:'<path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>',
    arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    next:'<path d="m9 18 6-6-6-6"/>',
    refresh:'<path d="M20 11a8 8 0 0 0-14.8-4L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 14"/><path d="M21 19v-5h-5"/>',
    send:'<path d="m3 4 18 8-18 8 3-8z"/><path d="M6 12h15"/>',
    download:'<path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    sparkle:'<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    eye:'<path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.3"/>',
    file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    upload:'<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
    edit:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="m13.5 6.5 4 4"/>',
    save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    x:'<path d="m6 6 12 12M18 6 6 18"/>',
    spinner:'<path d="M12 3a9 9 0 1 0 9 9"/>',
    play:'<path d="m9 6 10 6-10 6z"/>',
    pause:'<path d="M8 6v12M16 6v12"/>',
    link:'<path d="M10 13.5 8.5 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m14 10.5 1.5-1.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"/><path d="m8 16 8-8"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
}
function toast(message,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.innerHTML=`<span>${icon(type==='error'?'info':type==='success'?'check':'sparkle',16)}</span><span>${esc(message)}</span>`;$('#toast-root')?.append(el);setTimeout(()=>el.remove(),4200)}
function expireLocalSession(){
  Object.assign(state,{connected:false,user:null,demo:false});
  state.data={dashboard:null,courses:null,tasks:null,grades:null,schedule:null,calendar:null,messages:null,files:null,tests:null,materials:null,profile:null,view:null,activity:null};
  state.requests={};
  render();
}
async function api(path,options={}){
  const h=new Headers(options.headers||{});
  if(options.body && !(options.body instanceof FormData) && !h.has('content-type')) h.set('content-type','application/json');
  const timeout=options.timeoutMs||25000; const {timeoutMs:_,signal:externalSignal,...rest}=options;
  const controller=typeof AbortController==='function'?new AbortController():null; const timer=controller?setTimeout(()=>controller.abort(),timeout):null;
  let signal=controller?.signal; if(externalSignal && controller && typeof AbortSignal!=='undefined' && typeof AbortSignal.any==='function') signal=AbortSignal.any([externalSignal,controller.signal]); else if(externalSignal) signal=externalSignal;
  let r;
  try{r=await fetch(path,{...rest,headers:h,credentials:'same-origin',...(signal?{signal}:{})})}
  catch(e){ if(e?.name==='AbortError') throw new Error('Nova не дождалась ответа. Повторите попытку.'); throw new Error('Не удалось связаться с сервером Nova.'); }
  finally{if(timer)clearTimeout(timer)}
  const d=await r.json().catch(()=>null);
  if(r.status===401){expireLocalSession();throw new Error(d?.error||'Сессия Campus закончилась. Подключите Campus заново.')}
  if(!r.ok||d?.ok===false) throw new Error(d?.error||`Ошибка ${r.status}`);
  return d;
}
function routeLabel(r){return {dashboard:'Главная',courses:'Курсы',schedule:'Расписание',grades:'Оценки',tasks:'Задания',calendar:'Календарь',messages:'Сообщения',files:'Файлы',tests:'Тесты',materials:'Материалы',activity:'Активность',profile:'Профиль',course:'Курс',view:'Материал'}[r]||'Campus Nova'}
function parseRoute(){
  let rawPath=location.pathname;
  if((!rawPath || rawPath==='/') && location.hash && /^#\//.test(location.hash)){ rawPath=location.hash.slice(1); }
  let p=rawPath.replace(/^\/+|\/+$/g,''); if(!p) {state.route='dashboard';state.param='';return}
  const parts=p.split('/'); state.route=parts[0]||'dashboard'; state.param=parts.slice(1).join('/')||'';
  if(state.route==='index.html') {state.route='dashboard';state.param=''}
  if(state.route==='content'){state.route='view';state.param=new URLSearchParams(location.search).get('path')||'/my/'}
  if(state.route==='activity' && location.search){const q=new URLSearchParams(location.search);if(q.get('courseId')){state.param=encodeActivityRef({courseId:Number(q.get('courseId')),cmid:Number(q.get('cmid')||0)||null,instance:Number(q.get('instance')||0)||null,contextId:Number(q.get('contextId')||0)||null,type:q.get('type')||null})}}
}
function navigate(route,param='',replace=false){
  const target=route==='view'?`/content?path=${encodeURIComponent(param)}`:route==='course'?`/course/${encodeURIComponent(param)}`:route==='activity'?`/activity/${encodeURIComponent(param)}`:`/${route==='dashboard'?'':route}`;
  const path=target==='/'?'/':target; const method=replace?'replaceState':'pushState'; history[method]({nova:true,route,param},'',path); state.routeEpoch++; parseRoute(); window.scrollTo({top:0,behavior:'smooth'});
  const loadingRoute={dashboard:'dashboard',courses:'courses',course:'course',schedule:'schedule',grades:'grades',tasks:'tasks',calendar:'calendar',messages:'messages',files:'files',materials:'materials',tests:'tests',activity:'activity',profile:'profile',view:null}[state.route];
  if(loadingRoute && !state.demo) state.status[loadingRoute]='loading';
  render(true);
  loadRouteData();
}
function back(fallback='dashboard'){ if(history.state?.nova){history.back();return} navigate(fallback); }
function formatDate(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}
function formatLong(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}
function formatTime(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
function firstName(){
  const user=state.user||{};

  const direct=[
    user.firstname,
    user.firstName,
    user.givenname,
    user.givenName
  ].find(
    value=>String(value||'').trim()
  );

  if(direct){
    return String(direct)
      .trim()
      .split(/\s+/)[0];
  }

  const full=String(
    user.fullname||
    user.name||
    'Студент'
  ).trim();

  if(!full){
    return 'Студент';
  }

  return full
    .split(/\s+/)[0]||
    'Студент';
}
function campusOrigin(){try{return new URL(state.campusUrl||'').origin}catch{return ''}}
function campusHost(){try{return new URL(state.campusUrl||'').host}catch{return 'вашего Campus'}}
function avatar(){return firstName().slice(0,1).toUpperCase()}
function flattenCalendar(c){const a=[];for(const w of c?.weeks||[])for(const d of w.days||[])for(const e of d.events||[])a.push({...e,timestart:e.timestart??d.timestamp});return a}
function dateKey(ts){const d=new Date(Number(ts)*1000);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function selectedKey(){return `${state.year}-${state.month}-${state.selectedDay}`}
function monthLabel(){return new Date(state.year,state.month-1,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}
function themeToggle(){
  state.theme=state.theme==='dark'?'light':'dark';
  setTheme();
  localStorage.setItem('nova-theme',state.theme);
  render();

  novaFrame(()=>{
    if(typeof document.querySelectorAll!=='function') return;

    document.querySelectorAll(
      '#theme-top,#theme-sidebar,#theme-profile'
    ).forEach(el=>{
      el.classList.remove('nova-theme-switching');
      void el.offsetWidth;
      el.classList.add('nova-theme-switching');
    });
  });
}
function setTheme(){document.body.dataset.theme=state.theme;const root=document.documentElement;if(root){root.dataset.theme=state.theme;root.style.colorScheme=state.theme}}
function brand(){return `<div class="brand"><span class="brand-mark">${icon('university',22)}</span><span><b>Campus <em>FA</em></b><small>Nova</small></span></div>`}
/* NOVA_ACCOUNT_INLINE_STYLES_20260919 */

function injectNovaAccountInlineStyles(){
  if(
    typeof document === 'undefined' ||
    !document.head ||
    typeof document.createElement !== 'function'
  ){
    return;
  }

  if(
    typeof document.getElementById === 'function' &&
    document.getElementById('nova-account-inline-styles')
  ){
    return;
  }

  const style=document.createElement('style');
  style.id='nova-account-inline-styles';

  style.textContent=`
    /* HEADER PROFILE */

    .profile-menu{
      position:relative !important;
      display:block !important;
      flex:0 0 auto !important;
      width:auto !important;
      height:auto !important;
      overflow:visible !important;
      z-index:100 !important;
    }

    .profile-menu .profile-chip{
      appearance:none !important;
      -webkit-appearance:none !important;

      width:auto !important;
      min-width:150px !important;
      height:44px !important;
      min-height:44px !important;

      display:flex !important;
      align-items:center !important;
      justify-content:flex-start !important;
      gap:9px !important;

      margin:0 !important;
      padding:6px 10px !important;

      border:1px solid var(--line) !important;
      border-radius:15px !important;

      background:var(--control) !important;
      color:var(--text) !important;

      font:inherit !important;
      line-height:1 !important;

      cursor:pointer !important;
      box-sizing:border-box !important;
    }

    .profile-menu .profile-chip > .avatar{
      display:grid !important;
      flex:0 0 31px !important;
      width:31px !important;
      height:31px !important;
      place-items:center !important;
    }

    .profile-menu .profile-chip > span:not(.avatar){
      display:block !important;
      min-width:0 !important;
    }

    .profile-menu .profile-chip b{
      display:block !important;
      color:var(--text) !important;
      font-size:11px !important;
      font-weight:800 !important;
      line-height:1.15 !important;
      white-space:nowrap !important;
    }

    .profile-menu .profile-chip small{
      display:block !important;
      margin-top:3px !important;
      color:var(--muted) !important;
      font-size:9px !important;
      line-height:1 !important;
    }

    .profile-menu .profile-chip > .icon{
      flex:0 0 auto !important;
      margin-left:2px !important;
      transition:transform .25s ease !important;
    }

    .profile-menu.open .profile-chip > .icon{
      transform:rotate(180deg) !important;
    }

    .profile-menu .profile-chip:hover{
      border-color:var(--accent) !important;
      background:var(--surface-2) !important;
      transform:translateY(-1px) !important;
    }

    /* PROFILE POPOVER */

    .profile-popover{
      position:absolute !important;
      top:54px !important;
      right:0 !important;
      left:auto !important;

      width:330px !important;
      max-width:calc(100vw - 28px) !important;

      display:block !important;
      box-sizing:border-box !important;

      margin:0 !important;
      padding:10px !important;

      border:1px solid var(--line) !important;
      border-radius:20px !important;

      background:var(--surface) !important;
      color:var(--text) !important;

      opacity:0 !important;
      visibility:hidden !important;
      pointer-events:none !important;

      transform:translateY(-8px) scale(.97) !important;
      transform-origin:top right !important;

      z-index:99999 !important;

      box-shadow:
        0 26px 70px rgba(0,0,0,.32),
        0 5px 18px rgba(0,0,0,.12) !important;

      transition:
        opacity .18s ease,
        visibility .18s ease,
        transform .24s cubic-bezier(.2,.75,.25,1) !important;
    }

    .profile-menu.open .profile-popover{
      opacity:1 !important;
      visibility:visible !important;
      pointer-events:auto !important;
      transform:translateY(0) scale(1) !important;
    }

    .profile-popover-head{
      display:flex !important;
      align-items:center !important;
      gap:11px !important;
      padding:7px 7px 11px !important;
    }

    .profile-popover-head .avatar{
      width:42px !important;
      height:42px !important;
      flex:0 0 42px !important;
      border-radius:13px !important;
    }

    .profile-popover-head b{
      display:block !important;
      color:var(--text) !important;
      font-size:12px !important;
      font-weight:850 !important;
      line-height:1.2 !important;
    }

    .profile-popover-head small{
      display:block !important;
      margin-top:3px !important;
      color:var(--muted) !important;
      font-size:9px !important;
    }

    .profile-popover-meta{
      display:grid !important;
      grid-template-columns:1fr 1fr !important;
      gap:7px !important;
      padding:8px 0 !important;

      border-top:1px solid var(--line) !important;
      border-bottom:1px solid var(--line) !important;
    }

    .profile-popover-meta span{
      display:block !important;
      min-width:0 !important;

      padding:9px !important;
      border-radius:12px !important;

      background:var(--surface-2) !important;
    }

    .profile-popover-meta small{
      display:block !important;
      color:var(--muted) !important;
      font-size:8px !important;
      line-height:1.2 !important;
    }

    .profile-popover-meta b{
      display:block !important;
      margin-top:4px !important;
      color:var(--text) !important;
      font-size:9px !important;
      font-weight:800 !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
      white-space:nowrap !important;
    }

    .profile-popover-actions{
      display:grid !important;
      gap:5px !important;
      padding-top:8px !important;
    }

    .profile-popover-item{
      appearance:none !important;
      -webkit-appearance:none !important;

      width:100% !important;
      min-height:52px !important;

      display:grid !important;
      grid-template-columns:32px minmax(0,1fr) auto !important;
      align-items:center !important;
      gap:8px !important;

      margin:0 !important;
      padding:7px 8px !important;

      border:1px solid transparent !important;
      border-radius:13px !important;

      background:transparent !important;
      color:var(--text) !important;

      text-align:left !important;
      font:inherit !important;
      line-height:1.15 !important;

      cursor:pointer !important;
      box-sizing:border-box !important;
    }

    .profile-popover-item:hover{
      background:var(--surface-2) !important;
      border-color:var(--line) !important;
      transform:translateX(2px) !important;
    }

    .profile-popover-item > span:nth-child(2){
      display:block !important;
      min-width:0 !important;
    }

    .profile-popover-item b{
      display:block !important;
      color:inherit !important;
      font-size:10px !important;
      font-weight:850 !important;
    }

    .profile-popover-item small{
      display:block !important;
      margin-top:2px !important;
      color:var(--muted) !important;
      font-size:8px !important;
    }

    .profile-popover-icon{
      width:32px !important;
      height:32px !important;

      display:grid !important;
      place-items:center !important;

      border-radius:10px !important;
      background:var(--surface-3) !important;
      color:var(--accent) !important;
    }

    .profile-popover-item.danger{
      color:var(--danger) !important;
    }

    .profile-popover-item.danger .profile-popover-icon{
      color:var(--danger) !important;
      background:rgba(232,95,118,.10) !important;
    }

    /* THEME ANIMATION */

    #theme-top,
    #theme-sidebar,
    #theme-profile{
      position:relative !important;
      overflow:hidden !important;
    }

    .nova-theme-switching .icon{
      animation:novaThemeSwitchInline .55s cubic-bezier(.2,.78,.25,1) !important;
    }

    @keyframes novaThemeSwitchInline{
      0%{
        opacity:.25;
        transform:rotate(-75deg) scale(.55);
      }
      55%{
        opacity:1;
        transform:rotate(12deg) scale(1.12);
      }
      100%{
        opacity:1;
        transform:rotate(0) scale(1);
      }
    }

    /* LOGOUT */

    .danger-button{
      appearance:none !important;
      -webkit-appearance:none !important;

      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      gap:7px !important;

      min-height:40px !important;
      padding:0 12px !important;

      border:1px solid rgba(232,95,118,.35) !important;
      border-radius:12px !important;

      background:rgba(232,95,118,.09) !important;
      color:var(--danger) !important;

      font:700 11px inherit !important;
      cursor:pointer !important;
    }

    .danger-button:hover{
      border-color:rgba(232,95,118,.60) !important;
      background:rgba(232,95,118,.15) !important;
      transform:translateY(-1px) !important;
    }

    .nova-confirm-backdrop{
      align-items:center !important;
      justify-content:center !important;
      padding:24px !important;
      z-index:100000 !important;
    }

    .nova-confirm-modal{
      width:min(420px,100%) !important;
      box-sizing:border-box !important;
      padding:22px !important;
      border-radius:24px !important;
    }

    .nova-confirm-actions{
      display:flex !important;
      justify-content:flex-end !important;
      align-items:center !important;
      gap:8px !important;
    }

    /* HEADER ICON ALIGNMENT FINAL */

    .top-actions > #theme-top,
    .top-actions > #notifications{
      width:40px !important;
      min-width:40px !important;
      max-width:40px !important;
      height:40px !important;
      min-height:40px !important;

      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;

      padding:0 !important;
      margin:0 !important;

      line-height:0 !important;
      text-align:center !important;
      vertical-align:middle !important;

      flex:0 0 40px !important;
      box-sizing:border-box !important;
    }

    .top-actions > #theme-top > .icon,
    .top-actions > #notifications > .icon{
      width:17px !important;
      height:17px !important;
      display:block !important;
      flex:0 0 17px !important;
      margin:0 !important;
      transform-origin:center center !important;
    }

    .top-actions > #notifications > i{
      position:absolute !important;
      right:8px !important;
      top:8px !important;
      margin:0 !important;
    }

    @media(max-width:760px){
      .profile-menu .profile-chip{
        width:44px !important;
        min-width:44px !important;
        justify-content:center !important;
        padding:5px !important;
      }

      .profile-menu .profile-chip > span:not(.avatar),
      .profile-menu .profile-chip > .icon{
        display:none !important;
      }

      .profile-popover{
        right:-4px !important;
        width:min(330px,calc(100vw - 24px)) !important;
      }

      .nova-confirm-actions{
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* NOVA_ACCOUNT_INLINE_STYLES_20260919 */

function notificationItems(){
  const items=[];
  const tasks=Array.isArray(state.data.tasks)?state.data.tasks:[];
  for(const t of tasks.slice(0,5)) items.push({type:'task',title:t.name||'Задание',meta:t.course||'Campus',action:()=>navigate('view',t.url||'/my/')});
  const msgs=state.data.messages||{};
  for(const c of (msgs.conversations||[]).filter(x=>Number(x.unreadcount||x.unreadCount||0)>0).slice(0,5)) items.push({type:'message',title:c.name||'Новое сообщение',meta:'Сообщения',action:()=>navigate('messages')});
  for(const e of flattenCalendar(state.data.calendar||{}).filter(x=>Number(x.timestart||0)*1000>=Date.now()).slice(0,4)) items.push({type:'event',title:e.name||'Событие',meta:e.course?.fullname||'Расписание',action:()=>navigate('calendar')});
  return items.slice(0,8);
}
function showNotifications(){
  const existing=$('#notification-modal'); if(existing){existing.remove();return;}
  const items=notificationItems();
  const root=document.createElement('div'); root.id='notification-modal'; root.className='modal-backdrop';
  root.innerHTML=`<div class="modal notification-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>Уведомления</h2><p class="modal-sub">События из доступных данных Campus</p></div><button class="icon-btn tiny" id="notifications-close">${icon('close',16)}</button></div><div class="notification-list">${items.map((x,i)=>`<button class="modal-item" data-notify-index="${i}"><span>${icon(x.type==='task'?'check-square':x.type==='message'?'message':'calendar',16)}</span><span><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></span></button>`).join('')||'<div class="inline-empty">Новых уведомлений нет.</div>'}</div></div>`;
  document.body.append(root);
  const close=()=>root.remove(); $('#notifications-close')?.addEventListener('click',close); root.addEventListener('click',e=>{if(e.target===root)close()});
  root.querySelectorAll('[data-notify-index]').forEach((el,i)=>el.addEventListener('click',()=>{const item=items[i];close();item?.action?.()}));
  const escHandler=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',escHandler)}}; document.addEventListener('keydown',escHandler);
}
function notificationsBadge(){const messages=state.data.messages||{};const n=(messages.conversations||[]).reduce((sum,c)=>sum+Number(c.unreadcount||c.unreadCount||0),0);return n?'<i></i>':''}
function shell(content){
  const active=['course','view'].includes(state.route)?'courses':state.route;
  const nav=NAV.map(([r,i,l])=>{const href=r==='dashboard'?'/':`/${r}`;return `<a class="nav-item ${active===r?'active':''}" href="${href}" data-go="${r}" aria-current="${active===r?'page':'false'}">${icon(i,18)}<span>${l}</span></a>`}).join('');
  return `<div class="app-shell"><aside class="sidebar"><div class="sidebar-top">${brand()}<div class="uni"><b>Финансовый университет</b><span>Краснодарский филиал</span></div></div><div class="nav-caption">УЧЕБНАЯ СРЕДА</div><nav class="nav">${nav}</nav><div class="sidebar-bottom"><button class="nav-item ${active==='profile'?'active':''}" data-go="profile">${icon('user',18)}<span>Профиль</span></button><button class="theme-row" id="theme-sidebar">${icon(state.theme==='dark'?'sun':'moon',17)}<span>${state.theme==='dark'?'Светлая тема':'Тёмная тема'}</span></button><span class="connection"><i></i>${state.demo?'Демо-режим':'Campus подключён'}</span></div></aside><main class="main"><header class="topbar"><div class="crumb"><button class="mobile-menu" id="mobile-menu">${icon('grid',18)}</button><span>Campus Nova</span><b>›</b><strong>${esc(routeLabel(state.route))}</strong></div><div class="top-actions"><label class="search"><span>${icon('search',17)}</span><input id="global-search" value="${esc(state.search)}" placeholder="Поиск по курсам, материалам, преподавателям…"><kbd>Ctrl K</kbd></label><button class="icon-btn" id="theme-top" title="Сменить тему">${icon(state.theme==='dark'?'sun':'moon',17)}</button><button class="icon-btn ${notificationsBadge()?'has-dot':''}" id="notifications" title="Уведомления">${icon('bell',17)}${notificationsBadge()}</button><div class="profile-menu" id="profile-menu"><button class="profile-chip" id="profile-menu-trigger" type="button" aria-expanded="false" aria-controls="profile-popover"><span class="avatar">${avatar()}</span><span><b>${esc(firstName())}</b><small>Студент</small></span>${icon('chevron',14)}</button><div class="profile-popover" id="profile-popover"><div class="profile-popover-head"><span class="avatar large">${avatar()}</span><div><b>${esc(state.user?.fullname||'Студент')}</b><small>Студент</small></div></div><div class="profile-popover-meta"><span><small>Статус</small><b>Campus подключён</b></span><span><small>ID пользователя</small><b>${esc(state.user?.id||'—')}</b></span></div><div class="profile-popover-actions"><button class="profile-popover-item" data-go="profile" type="button"><span class="profile-popover-icon">${icon('user',15)}</span><span><b>Профиль</b><small>Данные аккаунта и подключение</small></span>${icon('next',14)}</button><button class="profile-popover-item danger" id="profile-logout" type="button"><span class="profile-popover-icon">${icon('close',15)}</span><span><b>Выйти</b><small>Завершить сессию Campus</small></span></button></div></div></div></div></header><div id="page">${content}</div></main></div>`;
}
function skeletonGrid(n=6){return `<div class="skeleton-grid">${Array.from({length:n},()=>'<div class="skeleton-card"><span></span><span></span><span></span></div>').join('')}</div>`}
function statePanel(kind,service,retry=true){
  const errorTitles={course:'Не удалось загрузить курс.',activity:'Не удалось открыть активность.',grades:'Не удалось загрузить оценки.',tasks:'Не удалось загрузить задания.',files:'Не удалось загрузить файлы.',tests:'Не удалось загрузить тесты.',materials:'Не удалось загрузить материалы.',messages:'Не удалось загрузить сообщения.',profile:'Не удалось загрузить профиль.',calendar:'Не удалось загрузить календарь.',schedule:'Не удалось загрузить расписание.',courses:'Не удалось загрузить курсы.',view:'Не удалось открыть материал.',dashboard:'Не удалось загрузить главную страницу.'};
  const cfg={loading:['Загружаем данные…','Секунду, получаем актуальную информацию из Campus.'],error:[errorTitles[service]||'Не удалось загрузить данные Campus.',state.errors?.[service]||'Проверьте соединение и попробуйте ещё раз.'],empty:['Пока ничего нет','Campus успешно ответил, но для этого раздела данных сейчас нет.']}[kind];
  return `<div class="state-card ${kind}"><div class="state-icon">${kind==='loading'?'<span class="spinner"></span>':icon(kind==='error'?'info':'sparkle',22)}</div><h3>${cfg[0]}</h3><p>${esc(cfg[1])}</p>${retry&&kind==='error'?`<button class="primary" data-retry="${service}">${icon('refresh',16)} Повторить</button>`:''}</div>`;
}
function hero(){
  const calendar=state.data.calendar||{};
  const events=flattenCalendar(calendar);
  const now=new Date();
  const todayKey=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  const todayEvents=events.filter(event=>dateKey(event.timestart)===todayKey);
  const tasks=Array.isArray(state.data.tasks)?state.data.tasks:[];
  const hour=now.getHours();
  const greeting=hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер';

  const photos=[
    'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?auto=format&fit=crop&fm=jpg&q=86&w=1400',
    'https://images.unsplash.com/photo-1583373834259-46cc92173cb7?auto=format&fit=crop&fm=jpg&q=86&w=1400',
    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&fm=jpg&q=86&w=1400'
  ];

  const dateText=now.toLocaleDateString('ru-RU',{
    weekday:'long',
    day:'numeric',
    month:'long'
  });

  return `
    <section class="hero dashboard-hero">

      <div class="hero-media" aria-hidden="true">
        ${photos.map((src,index)=>`
          <img
            class="hero-photo hero-photo-${index}"
            src="${src}"
            alt=""
            loading="eager"
            decoding="async"
          >
        `).join('')}
        <div class="hero-media-glass"></div>
      </div>

      <div class="hero-overlay"></div>

      <div class="hero-brand">
        ${icon('university',23)}
        <span>
          <b>Финансовый университет</b>
          <small>Краснодарский филиал</small>
        </span>
      </div>

      <div class="hero-date">
        ${icon('calendar',15)}
        <span>${esc(dateText)}</span>
      </div>

      <div class="hero-copy">
        <div class="eyebrow">ЛИЧНЫЙ КАБИНЕТ</div>
        <h2>${greeting}, ${esc(firstName())}.</h2>
        <p>Всё необходимое для учёбы уже здесь.</p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <strong>${todayEvents.length}</strong>
          <span>${todayEvents.length===1?'событие сегодня':'событий сегодня'}</span>
        </div>

        <div class="hero-stat-divider"></div>

        <div class="hero-stat">
          <strong>${tasks.length}</strong>
          <span>${tasks.length===1?'активное задание':'активных заданий'}</span>
        </div>
      </div>

      <div class="hero-quote">
        <span class="hero-quote-label">NOVA</span>
        <strong>Знания сегодня.<br>Возможности завтра.</strong>
      </div>

    </section>
  `;
}

function metric(iconName,label,value,sub,route,cls){return `<button class="metric ${cls}" data-go="${route}"><span class="metric-icon">${icon(iconName,22)}</span><span><small>${esc(label)}</small><strong>${esc(String(value))}</strong><em>${esc(sub)} ${icon('arrow',13)}</em></span></button>`}
function dashboard(){
  const courses=Array.isArray(state.data.courses)?state.data.courses:[];
  const calendar=state.data.calendar||{};
  const events=flattenCalendar(calendar).sort((a,b)=>Number(a.timestart)-Number(b.timestart));
  const today=new Date(); const todayKey=`${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`; const todayEvents=events.filter(e=>dateKey(e.timestart)===todayKey);
  const tasks=Array.isArray(state.data.tasks)?state.data.tasks:[]; const grades=Array.isArray(state.data.grades)?state.data.grades:[];
  const nums=grades.map(x=>parseFloat(String(x.grade||'').replace(',','.'))).filter(Number.isFinite); const avg=nums.length?(nums.reduce((x,y)=>x+y,0)/nums.length).toFixed(1).replace('.',','):'—';
  const block=(service,html)=>state.status[service]==='loading'?'<div class="block-loading">Загружаем…</div>':state.status[service]==='error'?`<div class="block-error">${icon('info',14)}<span>${esc(state.errors?.[service]||'Не удалось загрузить блок.')}</span></div>`:html;
  if(state.status.dashboard==='loading') return `<section class="page dashboard-page">${hero()}<div class="dashboard-surface">${skeletonGrid(4)}</div></section>`;
  return `<section class="page dashboard-page">${hero()}
    <div class="metrics">${metric('calendar','Занятий сегодня',['loading','error'].includes(state.status.calendar)?'—':todayEvents.length,'Посмотреть','schedule','blue')}${metric('check-square','Ближайшие задания',['loading','error'].includes(state.status.tasks)?'—':tasks.length,'Перейти','tasks','orange')}${metric('chart','Средний балл',['loading','error'].includes(state.status.grades)?'—':avg,'Оценки','grades','green')}${metric('grid','Мои курсы',['loading','error'].includes(state.status.courses)?'—':courses.length,'К курсам','courses','purple')}</div>
    <div class="dashboard-layout"><div class="dash-main">
      ${Panel({title:'Расписание на сегодня',iconName:'calendar',action:'Все занятия',go:'schedule',children:block('calendar',todayEvents.length?`<div class="timeline">${todayEvents.slice(0,6).map((e,i)=>`<button class="timeline-row" data-view="${esc(e.url||'')}" data-route-url><span class="timeline-line"><i class="dot dot-${i%4}"></i></span><time>${formatTime(e.timestart)}</time><span><b>${esc(e.name||'Событие')}</b><small>${esc(e.course?.fullname||e.course?.shortname||'Campus')}</small></span>${icon('arrow',14)}</button>`).join('')}</div>`:'<div class="inline-empty">На сегодня занятий нет.</div>')})}
      ${Panel({title:'Последние курсы',iconName:'grid',action:'Все курсы',go:'courses',children:block('courses',`<div class="mini-courses">${courses.slice(0,4).map(miniCourse).join('')||'<div class="inline-empty">Курсов сейчас нет.</div>'}</div>`)})}
      ${Panel({title:'Объявления',iconName:'message',action:'Все события',go:'calendar',children:block('calendar',`<div class="announcement-list">${events.filter(e=>/объяв|announcement|новость/i.test(e.name||'')).slice(0,4).map(ann).join('')||'<div class="inline-empty">Новых объявлений нет.</div>'}</div>`)})}
      ${Panel({wide:true,title:'Мои задания',iconName:'check-square',action:'Все задания',go:'tasks',children:block('tasks',`<div class="compact-list">${tasks.slice(0,5).map(taskRow).join('')||'<div class="inline-empty">Новых заданий нет.</div>'}</div>`)})}
      ${Panel({wide:true,title:'Последние оценки',iconName:'chart',action:'Все оценки',go:'grades',children:block('grades',`<div class="compact-list">${grades.slice(0,5).map(gradeRow).join('')||'<div class="inline-empty">Оценок пока нет.</div>'}</div>`)})}
    </div><aside class="dash-side">${CalendarWidget()}<section class="side-card"><div class="panel-title"><span>${icon('sparkle',16)} Быстрые действия</span></div><div class="quick-actions">
  <button class="quick-action" data-go="files" aria-label="Открыть файлы">
    <span class="quick-action-icon">${icon('download',19)}</span>
    <span class="quick-action-copy">
      <b>Файлы</b>
      <small>Материалы курса</small>
    </span>
    <span class="quick-action-arrow">${icon('arrow',14)}</span>
  </button>

  <button class="quick-action" data-go="messages" aria-label="Открыть сообщения">
    <span class="quick-action-icon">${icon('message',19)}</span>
    <span class="quick-action-copy">
      <b>Сообщения</b>
      <small>Переписка Campus</small>
    </span>
    <span class="quick-action-arrow">${icon('arrow',14)}</span>
  </button>

  <button class="quick-action" data-go="tasks" aria-label="Открыть задания">
    <span class="quick-action-icon">${icon('check-square',19)}</span>
    <span class="quick-action-copy">
      <b>Задания</b>
      <small>Что нужно сдать</small>
    </span>
    <span class="quick-action-arrow">${icon('arrow',14)}</span>
  </button>

  <button class="quick-action" data-go="tests" aria-label="Открыть тесты">
    <span class="quick-action-icon">${icon('quiz',19)}</span>
    <span class="quick-action-copy">
      <b>Тесты</b>
      <small>Пройти проверку</small>
    </span>
    <span class="quick-action-arrow">${icon('arrow',14)}</span>
  </button>
</div></section><button
  type="button"
  class="quote-card"
  data-go="courses"
  aria-label="Открыть мои курсы"
>
  <span class="quote-card-orb quote-card-orb-a" aria-hidden="true"></span>
  <span class="quote-card-orb quote-card-orb-b" aria-hidden="true"></span>

  <span class="quote-card-head">
    <span class="quote-card-kicker">
      ${icon('university',12)}
      NOVA · CAMPUS
    </span>

    <span class="quote-card-status">
      Готово к учёбе
    </span>
  </span>

  <span class="quote-card-copy">
    <b>
      Всё для учёбы.<br>
      <em>В одном месте.</em>
    </b>

    <small>
      Данные остаются в Campus. Nova меняет только опыт.
    </small>
  </span>

  <span class="quote-card-footer">
    <span>Открыть мои курсы</span>

    <span class="quote-card-action">
      ${icon('arrow',18)}
    </span>
  </span>
</button></aside></div></section>`;
}

function Panel({title,iconName='grid',action='',go='',wide=false,children}){return `<section class="panel ${wide?'wide':''}"><div class="panel-head"><div><h2>${icon(iconName,16)} ${esc(title)}</h2><small>Актуальные данные</small></div>${action?`<button class="panel-action" data-go="${go}">${esc(action)} ${icon('arrow',13)}</button>`:''}</div>${children}</section>`}
function miniCourse(c){const p=Number.isFinite(Number(c.progress))?Math.max(0,Math.min(100,Number(c.progress))):null;return `<button class="mini-course" data-go="course" data-param="${esc(c.id)}"><span class="course-thumb" style="${c.courseimage?`background-image:url('${String(c.courseimage).replace(/'/g,'%27')}')`:''}">${c.courseimage?'':icon('grid',20)}</span><span><b>${esc(c.fullnamedisplay||c.fullname||'Курс')}</b><small>${esc(c.shortname||'')}</small>${p!==null?`<i><em style="width:${p}%"></em></i>`:''}</span>${p!==null?`<strong>${p}%</strong>`:''}</button>`}

function groupByCourse(items,getter){
  const map=new Map();

  for(const item of items||[]){
    const name=
      String(
        getter?.(item)||
        'Без курса'
      ).trim()||
      'Без курса';

    const key=name.toLowerCase();

    if(!map.has(key)){
      map.set(key,{
        name,
        items:[]
      });
    }

    map.get(key).items.push(item);
  }

  return [...map.values()]
    .sort(
      (a,b)=>
        a.name.localeCompare(
          b.name,
          'ru',
          {
            sensitivity:'base'
          }
        )
    );
}

function courseGroupHead(name,count,type='activity'){
  const config={
    activity:{
      icon:'university',
      label:count===1?'задание':'заданий'
    },

    test:{
      icon:'quiz',
      label:count===1?'тест':'тестов'
    },

    material:{
      icon:'folder',
      label:count===1?'материал':'материалов'
    },

    file:{
      icon:'folder',
      label:count===1?'файл':'файлов'
    }
  };

  const cfg=
    config[type]||
    config.activity;

  return `
    <summary
      class="course-group-head"
      aria-label="${esc(
        `${name}, ${count} ${cfg.label}`
      )}"
    >

      <span class="course-group-icon">
        ${icon(cfg.icon,18)}
      </span>

      <span class="course-group-title">

        <b>
          ${esc(name)}
        </b>

        <small>
          ${count} ${cfg.label}
        </small>

      </span>

      <span class="course-group-chevron">
        ${icon('chevron',15)}
      </span>

    </summary>
  `;
}

function taskRow(t){const due=t.due?formatLong(t.due):'Срок не указан';return `<button class="compact-row" data-view="${esc(t.url||'')}" data-route-url><span class="compact-icon ${t.type}">${icon(t.type==='quiz'?'quiz':'check-square',17)}</span><span><b>${esc(t.name)}</b><small>${esc(t.course)}</small></span><em>${esc(due)}</em></button>`}
function gradeRow(g){return `<button class="compact-row grade" data-go="grades"><span class="compact-icon grade">${icon('chart',17)}</span><span><b>${esc(g.course||g.name||'Оценка')}</b><small>${esc(g.percentage||g.range||'')}</small></span><strong>${esc(g.grade||'—')}</strong></button>`}
function ann(e){return `<button class="ann" data-view="${esc(e.url||'')}" data-route-url><span>${icon('message',17)}</span><b>${esc(e.name||'Объявление')}</b><small>${esc(e.description||formatLong(e.timestart))}</small></button>`}
function coursesPage(){
  if(state.status.courses==='loading') return `<section class="page">${PageHead({eyebrow:'УЧЕБНАЯ СРЕДА',title:'Мои курсы',sub:'Загружаем актуальный список Campus…'})}<div class="tabs"><span class="chip active">Все</span></div>${skeletonGrid(6)}</section>`;
  if(state.status.courses==='error') return `<section class="page">${PageHead({eyebrow:'УЧЕБНАЯ СРЕДА',title:'Мои курсы',sub:'Не удалось получить список курсов.'})}${statePanel('error','courses')}</section>`;
  const courses=state.data.courses||[];
  if(!courses.length) return `<section class="page">${PageHead({eyebrow:'УЧЕБНАЯ СРЕДА',title:'Мои курсы',sub:'Campus успешно ответил, но доступных курсов сейчас нет.'})}${statePanel('empty','courses',false)}</section>`;
  const visible=state.search?courses.filter(c=>`${c.fullname||''} ${c.shortname||''} ${c.summary||''}`.toLowerCase().includes(state.search.toLowerCase())):courses;
  return `<section class="page">${PageHead({eyebrow:'УЧЕБНАЯ СРЕДА',title:'Мои курсы',sub:`${visible.length} ${visible.length===1?'курс':'курсов'} доступно прямо сейчас`,children:`<div class="view-toggle"><button class="${state.courseView==='cards'?'active':''}" id="cards-mode">${icon('grid',15)} Карточки</button><button class="${state.courseView==='list'?'active':''}" id="list-mode">${icon('folder',15)} Список</button></div>`})}<div class="course-grid ${state.courseView==='list'?'list-view':''}">${visible.map(courseCard).join('')||'<div class="inline-empty">По запросу ничего не найдено.</div>'}</div></section>`;
}
function courseCard(c){const p=Number.isFinite(Number(c.progress))?Math.max(0,Math.min(100,Number(c.progress))):null;return `<button class="course-card" data-go="course" data-param="${esc(c.id)}"><div class="course-cover" style="${c.courseimage?`background-image:url('${String(c.courseimage).replace(/'/g,'%27')}')`:''}"><span>${icon('grid',22)}</span><i></i></div><div class="course-card-body"><div class="course-dept">Кафедра математики и информатики</div><h3>${esc(c.fullnamedisplay||c.fullname||'Курс')}</h3><p>${esc(c.summary?text(c.summary).slice(0,100):'Электронный учебный курс')}</p><div class="course-foot">${p!==null?`<div class="progress"><i style="width:${p}%"></i></div><b>${p}%</b>`:'<span class="muted">Прогресс не указан</span>'}</div></div></button>`}
function PageHead({eyebrow,title,sub,children=''}){return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow||'')}</div><h1>${esc(title)}</h1><p>${esc(sub||'')}</p></div>${children}</div>`}
function coursePage(){
  if(state.status.course==='loading') return `<section class="page">${PageHead({eyebrow:'КУРС',title:'Загрузка курса',sub:'Получаем содержимое Campus…'})}${skeletonGrid(3)}</section>`;
  if(state.status.course==='error') return `<section class="page">${PageHead({eyebrow:'КУРС',title:'Не удалось открыть курс',sub:state.errors?.course||'Campus не вернул содержимое этого курса.'})}${statePanel('error','course')}</section>`;
  const c=state.data.course; if(!c) return `<section class="page">${statePanel('empty','course',false)}</section>`;
  const sections=Array.isArray(c.sections)?c.sections:[];
  const progress=Number.isFinite(Number(c.progress))?Number(c.progress):null;
  const count=sections.reduce((n,s)=>n+(Array.isArray(s.activities)?s.activities.length:0),0);
  const teachers=(Array.isArray(c.teachers)?c.teachers:[]).map(t=>esc(t.fullname||t.name||'')).filter(Boolean);
  const sectionMarkup=sections.map((sec,i)=>{
    const activities=Array.isArray(sec.activities)?sec.activities:[];
    return `<details class="course-section" ${i<2?'open':''}><summary><span class="section-number">${String(i+1).padStart(2,'0')}</span><span><b>${esc(sec.name||`Раздел ${i+1}`)}</b><small>${activities.length} ${activities.length===1?'активность':'активностей'}</small></span>${icon('chevron',17)}</summary><div class="activity-list">${activities.map(activity).join('')||'<div class="inline-empty">В этом разделе пока нет материалов.</div>'}</div></details>`;
  }).join('');
  const native = typeof c.nativeHtml==='string' && c.nativeHtml.trim() ? `<div class="native-course"><div class="native-course-head"><div><b>${icon('university',15)} Оригинальный Campus</b><small>Nova не потеряла содержимое. Показываем реальную страницу курса внутри нового интерфейса.</small></div>${c.fallback?.url?`<button class="secondary tiny" data-view="${esc(c.fallback.url)}">Открыть отдельно ${icon('arrow',13)}</button>`:''}</div><div id="campus-content" class="native-course-content">${c.nativeHtml}</div></div>`:'';
  const empty=`<div class="state-card empty course-empty"><div class="state-icon">${icon('sparkle',22)}</div><h3>Campus пока не отдал структурированные материалы.</h3><p>Nova сохранила реальную страницу курса и может открыть её напрямую.</p>${c.fallback?.url?`<button class="primary" data-view="${esc(c.fallback.url)}">Открыть содержимое Campus ${icon('arrow',16)}</button>`:''}</div>`;
  const bodyContent = count || sections.length ? `<div class="sections">${sectionMarkup}</div>` : (native || empty);
  return `<section class="page course-page"><div class="course-head"><button class="back-button" data-back="courses">${icon('back',17)} Все курсы</button><div class="course-hero-small"><div class="course-hero-copy"><div class="eyebrow">КУРС · ${count} ${count===1?'активность':'активностей'}</div><h1>${esc(c.title||'Курс')}</h1><p>${esc(c.description||'Электронный учебный курс')}</p>${teachers.length?`<div class="course-meta"><span>Преподаватель${teachers.length>1?'и':''}</span><b>${teachers.join(', ')}</b></div>`:''}${progress!==null?`<div class="progress-wide"><span>Прогресс ${progress}%</span><i><b style="width:${Math.max(0,Math.min(100,progress))}%"></b></i></div>`:''}</div><div class="course-hero-img" style="${c.courseimage?`background-image:url('${String(c.courseimage).replace(/'/g,'%27')}')`:''}"></div></div></div><div class="course-toolbar"><span>Содержание курса</span><div><button id="expand-all" class="secondary tiny">Развернуть всё</button><button id="collapse-all" class="secondary tiny">Свернуть всё</button></div></div>${bodyContent}</section>`;
}
function activity(a){
  const file=Array.isArray(a.contents)&&a.contents.find(x=>x.fileurl);
  const canDownload=Boolean(file?.fileurl);
  const canOpen=Boolean(a.url || a.cmid || a.id);
  const directFile=Boolean(canDownload && (!a.url || a.type==='file'));
  const labels={resource:'Материал',file:'Файл',folder:'Папка',page:'Страница',url:'Ссылка',assign:'Задание',quiz:'Тест',lesson:'Урок',book:'Книга',forum:'Форум',label:'Блок',feedback:'Опрос',workshop:'Семинар',choice:'Выбор',glossary:'Глоссарий'};
  const label=labels[a.type]||text(a.type||'Активность');
  const glyph=a.type==='assign'||a.type==='feedback'?'check-square':a.type==='quiz'?'quiz':a.type==='resource'||a.type==='file'||canDownload?'download':a.type==='forum'?'message':'grid';
  const ref={courseId:a.courseId||a.ref?.courseId||state.data.course?.id,cmid:a.cmid||a.id,instance:a.instance||null,contextId:a.contextId||null,type:a.type||a.modname||'unknown'};
  const activityAttr=esc(encodeURIComponent(JSON.stringify(ref)));
  const inner=`<span class="activity-icon ${esc(a.type||'activity')}">${icon(glyph,19)}</span><span><b>${esc(a.name||'Без названия')}</b><small>${esc(label)}${a.description?` · ${esc(text(a.description).slice(0,90))}`:''}${a.availabilityinfo?` · ${esc(text(a.availabilityinfo).slice(0,90))}`:''}${canDownload&&a.type!=='file'?` · ${esc(file.filename||'Файл доступен')}`:''}</small></span><em>${directFile?icon('download',16):canOpen?icon('arrow',16):''}</em>`;
  if(!canOpen && !directFile) return `<div class="activity activity-static">${inner}</div>`;
  const attrs=[];
  if(!directFile) attrs.push(`data-activity="${activityAttr}"`);
  if(canOpen) attrs.push(`data-view="${esc(a.url||'')}" data-route-url`);
  if(directFile) attrs.push(`data-download="${esc(file.fileurl)}"`);
  return `<button class="activity" ${attrs.join(' ')}>${inner}</button>`;
}
function gradePage(){
  if(state.status.grades==='loading') return `<section class="page">${PageHead({eyebrow:'РЕЗУЛЬТАТЫ',title:'Оценки',sub:'Загружаем данные Campus…'})}${skeletonGrid(5)}</section>`;
  if(state.status.grades==='error') return `<section class="page">${PageHead({eyebrow:'РЕЗУЛЬТАТЫ',title:'Оценки',sub:'Не удалось загрузить отчёт.'})}${statePanel('error','grades')}</section>`;
  const rows=state.data.grades||[]; const nums=rows.map(r=>parseFloat(String(r.grade||'').replace(',','.'))).filter(Number.isFinite); const avg=nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1).replace('.',','):'—';
  return `<section class="page">${PageHead({eyebrow:'РЕЗУЛЬТАТЫ',title:'Мои оценки',sub:'Оценки из твоего Campus',children:`<span class="summary-pill">Средний показатель <b>${avg}</b></span>`})}<div class="table-card"><table><thead><tr><th>Дисциплина</th><th>Оценка</th><th>Диапазон</th><th>Процент</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.course||r.name||'')}</b></td><td><span class="grade-badge">${esc(r.grade||'—')}</span></td><td>${esc(r.range||'')}</td><td>${esc(r.percentage||r.contribution||'')}</td></tr>`).join('')||'<tr><td colspan="4">Оценок нет.</td></tr>'}</tbody></table></div></section>`;
}
function activityRefAttr(a){return esc(encodeURIComponent(JSON.stringify(a?.ref||a)));}
function activityDue(a){const due=(a?.content?.dates||[]).find(d=>/due|срок|deadline/i.test(String(d.label||d.type||'')));return due?.timestamp||0}
function activityCourseName(a){
  const direct=
    a?.relations?.course?.name||
    a?.relations?.course?.fullname||
    a?.course?.fullname||
    a?.course?.name;

  if(direct){
    return String(direct);
  }

  const courseId=
    Number(
      a?.relations?.course?.id||
      a?.ref?.courseId||
      a?.courseId||
      0
    );

  if(courseId){
    const known=
      (state.data.courses||[])
        .find(
          c=>Number(c.id)===courseId
        );

    if(known){
      return String(
        known.fullnamedisplay||
        known.fullname||
        known.shortname||
        `Курс ${courseId}`
      );
    }

    return `Курс ${courseId}`;
  }

  return 'Без курса';
}
function tasksPage(){
  if(state.status.tasks==='loading'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'ПЛАН',
          title:'Мои задания',
          sub:'Загружаем задания из Campus…'
        })}
        ${skeletonGrid(6)}
      </section>
    `;
  }

  if(state.status.tasks==='error'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'ПЛАН',
          title:'Мои задания',
          sub:'Не удалось загрузить задания.'
        })}
        ${statePanel('error','tasks')}
      </section>
    `;
  }

  const tasks=
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : [];

  const groups=
    groupByCourse(
      tasks,
      activityCourseName
    );

  return `
    <section class="page tasks-page">

      ${PageHead({
        eyebrow:'ПЛАН',
        title:'Мои задания',
        sub:
          tasks.length
            ? `Всего ${tasks.length} заданий, распределённых по курсам.`
            : 'Активных заданий сейчас нет.',
        children:`
          <button
            class="secondary"
            data-retry="tasks"
          >
            ${icon('refresh',16)}
            Обновить
          </button>
        `
      })}

      <div class="course-groups">

        ${
          groups.map(group=>`
            <details
              class="course-group"
              open
            >

              ${courseGroupHead(
                group.name,
                group.items.length,
                'activity'
              )}

              <div class="course-group-body">

                ${
                  group.items.map(a=>{
                    const due=activityDue(a);

                    return `
                      <button
                        class="task-card"
                        data-activity="${activityRefAttr(a)}"
                      >

                        <span class="task-kind assign">
                          ${icon('check-square',18)}
                        </span>

                        <span class="task-card-main">
                          <b>
                            ${esc(
                              a.identity?.name||
                              'Задание'
                            )}
                          </b>

                          <small>
                            ${
                              due
                                ? `Срок сдачи · ${esc(formatLong(due))}`
                                : 'Срок не указан'
                            }
                          </small>
                        </span>

                        ${
                          due
                            ? `
                              <time>
                                ${esc(formatDate(due))}
                              </time>
                            `
                            : ''
                        }

                        <span class="task-card-arrow">
                          ${icon('arrow',16)}
                        </span>

                      </button>
                    `;
                  }).join('')
                }

              </div>

            </details>
          `).join('')
        }

        ${
          !groups.length
            ? `
              <div class="state-card empty">
                <div class="state-icon">
                  ${icon('check-square',22)}
                </div>

                <h3>
                  Заданий сейчас нет
                </h3>

                <p>
                  Когда преподаватель добавит работу,
                  она появится здесь внутри своего курса.
                </p>
              </div>
            `
            : ''
        }

      </div>

    </section>
  `;
}
function testsPage(){
  if(state.status.tests==='loading'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'КОНТРОЛЬ',
          title:'Тесты',
          sub:'Загружаем тесты из Campus…'
        })}
        ${skeletonGrid(5)}
      </section>
    `;
  }

  if(state.status.tests==='error'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'КОНТРОЛЬ',
          title:'Тесты',
          sub:'Не удалось загрузить тесты.'
        })}
        ${statePanel('error','tests')}
      </section>
    `;
  }

  const tests=
    Array.isArray(state.data.tests)
      ? state.data.tests
      : [];

  const groups=
    groupByCourse(
      tests,
      activityCourseName
    );

  return `
    <section class="page tests-page">

      ${PageHead({
        eyebrow:'КОНТРОЛЬ',
        title:'Тесты',
        sub:
          tests.length
            ? `Всего ${tests.length} тестов, распределённых по курсам.`
            : 'Доступных тестов сейчас нет.',
        children:`
          <button
            class="secondary"
            data-retry="tests"
          >
            ${icon('refresh',16)}
            Обновить
          </button>
        `
      })}

      <div class="course-groups">

        ${
          groups.map(group=>`
            <details
              class="course-group"
              open
            >

              ${courseGroupHead(
                group.name,
                group.items.length,
                'test'
              )}

              <div class="course-group-body">

                ${
                  group.items.map(a=>{
                    const due=activityDue(a);

                    return `
                      <button
                        class="test-card"
                        data-activity="${activityRefAttr(a)}"
                      >

                        <span class="test-icon">
                          ${icon('quiz',21)}
                        </span>

                        <span class="test-card-main">
                          <b>
                            ${esc(
                              a.identity?.name||
                              'Тест'
                            )}
                          </b>

                          <small>
                            ${
                              due
                                ? `Окончание · ${esc(formatLong(due))}`
                                : 'Дата не указана'
                            }
                          </small>
                        </span>

                        <span class="test-card-arrow">
                          ${icon('arrow',16)}
                        </span>

                      </button>
                    `;
                  }).join('')
                }

              </div>

            </details>
          `).join('')
        }

        ${
          !groups.length
            ? `
              <div class="state-card empty">
                <div class="state-icon">
                  ${icon('quiz',22)}
                </div>

                <h3>
                  Тестов сейчас нет
                </h3>

                <p>
                  Доступные тесты появятся здесь
                  после публикации в Campus.
                </p>
              </div>
            `
            : ''
        }

      </div>

    </section>
  `;
}
function schedulePage(){
  if(state.status.schedule==='loading') return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:'События выбранного дня.'})}${skeletonGrid(4)}</section>`;
  if(state.status.schedule==='error') return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:'Не удалось загрузить расписание.'})}${statePanel('error','schedule')}</section>`;
  const events=flattenCalendar(state.data.schedule||{}).filter(e=>dateKey(e.timestart)===selectedKey()).sort((a,b)=>Number(a.timestart)-Number(b.timestart));
  return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:formatLong(new Date(state.year,state.month-1,state.selectedDay).getTime()/1000),children:`<button class="secondary" data-go="calendar">${icon('calendar',16)} Открыть календарь</button>`})}<div class="schedule-list">${events.map(e=>`<button class="schedule-card" data-view="${esc(e.url||'')}" data-route-url><time>${formatTime(e.timestart)}</time><span class="schedule-dot"></span><div><b>${esc(e.name||'Событие')}</b><small>${esc(e.location||e.course?.fullname||'')}</small></div>${icon('arrow',16)}</button>`).join('')||'<div class="inline-empty">На выбранную дату занятий нет.</div>'}</div></section>`;
}
function calendarPage(){
  if(state.status.calendar==='loading'){
    return `
      <section class="page calendar-page">
        ${PageHead({
          eyebrow:'КАЛЕНДАРЬ',
          title:'Календарь',
          sub:'Загружаем календарь Campus…'
        })}
        ${skeletonGrid(3)}
      </section>
    `;
  }

  if(state.status.calendar==='error'){
    return `
      <section class="page calendar-page">
        ${PageHead({
          eyebrow:'КАЛЕНДАРЬ',
          title:'Календарь',
          sub:'Не удалось получить календарь.'
        })}
        ${statePanel('error','calendar')}
      </section>
    `;
  }

  const events=flattenCalendar(
    state.data.calendar||{}
  );

  const selectedEvents=eventsForSelected();

  const selectedDate=new Date(
    state.year,
    state.month-1,
    state.selectedDay
  );

  const selectedLabel=selectedDate.toLocaleDateString(
    'ru-RU',
    {
      weekday:'long',
      day:'numeric',
      month:'long'
    }
  );

  const selectedLabelShort=selectedDate.toLocaleDateString(
    'ru-RU',
    {
      day:'numeric',
      month:'long',
      year:'numeric'
    }
  );

  const monthEvents=events.length;

  const taskCount=events.filter(
    e=>calendarEventKind(e)==='task'
  ).length;

  const quizCount=events.filter(
    e=>calendarEventKind(e)==='quiz'
  ).length;

  return `
    <section class="page calendar-page">

      ${PageHead({
        eyebrow:'КАЛЕНДАРЬ',
        title:monthLabel(),
        sub:'Планируй учебные дни, задания и события Campus.',
        children:`
          <div class="calendar-actions">
            <button
              class="icon-btn calendar-nav-btn"
              data-month="-1"
              aria-label="Предыдущий месяц"
              title="Предыдущий месяц"
            >
              ${icon('back',17)}
            </button>

            <button
              class="secondary calendar-today-btn"
              id="calendar-today"
            >
              ${icon('calendar',15)}
              Сегодня
            </button>

            <button
              class="icon-btn calendar-nav-btn"
              data-month="1"
              aria-label="Следующий месяц"
              title="Следующий месяц"
            >
              ${icon('next',17)}
            </button>
          </div>
        `
      })}

      <div class="calendar-overview">

        <div class="calendar-overview-date">

          <div class="calendar-overview-icon">
            ${icon('calendar',20)}
          </div>

          <div>
            <span>Выбранная дата</span>
            <b>${esc(
              selectedLabel.charAt(0).toUpperCase()+
              selectedLabel.slice(1)
            )}</b>
            <small>${esc(selectedLabelShort)}</small>
          </div>

        </div>

        <div class="calendar-overview-stats">

          <div class="calendar-stat">
            <b>${monthEvents}</b>
            <span>событий</span>
          </div>

          <div class="calendar-stat task">
            <b>${taskCount}</b>
            <span>заданий</span>
          </div>

          <div class="calendar-stat quiz">
            <b>${quizCount}</b>
            <span>тестов</span>
          </div>

        </div>

      </div>

      <div class="calendar-layout">

        <section class="calendar-card calendar-primary">

          <div class="calendar-card-head">

            <div>
              <span class="calendar-card-kicker">
                ${icon('grid',14)}
                МЕСЯЦ
              </span>

              <b>${esc(monthLabel())}</b>

              <small>
                Нажми на день, чтобы открыть события.
              </small>
            </div>

            ${calendarLegend()}

          </div>

          <div
            class="weekday calendar-weekdays"
            aria-label="Дни недели"
          >
            ${[
              'Пн','Вт','Ср','Чт','Пт','Сб','Вс'
            ].map(x=>`<span>${x}</span>`).join('')}
          </div>

          <div class="calendar-month-grid">
            ${calendarGrid(false)}
          </div>

        </section>

        <aside class="events-card calendar-events">

          <div class="calendar-events-head">

            <div class="calendar-events-icon">
              ${icon('calendar',17)}
            </div>

            <div>
              <span>ВЫБРАННЫЙ ДЕНЬ</span>

              <h2>
                ${esc(
                  selectedLabel.charAt(0).toUpperCase()+
                  selectedLabel.slice(1)
                )}
              </h2>

              <small>${esc(selectedLabelShort)}</small>
            </div>

          </div>

          <div class="calendar-events-divider"></div>

          <div class="calendar-events-list">

            ${
              selectedEvents.length
                ? selectedEvents.map(e=>`
                    <button
                      class="calendar-event-item"
                      data-view="${esc(e.url||'')}"
                      data-route-url
                    >

                      <span class="calendar-event-time">
                        ${formatTime(e.timestart)}
                      </span>

                      <span class="calendar-event-line"></span>

                      <span class="calendar-event-copy">

                        <small class="calendar-event-type ${calendarEventKind(e)}">
                          ${
                            calendarEventKind(e)==='task'
                              ? 'Задание'
                              : calendarEventKind(e)==='quiz'
                              ? 'Тест'
                              : 'Событие'
                          }
                        </small>

                        <b>
                          ${esc(e.name||'Событие')}
                        </b>

                        <small>
                          ${esc(
                            e.location||
                            e.course?.fullname||
                            'Campus'
                          )}
                        </small>

                      </span>

                      ${icon('arrow',15)}

                    </button>
                  `).join('')
                : `
                  <div class="calendar-empty-state">

                    <div class="calendar-empty-icon">
                      ${icon('check',20)}
                    </div>

                    <b>День свободен</b>

                    <p>
                      На выбранную дату событий нет.
                      Можно спокойно заняться другими задачами.
                    </p>

                  </div>
                `
            }

          </div>

        </aside>

      </div>

    </section>
  `;
}

function calendarEventKind(event){
  const value=[
    event?.modulename,
    event?.eventtype,
    event?.name,
    event?.description
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if(
    /assign|задани|практик|deadline|срок сдач|домаш/.test(value)
  ){
    return 'task';
  }

  if(
    /quiz|test|тест|контроль|exam|экзамен|зачет|зачёт/.test(value)
  ){
    return 'quiz';
  }

  return 'study';
}

function calendarLegend(){
  return `
    <div class="calendar-legend">

      <span>
        <i class="task"></i>
        Задание
      </span>

      <span>
        <i class="quiz"></i>
        Тест
      </span>

      <span>
        <i class="study"></i>
        Событие
      </span>

    </div>
  `;
}

function CalendarWidget(){
  return `
    <section class="side-card calendar-mini">

      <div class="panel-title">
        <span>
          ${icon('calendar',16)}
          Календарь
        </span>

        <button
          class="panel-link-button"
          data-go="calendar"
        >
          Все
        </button>
      </div>

      <div class="mini-month-head">

        <button
          class="icon-btn tiny"
          data-month="-1"
          aria-label="Предыдущий месяц"
        >
          ${icon('back',14)}
        </button>

        <b>
          ${esc(monthLabel())}
        </b>

        <button
          class="icon-btn tiny"
          data-month="1"
          aria-label="Следующий месяц"
        >
          ${icon('next',14)}
        </button>

      </div>

      <div class="mini-weekdays" aria-label="Дни недели">
        <span title="Понедельник" aria-label="Понедельник">ПН</span>
        <span title="Вторник" aria-label="Вторник">ВТ</span>
        <span title="Среда" aria-label="Среда">СР</span>
        <span title="Четверг" aria-label="Четверг">ЧТ</span>
        <span title="Пятница" aria-label="Пятница">ПТ</span>
        <span title="Суббота" aria-label="Суббота">СБ</span>
        <span title="Воскресенье" aria-label="Воскресенье">ВС</span>
      </div>

      <div class="mini-grid">
        ${calendarGrid(true)}
      </div>

      ${calendarLegend()}

    </section>
  `;
}
function calendarGrid(mini=false){
  const first=
    new Date(
      state.year,
      state.month-1,
      1
    );

  const offset=
    (first.getDay()+6)%7;

  const days=
    new Date(
      state.year,
      state.month,
      0
    ).getDate();

  const totalCells=
    mini
      ? 42
      : Math.ceil((offset+days)/7)*7;

  const prevDays=
    new Date(
      state.year,
      state.month-1,
      0
    ).getDate();

  const events=
    flattenCalendar(
      state.data.calendar||{}
    );

  const today=
    new Date();

  const todayKey=
    `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;

  let html='';

  for(let i=0;i<totalCells;i++){

    const n=i-offset+1;

    let day=n;
    let month=state.month;
    let year=state.year;
    let other=false;

    if(n<1){

      day=prevDays+n;
      month=state.month-1;

      if(month<1){
        month=12;
        year=state.year-1;
      }

      other=true;
    }

    else if(n>days){

      day=n-days;
      month=state.month+1;

      if(month>12){
        month=1;
        year=state.year+1;
      }

      other=true;
    }

    if(mini && other){
      html+=`
        <span
          class="day day-empty"
          aria-hidden="true"
        ></span>
      `;
      continue;
    }

    const key=
      `${year}-${month}-${day}`;

    const dayEvents=
      events.filter(
        event=>dateKey(event.timestart)===key
      );

    const kinds=[
      ...new Set(
        dayEvents
          .map(calendarEventKind)
          .filter(Boolean)
      )
    ].slice(0,3);

    const selected=
      !other &&
      year===state.year &&
      month===state.month &&
      day===state.selectedDay;

    const istoday=
      key===todayKey;

    const eventNames=
      dayEvents
        .slice(0,4)
        .map(
          event=>String(
            event.name||
            event.modulename||
            'Событие'
          )
        );

    const label=
      eventNames.length
        ? eventNames.join(' • ')
        : `Дата ${day}`;

    html+=`
      <button
        class="day ${other?'other':''} ${selected?'selected':''} ${istoday?'today':''} ${dayEvents.length?'has-event':''}"
        data-day="${key}"
        aria-label="${esc(label)}"
        title="${esc(label)}"
      >

        <span class="day-number">
          ${day}
        </span>

        ${
          kinds.length
            ? `
              <span class="day-dots">
                ${kinds.map(kind=>`
                  <i class="day-marker ${kind}"></i>
                `).join('')}
              </span>
            `
            : ''
        }

      </button>
    `;
  }

  return html;
}

function eventsForSelected(){const events=flattenCalendar(state.data.calendar||{}).filter(e=>dateKey(e.timestart)===selectedKey()).sort((a,b)=>Number(a.timestart)-Number(b.timestart));return events}
function messagesPage(){
  if(state.status.messages==='loading') return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Загружаем диалоги Campus…'})}${skeletonGrid(2)}</section>`;
  if(state.status.messages==='error') return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Не удалось получить диалоги.'})}${statePanel('error','messages')}</section>`;
  const m=state.data.messages||{}; const conv=m.conversations||[];
  return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Переписка остаётся внутри Nova.',children:`<button class="secondary" data-retry="messages">${icon('refresh',16)} Обновить</button>`})}<div class="messages-shell"><div class="conversation-list">${conv.map(c=>`<button class="conversation-item ${String(c.id)===String(state.selectedConversation)?'active':''}" data-conversation="${esc(c.id)}"><span class="avatar">${esc((c.name||'Д').slice(0,1))}</span><span><b>${esc(c.name||'Диалог')}</b><small>${esc(text(c.messages?.[0]?.text||'Нет сообщений').slice(0,70))}</small></span></button>`).join('')||'<div class="inline-empty">Новых сообщений нет.</div>'}</div><div class="conversation-view" id="conversation-view">${state.selectedConversation?'<div class="loading-center"><span class="spinner"></span><p>Открываем переписку…</p></div>':'<div class="conversation-empty">'+icon('message',28)+'<h2>Выберите диалог</h2><p>История переписки и отправка сообщений доступны внутри Nova.</p></div>'}</div></div></section>`;
}
function filesPage(){
  if(state.status.files==='loading'){
    return `
      <section class="page files-page">
        ${PageHead({
          eyebrow:'ХРАНИЛИЩЕ',
          title:'Мои файлы',
          sub:'Собираем файлы из курсов Campus…'
        })}
        ${skeletonGrid(5)}
      </section>
    `;
  }

  if(state.status.files==='error'){
    return `
      <section class="page files-page">
        ${PageHead({
          eyebrow:'ХРАНИЛИЩЕ',
          title:'Мои файлы',
          sub:'Не удалось получить файлы.'
        })}
        ${statePanel('error','files')}
      </section>
    `;
  }

  const files=
    Array.isArray(state.data.files)
      ? state.data.files
      : [];

  const groups=
    groupByCourse(
      files,
      item=>
        activityCourseName(
          item?.activity||{}
        )
    );

  return `
    <section class="page files-page">

      ${PageHead({
        eyebrow:'ХРАНИЛИЩЕ',
        title:'Мои файлы',
        sub:
          files.length
            ? `${files.length} файлов из твоих курсов.`
            : 'Файлов сейчас нет.',
        children:`
          <button
            class="secondary"
            data-retry="files"
          >
            ${icon('refresh',16)}
            Обновить
          </button>
        `
      })}

      <div class="course-groups files-groups">

        ${
          groups.map(group=>`
            <details
              class="course-group"
              open
            >

              ${courseGroupHead(
                group.name,
                group.items.length,
                'file'
              )}

              <div class="course-group-body file-group-body">

                ${
                  group.items.map(item=>{
                    const a=item.activity||{};
                    const f=item.file||{};
                    const ref=activityRefAttr(a);

                    const filename=
                      f.filename||
                      a.identity?.name||
                      'Файл';

                    const type=
                      String(
                        f.mimetype||
                        ''
                      );

                    const size=
                      f.filesize
                        ? formatBytes(f.filesize)
                        : '';

                    return `
                      <div class="nova-file-row">

                        <button
                          class="nova-file-main"
                          data-activity="${ref}"
                        >

                          <span class="nova-file-icon">
                            ${icon('file',19)}
                          </span>

                          <span class="nova-file-copy">

                            <b>
                              ${esc(filename)}
                            </b>

                            <small>
                              ${
                                type
                                  ? esc(type)
                                  : 'Файл Campus'
                              }

                              ${
                                size
                                  ? ` · ${esc(size)}`
                                  : ''
                              }
                            </small>

                          </span>

                          <span class="nova-file-open">
                            ${icon('arrow',15)}
                          </span>

                        </button>

                        ${
                          f.fileurl
                            ? `
                              <button
                                class="nova-file-download icon-btn tiny"
                                data-download="${esc(f.fileurl)}"
                                aria-label="Скачать файл"
                                title="Скачать"
                              >
                                ${icon('download',16)}
                              </button>
                            `
                            : ''
                        }

                      </div>
                    `;
                  }).join('')
                }

              </div>

            </details>
          `).join('')
        }

        ${
          !groups.length
            ? `
              <div class="state-card empty">
                <div class="state-icon">
                  ${icon('folder',22)}
                </div>

                <h3>
                  Файлов пока нет
                </h3>

                <p>
                  Когда в курсах появятся документы,
                  они будут автоматически разложены здесь по курсам.
                </p>
              </div>
            `
            : ''
        }

      </div>

    </section>
  `;
}
function formatBytes(n){const x=Number(n)||0;if(x<1024)return `${x} Б`;if(x<1024*1024)return `${(x/1024).toFixed(1)} КБ`;if(x<1024*1024*1024)return `${(x/1024/1024).toFixed(1)} МБ`;return `${(x/1024/1024/1024).toFixed(1)} ГБ`}

function formatFileSize(n){return formatBytes(n)}

function materialsPage(){
  if(state.status.materials==='loading'){
    return `
      <section class="page materials-page">
        ${PageHead({
          eyebrow:'МАТЕРИАЛЫ',
          title:'Материалы',
          sub:'Собираем материалы из курсов Campus…'
        })}
        ${skeletonGrid(5)}
      </section>
    `;
  }

  if(state.status.materials==='error'){
    return `
      <section class="page materials-page">
        ${PageHead({
          eyebrow:'МАТЕРИАЛЫ',
          title:'Материалы',
          sub:'Не удалось получить материалы.'
        })}
        ${statePanel('error','materials')}
      </section>
    `;
  }

  const items=
    Array.isArray(state.data.materials)
      ? state.data.materials
      : [];

  const groups=
    groupByCourse(
      items,
      activityCourseName
    );

  return `
    <section class="page materials-page">

      ${PageHead({
        eyebrow:'МАТЕРИАЛЫ',
        title:'Материалы',
        sub:
          items.length
            ? `${items.length} материалов из твоих курсов.`
            : 'Материалов сейчас нет.',
        children:`
          <button
            class="secondary"
            data-retry="materials"
          >
            ${icon('refresh',16)}
            Обновить
          </button>
        `
      })}

      <div class="course-groups materials-groups">

        ${
          groups.map(group=>`
            <details
              class="course-group"
              open
            >

              ${courseGroupHead(
                group.name,
                group.items.length,
                'material'
              )}

              <div class="course-group-body">

                ${
                  group.items.map(a=>`
                    <button
                      class="material-card task-card"
                      data-activity="${activityRefAttr(a)}"
                    >

                      <span class="material-card-icon">
                        ${icon(
                          a.ref?.type==='folder'
                            ? 'folder'
                            : 'file',
                          19
                        )}
                      </span>

                      <span class="material-card-main">

                        <b>
                          ${esc(
                            a.identity?.name||
                            'Материал'
                          )}
                        </b>

                        <small>
                          ${
                            esc(
                              a.ref?.type||
                              'material'
                            )
                          }
                        </small>

                      </span>

                      <span class="material-card-arrow">
                        ${icon('arrow',16)}
                      </span>

                    </button>
                  `).join('')
                }

              </div>

            </details>
          `).join('')
        }

        ${
          !groups.length
            ? `
              <div class="state-card empty">
                <div class="state-icon">
                  ${icon('folder',22)}
                </div>

                <h3>
                  Материалов пока нет
                </h3>

                <p>
                  Материалы будут собраны автоматически
                  и отсортированы по курсам.
                </p>
              </div>
            `
            : ''
        }

      </div>

    </section>
  `;
}
function firstCampusFile(html) {
  const source = String(html || '');
  const doc = new DOMParser().parseFromString(source, 'text/html');

  const link = [...doc.querySelectorAll('a[href]')].find(a => {
    const href = a.getAttribute('href') || '';
    return /\/(?:pluginfile|tokenpluginfile|webservice\/pluginfile|draftfile)\.php/i.test(href)
      || /\.(?:pdf|docx?|xlsx?|pptx?|zip)(?:$|[?#])/i.test(href);
  });

  if (!link) return null;

  return {
    fileurl: normalizePath(link.getAttribute('href') || ''),
    filename: (link.textContent || '').replace(/\s+/g, ' ').trim() || 'Файл'
  };
}

function bindQuizStart() {
  const button = $('#quiz-start-button');
  if (!button) return;

  button.addEventListener('click', async () => {
    if (button.disabled) return;

    button.disabled = true;
    const original = button.innerHTML;

    button.innerHTML = `${icon('spinner',16)} Запускаем…`;

    try {
      await executeActivityAction('start');
    } finally {
      if (document.body.contains(button)) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  });
}

function activityHtml(result, title) {
  if (!result?.html) return '';

  if (typeof prepareCampusActivityHtml === 'function') {
    return prepareCampusActivityHtml(result.html, title);
  }

  return String(result.html);
}

function activityTypeLabel(a){const labels={resource:'Материал',file:'Файл',assign:'Задание',quiz:'Тест',page:'Страница',folder:'Папка',url:'Ссылка',forum:'Форум',glossary:'Глоссарий',lanebs:'Campus-активность',znaniumcombook:'Campus-активность'};return labels[a?.ref?.type]||a?.ref?.type||'Активность'}
function prepareCampusActivityHtml(html, title = '') {
  const source = String(html || '');
  if (!source.trim()) return '';

  const doc = new DOMParser().parseFromString(source, 'text/html');

  const removeSelectors = [
    'script',
    'style',
    'noscript',
    'header',
    'nav',
    'footer',
    '.navbar',
    '.breadcrumb',
    '.breadcrumbs',
    '#page-header',
    '#page-footer',
    '#nav-drawer',
    '#block-region-side-pre',
    '#region-pre',
    '.side-pre',
    '.side-pre-only',
    '.block_navigation',
    '.block_settings',
    '.usermenu',
    '.logininfo',
    '.paging-bar'
  ];

  doc.querySelectorAll(removeSelectors.join(',')).forEach(el => el.remove());

  const normalize = value => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const wanted = normalize(title);
  let root = null;

  const preferred = [
    '[role="main"]',
    '#region-main',
    '#region-main-box',
    '#page-content',
    '.region-main',
    '.activity-content',
    '.box.generalbox',
    'main'
  ];

  for (const selector of preferred) {
    const candidate = doc.querySelector(selector);
    if (candidate && candidate.textContent.trim().length > 80) {
      root = candidate;
      break;
    }
  }

  if (wanted) {
    const headings = [...doc.querySelectorAll('h1,h2,h3,h4')];

    const heading = headings.find(el => {
      const text = normalize(el.textContent);
      return text && (
        text === wanted ||
        text.includes(wanted) ||
        wanted.includes(text)
      );
    });

    if (heading) {
      let current = heading.parentElement;

      while (current && current !== doc.body) {
        const text = normalize(current.textContent);
        const elementCount = current.querySelectorAll(
          'a,form,table,p,li,img,input,button'
        ).length;

        if (
          text.length >= 80 &&
          text.length <= 18000 &&
          elementCount >= 1
        ) {
          root = current;

          if (
            /activity|generalbox|region-main|content|box|page/i.test(
              current.className || ''
            ) ||
            current.tagName === 'MAIN'
          ) {
            break;
          }
        }

        current = current.parentElement;
      }
    }
  }

  if (!root) root = doc.body;

  root.querySelectorAll(
    '.navbar,.breadcrumb,.breadcrumbs,.block_navigation,.block_settings,.usermenu,#page-header,#page-footer,.navfooter,.activity-navigation,.activity-navigation .navbutton'
  ).forEach(el => el.remove());

  // Remove duplicate legacy Moodle navigation/copy links.
  [...root.querySelectorAll('p')].forEach(el => {
    const text = normalize(el.textContent);
    if (
      text.startsWith('нажмите на ссылку') ||
      text === 'назад' ||
      text.startsWith('назад') ||
      text.startsWith('далее')
    ) {
      el.remove();
    }
  });

  // The Nova page already has its own title.
  [...root.querySelectorAll('h1,h2,h3')].forEach(el => {
    if (normalize(el.textContent) === wanted) {
      el.remove();
      return;
    }

    if (/^лекция №\d+$/i.test(el.textContent.trim()) && /лекц/i.test(title)) {
      el.remove();
    }
  });

  root.querySelectorAll('[style]').forEach(el => {
    el.removeAttribute('style');
  });

  root.querySelectorAll('font,center').forEach(el => {
    el.replaceWith(...el.childNodes);
  });

  // Remove legacy Moodle template placeholders.
  [...root.querySelectorAll('*')].forEach(el => {
    const normalized = normalize(el.textContent);

    if (
      normalized.includes('__picture__') ||
      normalized.includes('__name__') ||
      normalized.includes('__time__') ||
      normalized.includes('__content__')
    ) {
      el.remove();
    }
  });

  // Remove legacy activity navigation.
  root.querySelectorAll(
    '.navfooter,' +
    '.activity-navigation,' +
    '.paging-bar,' +
    '.navigation,' +
    '.navbuttons,' +
    '.mform .fitem_actionbuttons'
  ).forEach(el => el.remove());

  [...root.querySelectorAll('a')].forEach(a => {
    const text = normalize(a.textContent);

    if (
      text === 'назад' ||
      text === 'далее' ||
      text.startsWith('назад ') ||
      text.startsWith('далее ')
    ) {
      a.closest('p,div,li')?.remove();
    }
  });

  return root.innerHTML.trim();
}


function assignmentSourceMarkup(activity, result) {
  const content = activity?.content || {};
  const description = String(content.description || '').trim();

  const files = Array.isArray(content.files)
    ? content.files.filter(file => file?.fileurl)
    : [];

  const dates = Array.isArray(content.dates)
    ? content.dates
    : [];

  const due = dates.find(item =>
    /срок|deadline|due/i.test(String(item?.label || ''))
  );

  return `
    <section class="nova-practice-source">

      <div class="nova-practice-source-head">
        <div>
          <span class="eyebrow">УСЛОВИЕ</span>
          <h2>Практическое задание</h2>
        </div>

        <span class="nova-practice-badge">
          ${icon('check-square',14)} Практика
        </span>
      </div>

      ${
        description
          ? `
            <div class="nova-practice-description">
              ${esc(description)}
            </div>
          `
          : `
            <div class="nova-practice-description">
              <div class="inline-empty">
                Campus не передал описание задания.
              </div>
            </div>
          `
      }

      ${
        due?.timestamp
          ? `
            <div class="nova-practice-meta">
              <span>
                ${icon('calendar',14)}
                Срок
              </span>
              <b>${formatLong(due.timestamp)}</b>
            </div>
          `
          : ''
      }

      ${
        files.length
          ? `
            <div class="nova-practice-files">

              <div class="nova-practice-files-head">
                <div>
                  <span class="eyebrow">МАТЕРИАЛЫ</span>
                  <h3>Исходные файлы</h3>
                </div>

                <span class="nova-practice-count">
                  ${files.length}
                </span>
              </div>

              <div class="nova-practice-file-list">

                ${files.map(file => `
                  <a
                    class="nova-practice-file"
                    href="${esc(file.fileurl)}"
                  >
                    <span class="nova-practice-file-icon">
                      ${icon('file',19)}
                    </span>

                    <span class="nova-practice-file-copy">
                      <b>${esc(file.filename || 'Файл')}</b>

                      <small>
                        ${
                          esc(
                            file.mimetype ||
                            'Материал задания'
                          )
                        }

                        ${
                          file.filesize
                            ? ` · ${formatFileSize(file.filesize)}`
                            : ''
                        }
                      </small>
                    </span>

                    <span class="nova-practice-file-action">
                      ${icon('download',16)}
                    </span>
                  </a>
                `).join('')}

              </div>
            </div>
          `
          : ''
      }

    </section>
  `;
}


function assignmentFieldMarkup(control) {
  const type = String(control?.type || 'text').toLowerCase();
  const name = String(control?.name || '');

  if (!name) return '';

  if (type === 'textarea') {
    return `
      <label class="nova-answer-field">
        <span>Комментарий или текст ответа</span>

        <textarea
          name="${esc(name)}"
          ${control.required ? 'required' : ''}
          placeholder="Напишите ответ…"
        >${esc(control.value || '')}</textarea>
      </label>
    `;
  }

  if (type === 'select') {
    return `
      <label class="nova-answer-field">
        <span>Выберите вариант</span>

        <select
          name="${esc(name)}"
          ${control.required ? 'required' : ''}
        >
          ${(control.options || []).map(option => `
            <option
              value="${esc(option.value)}"
              ${
                String(option.value) ===
                String(control.value)
                  ? 'selected'
                  : ''
              }
            >
              ${esc(option.label)}
            </option>
          `).join('')}
        </select>
      </label>
    `;
  }

  return `
    <label class="nova-answer-field">
      <span>${esc(name)}</span>

      <input
        type="${esc(type)}"
        name="${esc(name)}"
        value="${esc(control.value || '')}"
        ${control.required ? 'required' : ''}
        placeholder="Введите значение…"
      />
    </label>
  `;
}


function assignmentFieldsMarkup(form) {
  const controls = Array.isArray(form?.controls)
    ? form.controls
    : [];

  const visible = controls.filter(control => {
    const type = String(control.type || '').toLowerCase();
    const name = String(control.name || '').toLowerCase();

    return (
      !control.disabled &&
      type !== 'hidden' &&
      type !== 'submit' &&
      type !== 'button' &&
      type !== 'file' &&
      type !== 'radio' &&
      type !== 'checkbox' &&
      !/sesskey|password|filemanager|draftitemid|itemid/.test(name)
    );
  });

  if (!visible.length) {
    return `
      <div class="nova-answer-note">
        <div class="nova-answer-note-icon">
          ${icon('upload',18)}
        </div>

        <div>
          <b>Работа сдаётся файлами</b>
          <span>
            Добавьте один или несколько файлов ниже.
          </span>
        </div>
      </div>
    `;
  }

  return visible.map(assignmentFieldMarkup).join('');
}


function assignmentUploadMarkup(result) {
  const uploaded = Array.isArray(result?.uploadedFiles)
    ? result.uploadedFiles
    : [];

  return `
    <form
      id="nova-assignment-form"
      class="nova-assignment-form"
    >

      <section class="nova-answer-panel">

        <div class="nova-answer-panel-head">

          <div>
            <span class="eyebrow">СДАЧА РАБОТЫ</span>
            <h2>Подготовьте ответ</h2>

            <p>
              Загрузите готовые файлы.
              Можно выбрать несколько одновременно.
            </p>
          </div>

          <span class="nova-secure-badge">
            ${icon('check',14)} Синхронизация с Campus
          </span>

        </div>


        <div class="nova-answer-fields">
          ${assignmentFieldsMarkup(result.form)}
        </div>


        <div
          class="nova-upload-zone"
          id="assignment-upload-zone"
        >

          <input
            id="assignment-file-input"
            type="file"
            multiple
            hidden
          >

          <div class="nova-upload-icon">
            ${icon('upload',24)}
          </div>

          <b>Добавьте файлы</b>

          <span>
            PDF, DOCX, XLSX, ZIP и другие форматы
          </span>

          <button
            class="secondary"
            type="button"
            id="assignment-choose-files"
          >
            ${icon('plus',15)} Выбрать файлы
          </button>

          <small id="assignment-upload-status">
            Файлы будут сохранены в защищённом черновике Campus.
          </small>

        </div>


        <div
          class="nova-upload-list"
          id="assignment-upload-list"
        >

          ${uploaded.map(file => `
            <div class="nova-upload-item nova-uploaded">

              <span class="nova-upload-item-icon">
                ${icon('file',17)}
              </span>

              <span class="nova-upload-item-info">
                <b>
                  ${esc(file.filename || 'Файл')}
                </b>

                <small>
                  ${
                    file.filesize
                      ? formatFileSize(file.filesize)
                      : ''
                  }
                  · загружено
                </small>
              </span>

              <span class="nova-upload-item-state">
                ${icon('check',16)}
              </span>

            </div>
          `).join('')}

        </div>


        <div class="nova-answer-actions">

          <button
            class="secondary"
            type="button"
            data-activity-action="save"
          >
            ${icon('save',16)}
            Сохранить черновик
          </button>

          <button
            class="primary"
            type="button"
            data-activity-action="submit"
          >
            ${icon('send',16)}
            Отправить преподавателю
          </button>

        </div>

      </section>

    </form>
  `;
}

function activityPage(){
  if(state.status.activity==='loading')
    return `
      <section class="page">
        <div class="content-card">
          <div class="content-toolbar">
            <button
              class="back-button"
              data-back="${state.routeBeforeActivity||'courses'}"
            >
              ${icon('back',17)} Назад
            </button>
          </div>

          ${statePanel('loading','activity',false)}
        </div>
      </section>
    `;

  if(state.status.activity==='error')
    return `
      <section class="page">
        <div class="content-card">
          <div class="content-toolbar">
            <button
              class="back-button"
              data-back="${state.routeBeforeActivity||'courses'}"
            >
              ${icon('back',17)} Назад
            </button>
          </div>

          ${statePanel('error','activity')}
        </div>
      </section>
    `;

  const data = state.data.activity || {};
  const a = data.activity || {};
  const result = data.result || {};

  const kind = result.kind || 'activity';

  const title =
    result.title ||
    a.identity?.name ||
    'Активность';

  let body = '';

  if(data.fallback){
    return `
      <section class="page">
        <div class="content-card">

          <div class="content-toolbar">
            <button
              class="back-button"
              data-back="${state.routeBeforeActivity||'courses'}"
            >
              ${icon('back',17)} Назад
            </button>
          </div>

          <div class="eyebrow">
            ${esc(activityTypeLabel(a))}
          </div>

          <h1>${esc(title)}</h1>

          <div class="state-card">
            <div class="state-icon">
              ${icon('arrow',22)}
            </div>

            <h3>Эту активность пока нельзя открыть в Nova</h3>

            <p>
              ${esc(
                data.message ||
                'Откройте исходную страницу Campus.'
              )}
            </p>

            <button
              class="primary"
              id="open-activity-fallback"
            >
              Открыть Campus ${icon('arrow',16)}
            </button>
          </div>

        </div>
      </section>
    `;
  }


  if(kind === 'assignment'){

    body = `
      ${assignmentSourceMarkup(a, result)}

      <section class="nova-bottom-cta">

        <div>
          <span class="eyebrow">СДАЧА</span>

          <h2>
            Готовы отправить работу?
          </h2>

          <p>
            Добавьте свои файлы и отправьте их преподавателю
            прямо из Nova.
          </p>
        </div>

        <button
          class="primary"
          type="button"
          data-activity-action="edit"
        >
          ${icon('upload',17)}
          Добавить ответ
        </button>

      </section>
    `;
  }


  else if(kind === 'assignment-form'){

    body = assignmentUploadMarkup(result);
  }


  else if(kind === 'file'){

    const file =
      result.file ||
      (
        Array.isArray(result.files)
          ? result.files[0]
          : null
      ) ||
      {};

    body = `
      <div class="nova-file-card">

        <div class="nova-file-icon">
          ${icon('file',26)}
        </div>

        <div class="nova-file-info">
          <span class="eyebrow">ФАЙЛ</span>

          <h2>
            ${esc(file.filename || title)}
          </h2>

          <p>
            ${esc(
              file.mimetype ||
              'Файл из Campus'
            )}
          </p>
        </div>

        ${
          file.fileurl
            ? `
              <a
                class="primary"
                href="${esc(file.fileurl)}"
              >
                ${icon('download',16)}
                Скачать
              </a>
            `
            : ''
        }

      </div>
    `;
  }


  else if(kind === 'resource'){

    body = `
      <div class="nova-download-card">

        <div class="nova-download-icon">
          ${icon('download',24)}
        </div>

        <div class="nova-download-copy">

          <span class="eyebrow">
            МАТЕРИАЛ
          </span>

          <h2>
            ${esc(title)}
          </h2>

          <p>
            Материал доступен через защищённую
            Campus-сессию.
          </p>

        </div>

        ${
          result.file?.fileurl
            ? `
              <a
                class="primary"
                href="${esc(result.file.fileurl)}"
              >
                ${icon('download',16)}
                Скачать
              </a>
            `
            : ''
        }

      </div>

      ${
        result.html
          ? `
            <div class="nova-activity-html">
              ${activityHtml(result,title)}
            </div>
          `
          : ''
      }
    `;
  }


  else if(kind === 'quiz'){

    body = `
      <section class="nova-quiz-intro">

        <div class="nova-quiz-icon">
          ${icon('quiz',24)}
        </div>

        <div>
          <span class="eyebrow">ТЕСТ</span>

          <h2>
            ${esc(title)}
          </h2>

          <p>
            После запуска вопросы и ответы
            синхронизируются с Campus.
          </p>
        </div>

        <button
          class="primary"
          id="quiz-start-button"
          type="button"
        >
          ${icon('arrow',16)}
          Начать тест
        </button>

      </section>

      ${
        result.html
          ? `
            <div class="nova-activity-html nova-quiz-html">
              ${activityHtml(result,title)}
            </div>
          `
          : ''
      }
    `;
  }


  else if(kind === 'quiz-action'){

    body = `
      <section class="nova-quiz-status">

        <div class="nova-quiz-status-icon">
          ${icon('check',20)}
        </div>

        <div>
          <span class="eyebrow">ТЕСТ</span>

          <h3>
            Попытка запущена
          </h3>

          <p>
            Выберите ответы и завершите тест
            через кнопку внизу.
          </p>
        </div>

      </section>

      <div class="nova-activity-html nova-quiz-html">
        ${
          result.html ||
          '<div class="inline-empty">Вопросы теста не переданы Campus.</div>'
        }
      </div>
    `;
  }


  else {

    body = `
      ${
        result.html
          ? `
            <div class="nova-activity-html">
              ${activityHtml(result,title)}
            </div>
          `
          : `
            <div class="inline-empty">
              Содержимое активности отсутствует.
            </div>
          `
      }
    `;
  }


  return `
    <section class="page activity-page">

      <div class="content-card">

        <div class="content-toolbar">

          <button
            class="back-button"
            data-back="${state.routeBeforeActivity||'courses'}"
          >
            ${icon('back',17)}
            Назад
          </button>

        </div>


        <div class="eyebrow">
          ${esc(activityTypeLabel(a))}
          ·
          ${esc(
            a?.relations?.course?.name ||
            'Курс'
          )}
        </div>


        <h1>
          ${esc(title)}
        </h1>


        <div id="campus-content">
          ${body}
        </div>

      </div>

    </section>
  `;
}

function profilePage(){
  if(state.status.profile==='loading') return `<section class="page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Загружаем профиль…'})}${skeletonGrid(2)}</section>`;
  if(state.status.profile==='error') return `<section class="page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Не удалось загрузить профиль.'})}${statePanel('error','profile')}</section>`;
  const p=state.data.profile||state.user||{}; return `<section class="page profile-page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Твой Campus в Nova.',children:`<button class="secondary danger-button" id="logout" type="button">${icon('close',15)} Выйти</button>`})}<div class="profile-grid"><section class="profile-card main-profile"><div class="profile-avatar">${esc(avatar())}</div><div><h2>${esc(p.fullname||state.user?.fullname||'Студент')}</h2><p>Студент · Финансовый университет</p><div class="status-pill"><i></i> Campus подключён</div></div></section><section class="profile-card"><div class="panel-title">Подключение</div><div class="profile-info"><span>Статус</span><b>Активно</b><span>ID пользователя</span><b>${esc(state.user?.id||p.id||'—')}</b><span>Сайт Campus</span><b>${esc(campusHost())}</b><span>Интерфейс</span><b>Campus Nova</b></div></section><section class="profile-card"><div class="panel-title">Тема</div><p class="profile-muted">Сохраняется на этом устройстве.</p><button class="secondary wide" id="theme-profile">${icon(state.theme==='dark'?'sun':'moon',16)} ${state.theme==='dark'?'Переключить на светлую':'Переключить на тёмную'}</button></section></div></section>`;
}
function viewPage(){
  const title=state.data.view?.title||'Материал';
  let body=skeletonGrid(2);
  if(state.status.view==='error') body=statePanel('error','view');
  return `<section class="page content-page"><div class="content-card"><div class="content-toolbar"><button class="back-button" data-back="dashboard">${icon('back',17)} Назад</button><button class="secondary" id="content-refresh">${icon('refresh',16)} Обновить</button></div><h1 id="view-title">${esc(title)}</h1><div id="campus-content">${body}</div></div></section>`;
}
function login(){
  const remembered = state.campusUrl || 'https://campus.fa.ru';

  return `
    <div class="auth">

      <section class="auth-left">
        <div class="auth-inner">

          <div class="auth-wordmark">
            <span class="auth-wordmark-mark">
              ${icon('university',22)}
            </span>

            <span class="auth-wordmark-copy">
              <small>CAMPUS NOVA</small>
              <b><span>Ваш</span> Campus</b>
            </span>
          </div>

          <div class="eyebrow">ВХОД В CAMPUS</div>

          <h1>
            Ваш <span>Campus.</span><br>
            Но в новом дизайне.
          </h1>

          <p class="auth-lead">
            Войдите, чтобы открыть свои курсы,
            задания, расписание и оценки в Nova.
          </p>

          <form id="login-form">

            <input
              type="hidden"
              name="campusUrl"
              value="${esc(remembered)}"
            >

            <label>
              Логин
              <input
                name="username"
                autocomplete="username"
                required
                placeholder="Введите логин"
              >
            </label>

            <label>
              Пароль

              <div class="password">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  placeholder="Введите пароль"
                >

                <button
                  type="button"
                  id="toggle-pass"
                  aria-label="Показать пароль"
                >
                  ${icon('eye',15)}
                </button>
              </div>
            </label>

            <button
              class="primary wide"
              type="submit"
            >
              Войти в Campus
              ${icon('arrow',17)}
            </button>

            <div class="security">
              ${icon('check',15)}
              Пароль не сохраняется в профиле Nova.
            </div>

            <div id="login-error"></div>

          </form>

        </div>
      </section>

      <section class="auth-visual">

        <img
          class="auth-photo"
          src="https://images.unsplash.com/photo-1769284019246-f6d24a277645?auto=format&fit=crop&fm=jpg&q=88&w=2400"
          srcset="
            https://images.unsplash.com/photo-1769284019246-f6d24a277645?auto=format&fit=crop&fm=jpg&q=88&w=2400 1x,
            https://images.unsplash.com/photo-1769284019246-f6d24a277645?auto=format&fit=crop&fm=jpg&q=90&w=3840 2x
          "
          sizes="58vw"
          alt="Современный университетский кампус"
          width="2400"
          height="1600"
          fetchpriority="high"
          decoding="async"
        >

        <div class="auth-visual-overlay"></div>

        <div class="auth-copy">
          <span>Campus Nova</span>
          <b>Ваш Campus.<br>Новый дизайн.</b>
          <small>Курсы · задания · оценки · расписание</small>
        </div>

      </section>

    </div>
  `;
}
function playNavMotion(){
  const active = document.querySelector('.nav-item.active');
  if(!active) return;

  const icon = active.querySelector('.icon');
  if(!icon || typeof icon.animate !== 'function') return;

  const route = active.dataset.go || 'default';

  if(icon.__novaAnimations){
    for(const animation of icon.__novaAnimations){
      try{ animation.cancel(); }catch{}
    }
  }

  const animations = [];

  const play = (element, keyframes, options={}) => {
    if(!element) return null;

    const animation = element.animate(keyframes,{
      duration: options.duration ?? 820,
      delay: options.delay ?? 0,
      easing: options.easing ?? 'cubic-bezier(.2,.82,.2,1)',
      fill: 'both'
    });

    animations.push(animation);
    return animation;
  };

  const q = selector => icon.querySelector(selector);
  const qa = selector => [...icon.querySelectorAll(selector)];

  switch(route){

    case 'dashboard':
      play(icon,[
        {transform:'translateY(8px) scale(.88)',opacity:.25},
        {transform:'translateY(-4px) scale(1.08)',opacity:1},
        {transform:'translateY(1px) scale(.985)',opacity:1},
        {transform:'translateY(0) scale(1)',opacity:1}
      ],{duration:880});
      break;

    case 'courses':
      play(icon,[
        {transform:'scale(.95)',opacity:.7},
        {transform:'scale(1.025)',opacity:1},
        {transform:'scale(1)',opacity:1}
      ],{duration:760});

      qa('rect').forEach((el,index)=>{
        play(el,[
          {transform:'scale(.25)',opacity:0},
          {transform:'scale(1.12)',opacity:1},
          {transform:'scale(.96)',opacity:1},
          {transform:'scale(1)',opacity:1}
        ],{
          duration:540,
          delay:90 + index*85,
          easing:'cubic-bezier(.16,1,.3,1)'
        });
      });
      break;

    case 'schedule': {
      const paths = qa('path');
      const hands = paths[1];

      play(icon,[
        {transform:'rotate(-7deg) scale(.94)',opacity:.5},
        {transform:'rotate(4deg) scale(1.045)',opacity:1},
        {transform:'rotate(-1.2deg) scale(.995)',opacity:1},
        {transform:'rotate(0) scale(1)',opacity:1}
      ],{duration:900});

      if(hands){
        play(hands,[
          {transform:'rotate(-15deg)',transformOrigin:'12px 12px'},
          {transform:'rotate(12deg)',transformOrigin:'12px 12px'},
          {transform:'rotate(0deg)',transformOrigin:'12px 12px'}
        ],{
          duration:760,
          delay:100,
          easing:'cubic-bezier(.2,.9,.2,1)'
        });
      }
      break;
    }

    case 'grades': {
      const paths = qa('path');
      const graph = paths[2];

      play(icon,[
        {transform:'translateY(3px) scale(.95)',opacity:.45},
        {transform:'translateY(-1px) scale(1.035)',opacity:1},
        {transform:'translateY(0) scale(1)',opacity:1}
      ],{duration:820});

      if(graph){
        const length = 70;
        graph.style.strokeDasharray = length;
        play(graph,[
          {strokeDashoffset:length,opacity:.2},
          {strokeDashoffset:0,opacity:1}
        ],{
          duration:760,
          delay:120,
          easing:'cubic-bezier(.2,.8,.2,1)'
        });
      }
      break;
    }

    case 'tasks': {
      const box = q('rect');
      const check = qa('path')[0];

      if(box){
        play(box,[
          {transform:'scale(.82)',opacity:.3},
          {transform:'scale(1.08)',opacity:1},
          {transform:'scale(.985)',opacity:1},
          {transform:'scale(1)',opacity:1}
        ],{
          duration:620,
          easing:'cubic-bezier(.16,1,.3,1)'
        });
      }

      if(check){
        const length = 32;
        check.style.strokeDasharray = length;
        play(check,[
          {strokeDashoffset:length,opacity:0},
          {strokeDashoffset:0,opacity:1}
        ],{
          duration:620,
          delay:250,
          easing:'cubic-bezier(.2,.8,.2,1)'
        });
      }

      play(icon,[
        {transform:'translateY(2px)',opacity:.55},
        {transform:'translateY(-1px)',opacity:1},
        {transform:'translateY(0)',opacity:1}
      ],{duration:900});
      break;
    }

    case 'calendar':
      play(icon,[
        {transform:'translateY(4px) rotate(-6deg) scale(.92)',opacity:.35},
        {transform:'translateY(-2px) rotate(4deg) scale(1.045)',opacity:1},
        {transform:'translateY(1px) rotate(-1deg) scale(.99)',opacity:1},
        {transform:'translateY(0) rotate(0) scale(1)',opacity:1}
      ],{duration:880});

      if(q('rect')){
        play(q('rect'),[
          {transform:'scale(.94)',opacity:.5},
          {transform:'scale(1.025)',opacity:1},
          {transform:'scale(1)',opacity:1}
        ],{duration:700,delay:90});
      }
      break;

    case 'messages': {
      const paths = qa('path');
      const dots = paths[1];

      play(icon,[
        {transform:'translateY(5px) scale(.86)',opacity:.3},
        {transform:'translateY(-3px) scale(1.07)',opacity:1},
        {transform:'translateY(1px) scale(.99)',opacity:1},
        {transform:'translateY(0) scale(1)',opacity:1}
      ],{duration:860});

      if(dots){
        play(dots,[
          {transform:'translateY(3px)',opacity:0},
          {transform:'translateY(0)',opacity:1}
        ],{
          duration:520,
          delay:250,
          easing:'cubic-bezier(.16,1,.3,1)'
        });
      }
      break;
    }

    case 'files':
      play(icon,[
        {transform:'translateY(5px) scaleY(.9)',opacity:.35},
        {transform:'translateY(-2px) scaleY(1.045)',opacity:1},
        {transform:'translateY(1px) scaleY(.995)',opacity:1},
        {transform:'translateY(0) scaleY(1)',opacity:1}
      ],{duration:860});

      if(q('path:last-child')){
        play(q('path:last-child'),[
          {transform:'translateY(2px)',opacity:.35},
          {transform:'translateY(-1px)',opacity:1},
          {transform:'translateY(0)',opacity:1}
        ],{duration:560,delay:160});
      }
      break;

    case 'materials':
      play(icon,[
        {transform:'translateX(-10px) rotate(-4deg) scale(.94)',opacity:.2},
        {transform:'translateX(3px) rotate(1deg) scale(1.035)',opacity:1},
        {transform:'translateX(-1px) rotate(-.3deg) scale(.995)',opacity:1},
        {transform:'translateX(0) rotate(0) scale(1)',opacity:1}
      ],{duration:920});
      break;

    case 'tests': {
      const paths = qa('path');

      play(icon,[
        {transform:'translateY(5px) rotateX(-10deg) scale(.9)',opacity:.3},
        {transform:'translateY(-2px) rotateX(3deg) scale(1.045)',opacity:1},
        {transform:'translateY(1px) rotateX(-1deg) scale(.995)',opacity:1},
        {transform:'translateY(0) rotateX(0) scale(1)',opacity:1}
      ],{duration:900});

      paths.slice(1).forEach((el,index)=>{
        play(el,[
          {transform:'translateX(-5px)',opacity:0},
          {transform:'translateX(0)',opacity:1}
        ],{
          duration:420,
          delay:230 + index*95,
          easing:'cubic-bezier(.16,1,.3,1)'
        });
      });
      break;
    }

    case 'profile':
      play(icon,[
        {transform:'scale(.8)',opacity:.2},
        {transform:'scale(1.11)',opacity:1},
        {transform:'scale(.975)',opacity:1},
        {transform:'scale(1)',opacity:1}
      ],{duration:900});
      break;

    default:
      play(icon,[
        {transform:'translateY(5px) scale(.9)',opacity:.35},
        {transform:'translateY(-2px) scale(1.06)',opacity:1},
        {transform:'translateY(0) scale(1)',opacity:1}
      ],{duration:850});
  }

  icon.__novaAnimations = animations;

  active.classList.add('nova-nav-motion');

  const total = Math.max(
    ...animations.map(animation=>{
      const timing = animation.effect?.getTiming?.();
      return (timing?.delay || 0) + (timing?.duration || 0);
    }),
    850
  );

  setTimeout(()=>{
    active.classList.remove('nova-nav-motion');
  }, total + 80);
}
function render(animateNav=false){
  setTheme();

  const app=$('#app');

  if(!state.connected){
    app.innerHTML=login();
    bind();
    novaFrame(()=>document.body.classList.add('nova-ready'));
    return;
  }

  let body='';

  switch(state.route){
    case 'courses':body=coursesPage();break;
    case 'course':body=coursePage();break;
    case 'schedule':body=schedulePage();break;
    case 'grades':body=gradePage();break;
    case 'tasks':body=tasksPage();break;
    case 'calendar':body=calendarPage();break;
    case 'messages':body=messagesPage();break;
    case 'files':body=filesPage();break;
    case 'tests':body=testsPage();break;
    case 'materials':body=materialsPage();break;
    case 'activity':body=activityPage();break;
    case 'profile':body=profilePage();break;
    case 'view':body=viewPage();break;
    default:body=dashboard();
  }

  app.innerHTML=shell(body);
  bind();

  novaFrame(()=>{
    $('#page')?.classList.add('page-entered');
    document.body.classList.add('nova-ready');

    if(animateNav){
      playNavMotion();
    }
  });
}
function bind(){
  $$('[data-go]:not(a)').forEach(el=>el.addEventListener('click',(event)=>{
    if(event.defaultPrevented) return;
    const route=el.dataset.go; const param=el.dataset.param||'';
    if(el.tagName==='A' && (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)) return;
    if(el.tagName==='A') event.preventDefault();
    try { navigate(route==='course'?'course':route,param); }
    catch (error) { console.error('[Nova][Navigation]',{route,param,error}); if(el.tagName==='A') window.location.href=el.getAttribute('href')||'/'; }
  }));
  $$('[data-back]').forEach(el=>el.addEventListener('click',()=>back(el.dataset.back||'dashboard')));
  $$('[data-retry]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.retry==='course')return loadRouteData(true); if(el.dataset.retry==='activity')return loadActivity(true); loadData(el.dataset.retry,true)}));
  $$('[data-activity]').forEach(el=>el.addEventListener('click',e=>{ if(e.target.closest('[data-download]')) return; const raw=el.dataset.activity; if(raw) { try { openActivity(JSON.parse(decodeURIComponent(raw))); } catch {} } }));
  $$('[data-activity-action]').forEach(el=>el.addEventListener('click',()=>executeActivityAction(el.dataset.activityAction)));
  $$('[data-view]').forEach(el=>el.addEventListener('click',e=>{if(el.hasAttribute('data-activity'))return;if(e.target.closest('[data-download]'))return;const p=el.dataset.view;if(p)openCampusPath(p)}));
  $$('[data-download]').forEach(el=>el.addEventListener('click',()=>downloadCampus(el.dataset.download)));
  $$('[data-conversation]').forEach(el=>el.addEventListener('click',()=>openConversation(el.dataset.conversation)));
  $$('[data-month]').forEach(el=>el.addEventListener('click',()=>changeMonth(Number(el.dataset.month))));
  $$('[data-day]').forEach(el=>el.addEventListener('click',()=>selectDay(el.dataset.day)));
  $('#theme-sidebar')?.addEventListener('click',themeToggle);$('#theme-top')?.addEventListener('click',themeToggle);$('#theme-profile')?.addEventListener('click',themeToggle);

  const profileMenu=$('#profile-menu');
  const profileTrigger=$('#profile-menu-trigger');

  profileTrigger?.addEventListener('click',e=>{
    e.stopPropagation();

    const open=!profileMenu?.classList.contains('open');

    profileMenu?.classList.toggle('open',open);
    profileTrigger.setAttribute(
      'aria-expanded',
      open?'true':'false'
    );
  });

  $('#profile-logout')?.addEventListener(
    'click',
    confirmNovaLogout
  );
  $('#calendar-today')?.addEventListener('click',()=>{const d=new Date();state.year=d.getFullYear();state.month=d.getMonth()+1;state.selectedDay=d.getDate();render();loadData('calendar',true)});
  $('#expand-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=true));$('#collapse-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=false));
  $('#cards-mode')?.addEventListener('click',()=>{state.courseView='cards';localStorage.setItem('nova-course-view','cards');render()});$('#list-mode')?.addEventListener('click',()=>{state.courseView='list';localStorage.setItem('nova-course-view','list');render()});
  $('#logout')?.addEventListener('click',confirmNovaLogout);$('#notifications')?.addEventListener('click',()=>showNotifications());
  const s=$('#global-search');if(s){s.addEventListener('input',()=>{state.search=s.value; if(state.route==='courses')render()});s.addEventListener('keydown',e=>{if(e.key==='Enter'&&state.search.trim())navigate('courses')});}
  $('#mobile-menu')?.addEventListener('click',()=>$('.sidebar')?.classList.toggle('mobile-open'));
  $('#login-form')?.addEventListener('submit',doLogin);$('#toggle-pass')?.addEventListener('click',()=>{const p=$('#login-password');if(p)p.type=p.type==='password'?'text':'password'});$('#demo-mode')?.addEventListener('click',loadDemo);
  $('#content-refresh')?.addEventListener('click',()=>loadView(true));
}
async function doLogin(e){e.preventDefault();const form=e.currentTarget;const btn=form.querySelector('button[type=submit]');const err=$('#login-error');btn.disabled=true;btn.innerHTML=`<span class="spinner small"></span> Подключаем…`;err.innerHTML='';try{const b=Object.fromEntries(new FormData(form).entries());const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify(b)});state.connected=true;state.user=d.user;state.campusUrl=d.campusUrl||b.campusUrl;localStorage.setItem('nova-campus-url',state.campusUrl);state.demo=false;state.data={dashboard:null,courses:null,tasks:null,grades:null,schedule:null,calendar:null,messages:null,files:null,tests:null,materials:null,profile:null,view:null,activity:null};toast(`Campus подключён · ${campusHost()}`,'success');navigate('dashboard','',true)}catch(ex){err.innerHTML=`<div class="login-error">${esc(ex.message)}</div>`}finally{btn.disabled=false;btn.innerHTML=`Подключить Campus ${icon('arrow',17)}`}}
function confirmNovaLogout(){
  if(document.querySelector('#nova-logout-modal')) return;

  const root=document.createElement('div');
  root.id='nova-logout-modal';
  root.className='modal-backdrop nova-confirm-backdrop';

  root.innerHTML=`<div class="modal nova-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="nova-logout-title"><div class="nova-confirm-icon">${icon('close',20)}</div><div class="nova-confirm-copy"><span class="eyebrow">СЕАНС CAMPUS</span><h2 id="nova-logout-title">Выйти из Campus?</h2><p>Nova завершит текущую сессию и вернёт тебя на экран входа.</p></div><div class="nova-confirm-actions"><button class="secondary" id="nova-logout-cancel" type="button">Отмена</button><button class="danger-button" id="nova-logout-confirm" type="button">${icon('close',15)} Выйти</button></div></div>`;

  document.body.append(root);

  const close=()=>{
    root.classList.add('is-closing');
    novaFrame(()=>root.remove());
  };

  $('#nova-logout-cancel')?.addEventListener('click',close);

  root.addEventListener('click',e=>{
    if(e.target===root) close();
  });

  $('#nova-logout-confirm')?.addEventListener('click',async e=>{
    const button=e.currentTarget;

    if(button.disabled) return;

    button.disabled=true;
    button.innerHTML=`<span class="spinner small"></span> Выходим…`;

    await logout();
    close();
  });

  const escHandler=e=>{
    if(e.key==='Escape'){
      close();
      document.removeEventListener('keydown',escHandler);
    }
  };

  document.addEventListener('keydown',escHandler);
}

async function logout(){await api('/api/auth/logout',{method:'POST'}).catch(()=>{});Object.assign(state,{connected:false,user:null,demo:false});render();history.replaceState({},'', '/');toast('Campus отключён')}
async function loadDemo(){const d=await api('/api/demo/snapshot');state.demo=true;state.connected=true;state.user={fullname:'Никита'};localStorage.removeItem('nova-demo');state.data.courses=d.courses||[];state.data.calendar={weeks:[],...d.calendar};state.data.grades=(d.grades||[]).flatMap(x=>x.items||[]).map(i=>({name:i.name,grade:i.grade,percentage:i.percentage,range:i.range}));state.data.tasks=[];state.data.messages={conversations:[]};state.data.view=null;state.status.view='idle';state.status.dashboard='success';state.status.courses='success';state.status.calendar='success';state.status.grades='success';state.status.tasks='success';state.status.messages='success';state.status.files='success';state.status.tests='success';state.data.files=[];state.data.tests=[];navigate('dashboard','',true)}
async function loadData(service,force=false,epoch=state.routeEpoch){
  if(!service || (epoch!==state.routeEpoch && state.route!==service)) return;
  const seq=(state.requests[service]||0)+1; state.requests[service]=seq;
  state.status[service]='loading';state.errors[service]=null;render();
  try{
    let d;
    if(service==='dashboard')d=await api('/api/dashboard');
    else if(service==='courses')d=await api('/api/courses');
    else if(service==='tasks')d=await api('/api/tasks');
    else if(service==='grades')d=await api('/api/grades');
    else if(service==='calendar'||service==='schedule')d=await api(`/api/calendar?year=${state.year}&month=${state.month}&day=${state.selectedDay}`);
    else if(service==='messages')d=await api('/api/messages');
    else if(service==='files')d=await api('/api/files');
    else if(service==='tests')d=await api('/api/tests');
    else if(service==='materials')d=await api('/api/materials');
    else if(service==='profile')d=await api('/api/profile');
    else return;
    if(epoch!==state.routeEpoch || state.requests[service]!==seq) return;
    if(service==='dashboard'){state.data.dashboard=d.data||d;state.data.courses=(d.data||d).courses||[];state.data.tasks=(d.data||d).tasks||[];state.data.grades=(d.data||d).grades||[];state.data.calendar=(d.data||d).calendar||{};}
    else if(service==='courses')state.data.courses=d.courses||[];
    else if(service==='grades')state.data.grades=d.courses||d.items||[];
    else if(service==='calendar'||service==='schedule'){state.data.calendar=d.calendar||{};state.data.schedule=d.calendar||{};}
    else state.data[service]=d[service]||d.profile||d;
    state.status[service]='success';render();
    if(service==='messages'&&state.selectedConversation&&state.route==='messages') openConversation(state.selectedConversation);
  }catch(e){
    if(state.requests[service]!==seq) return;
    if(!state.connected) return;
    state.errors[service]=e.message;state.status[service]='error';render();
  }
}
async function loadDashboard(epoch=state.routeEpoch){
  if(!state.connected||epoch!==state.routeEpoch||state.route!=='dashboard')return;
  state.status.dashboard='success'; state.errors.dashboard=null; render();
  await Promise.allSettled([loadData('courses',false,epoch),loadData('calendar',false,epoch),loadData('grades',false,epoch),loadData('tasks',false,epoch)]);
}
async function loadRouteData(force=false,epoch=state.routeEpoch){
  const r=state.route;if(!state.connected||state.demo)return;
  if(r==='dashboard')return loadDashboard(epoch);
  if(r==='courses')return loadData('courses',force,epoch);
  if(r==='course')return loadCourse(force,epoch);
  if(r==='grades')return loadData('grades',force,epoch);
  if(r==='tasks')return loadData('tasks',force,epoch);
  if(r==='calendar')return loadData('calendar',force,epoch);
  if(r==='schedule')return loadData('schedule',force,epoch);
  if(r==='messages')return loadData('messages',force,epoch);
  if(r==='files')return loadData('files',force,epoch);
  if(r==='tests')return loadData('tests',force,epoch);
  if(r==='materials')return loadData('materials',force,epoch);
  if(r==='activity')return loadActivity(false,epoch);
  if(r==='profile')return loadData('profile',force,epoch);
  if(r==='view')return loadView(force,epoch);
}
async function loadCourse(force=false,epoch=state.routeEpoch){
  const id=state.param;if(!id)return;const seq=(state.requests.course||0)+1;state.requests.course=seq;state.status.course='loading';state.errors.course=null;render();
  try{const params=new URLSearchParams({id:String(id)});if(force)params.set('refresh','1');const d=await api(`/api/course?${params.toString()}`);if(epoch!==state.routeEpoch||state.route!=='course'||state.param!==id||state.requests.course!==seq)return;state.data.course=d.course;state.status.course='success';render()}
  catch(e){if(state.requests.course!==seq||!state.connected)return;if(epoch!==state.routeEpoch||state.route!=='course'||state.param!==id)return;state.status.course='error';state.errors.course=e.message;render()}
}

function encodeActivityRef(ref){return btoa(JSON.stringify(ref)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeActivityRef(value){let x=String(value||'').replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';return JSON.parse(atob(x))}
function openActivity(ref){state.routeBeforeActivity=state.route; navigate('activity',encodeActivityRef(ref));}
async function loadActivity(force=false,epoch=state.routeEpoch){
  const seq=(state.requests.activity||0)+1;state.requests.activity=seq;state.status.activity='loading';state.errors.activity=null;state.data.activity=null;render();
  try{const ref=decodeActivityRef(state.param);const q=new URLSearchParams(ref);q.set('action','open');if(force)q.set('refresh','1');const d=await api(`/api/activity?${q}`);if(epoch!==state.routeEpoch||state.requests.activity!==seq||state.route!=='activity')return;if(d.fallback){state.data.activity=d;state.status.activity='success';render();$('#open-activity-fallback')?.addEventListener('click',()=>openCampusPath(d.fallback.url));return;}state.data.activity=d;state.status.activity='success';render();bindCampusContent();}
  catch(e){if(state.requests.activity!==seq||!state.connected)return;if(epoch!==state.routeEpoch||state.route!=='activity')return;state.errors.activity=e.message;state.status.activity='error';render();}
}
async function executeActivityAction(action){
  const current=state.data.activity?.activity; if(!current?.ref)return;
  const form=$('#campus-content form'); const values={};
  if(form){
    const fd=new FormData(form);

    for(const [k,v] of fd.entries()){
      if(typeof v!=='string') continue;

      if(Object.prototype.hasOwnProperty.call(values,k)){
        values[k]=Array.isArray(values[k])
          ? [...values[k],v]
          : [values[k],v];
      }else{
        values[k]=v;
      }
    }
  }

  const fileManager =
    state.data.activity?.result?.form?.fileManager ||
    state.data.activity?.result?.fileManager ||
    null;

  if(
    fileManager?.fieldName &&
    fileManager?.itemid
  ){
    values[fileManager.fieldName]=String(
      fileManager.itemid
    );
  }

  try{
    const d=await api('/api/activity/action',{method:'POST',body:JSON.stringify({ref:current.ref,action,payload:{values}})});
    state.data.activity={activity:d.activity,result:d.result}; state.status.activity='success'; state.errors.activity=null; render(); bindCampusContent();
    const confirmed=d.result?.confirmed;
    if(confirmed===false) toast(action==='submit'?'Campus не подтвердил отправку ответа.':action==='start'?'Campus не подтвердил запуск попытки.':'Campus не подтвердил изменение.','error');
    else if(action==='submit') toast('Ответ отправлен.','success');
    else if(action==='save') toast('Ответ сохранён.','success');
    else if(action==='start') toast('Попытка теста запущена.','success');
    else if(action==='download') toast('Файл скачан.','success');
    else toast('Действие выполнено.','success');
  } catch(e){toast(e.message||'Не удалось выполнить действие.','error');}
}
function selectDay(value){const [y,m,d]=value.split('-').map(Number);state.year=y;state.month=m;state.selectedDay=d;render();loadData('calendar',true)}
function changeMonth(delta){let m=state.month+delta,y=state.year;if(m<1){m=12;y--}if(m>12){m=1;y++}state.year=y;state.month=m;const days=new Date(y,m,0).getDate();state.selectedDay=Math.min(state.selectedDay,days);render();loadData('calendar',true)}
function normalizePath(p){let x=String(p||'');if(/^https?:\/\//i.test(x)){try{const u=new URL(x);if(!campusOrigin()||u.origin!==campusOrigin())return null;x=u.pathname+u.search+u.hash}catch{return null}}if(x.startsWith('/campus/'))x=x.slice(7);if(!x.startsWith('/'))x='/'+x;return x}
function isFile(p){return /\/(?:pluginfile|tokenpluginfile|webservice\/pluginfile|draftfile)\.php(?:\/|$)/i.test(p)||/\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(p)}
function openCampusPath(p){const x=normalizePath(p);if(!x){window.open(p,'_blank','noopener,noreferrer');return}if(isFile(x)){downloadCampus(x);return}if(x.startsWith('/course/view.php')){const id=new URL(x,campusOrigin()||location.origin).searchParams.get('id');if(id)return navigate('course',id)}if(x.startsWith('/login/index.php')){toast('Сессия Campus закончилась','error');return navigate('profile')}navigate('view',x)}
async function downloadCampus(path,filename=''){
  const x=normalizePath(path); if(!x){toast('Файл недоступен','error');return;}
  const q=new URLSearchParams({path:x}); if(filename)q.set('filename',filename);
  try{
    const r=await fetch(`/api/download?${q}`,{credentials:'same-origin'});
    if(r.status===401){expireLocalSession();throw new Error('Сессия Campus закончилась. Подключите Campus заново.');}
    const ct=r.headers.get('content-type')||'';
    if(!r.ok || /application\/json/i.test(ct)){const d=await r.json().catch(()=>null);throw new Error(d?.error||`Не удалось скачать файл (${r.status}).`);}
    const blob=await r.blob(); if(!blob.size)throw new Error('Campus вернул пустой файл.');
    let name=filename||'campus-file'; const cd=r.headers.get('content-disposition')||''; const m=cd.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^;\"]+)/i); if(m){try{name=decodeURIComponent(m[1]||m[2]||name)}catch{name=m[2]||name}}
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); toast('Файл скачан','success');
  }catch(e){toast(e?.message||'Не удалось скачать файл.','error')}
}

async function loadView(force=false,epoch=state.routeEpoch){
  const p=state.param||'/my/';const seq=(state.requests.view||0)+1;state.requests.view=seq;state.status.view='loading';state.errors.view=null;state.data.view=null;render();
  try{
    const key=`page:${p}`;let data=!force&&state.pageCache.get(key);
    if(!data)data=(await api(`/api/page?path=${encodeURIComponent(p)}`)).page;
    if(epoch!==state.routeEpoch||state.route!=='view'||state.param!==p||state.requests.view!==seq)return;
    state.pageCache.set(key,data);state.data.view=data;state.status.view='success';render();
    const target=$('#campus-content');if(!target)return;
    if(data.kind==='file'){
      target.innerHTML=`<div class="file-download"><span class="file-big">${icon('download',30)}</span><div><div class="eyebrow">ФАЙЛ</div><h2>${esc(data.filename||data.title||'Файл')}</h2><p>Оригинальный файл Campus готов к скачиванию.</p><button class="primary" id="download-view-file">${icon('download',17)} Скачать файл</button></div></div>`;
      $('#download-view-file')?.addEventListener('click',()=>downloadCampus(data.path,data.filename));return;
    }
    if(data.kind==='resource'&&data.downloadPath){
      target.innerHTML=`<div class="file-download"><span class="file-big">${icon('download',30)}</span><div><div class="eyebrow">МАТЕРИАЛ</div><h2>${esc(data.title||'Файл')}</h2><p>Nova не показывает бинарный PDF как текст. Скачивается оригинальный файл из Campus.</p><button class="primary" id="download-resource">${icon('download',17)} Скачать файл</button></div></div>`;
      $('#download-resource')?.addEventListener('click',()=>downloadCampus(data.downloadPath));return;
    }
    target.innerHTML=data.html||'<div class="inline-empty">Материал пуст.</div>';bindCampusContent();
  }catch(e){if(state.requests.view!==seq||!state.connected)return;if(epoch!==state.routeEpoch||state.route!=='view'||state.param!==p)return;state.errors.view=e.message;state.status.view='error';render();}
}

async function uploadAssignmentFiles(files) {
  const list = $('#assignment-upload-list');
  const status = $('#assignment-upload-status');

  const ref = state.data.activity?.activity?.ref;

  if (!ref?.courseId || (!ref.cmid && !ref.instance)) {
    toast('Не удалось определить задание.', 'error');
    return;
  }

  const selected = [...files || []];

  if (!selected.length) return;

  for (const file of selected) {
    const row = document.createElement('div');

    row.className = 'nova-upload-item nova-uploading';

    row.innerHTML = `
      <span class="nova-upload-item-icon">
        ${icon('file',18)}
      </span>

      <span class="nova-upload-item-info">
        <b>${esc(file.name)}</b>
        <small>${formatFileSize(file.size)} · загрузка…</small>
      </span>

      <span class="nova-upload-item-state">
        ${icon('spinner',16)}
      </span>
    `;

    list?.appendChild(row);

    try {
      const body = new FormData();

      body.set(
        'ref',
        JSON.stringify(ref)
      );

      body.set(
        'file',
        file,
        file.name
      );

      const response = await fetch(
        '/api/activity/upload',
        {
          method:'POST',
          body,
          credentials:'same-origin'
        }
      );

      const data =
        await response.json().catch(() => null);

      if(!response.ok || !data?.ok){
        throw new Error(
          data?.error ||
          `Не удалось загрузить ${file.name}.`
        );
      }

      const result = data.result || {};

      const manager =
        result.fileManager ||
        result.form?.fileManager ||
        null;

      if(manager){
        state.data.activity.result ||= {};

        state.data.activity.result.form ||= {};

        state.data.activity.result.form.fileManager =
          manager;

        state.data.activity.result.fileManager =
          manager;
      }

      state.data.activity.result ||= {};

      state.data.activity.result.uploadedFiles ||= [];

      state.data.activity.result.uploadedFiles.push(
        result.file || {
          filename:file.name,
          filesize:file.size,
          mimetype:file.type
        }
      );

      row.classList.remove('nova-uploading');
      row.classList.add('nova-uploaded');

      row.querySelector('.nova-upload-item-info small')
        .textContent =
          `${formatFileSize(file.size)} · загружено`;

      row.querySelector('.nova-upload-item-state')
        .innerHTML =
          icon('check',17);

      status.textContent =
        'Файл добавлен в черновик Campus.';

      toast(
        `${file.name} загружен.`,
        'success'
      );

    } catch(error) {
      row.classList.remove('nova-uploading');
      row.classList.add('nova-upload-error');

      row.querySelector('.nova-upload-item-info small')
        .textContent =
          error.message || 'Ошибка загрузки';

      row.querySelector('.nova-upload-item-state')
        .innerHTML =
          icon('x',17);

      toast(
        error.message || 'Не удалось загрузить файл.',
        'error'
      );
    }
  }
}

function bindAssignmentUploader() {
  const input = $('#assignment-file-input');
  const choose = $('#assignment-choose-files');
  const zone = $('#assignment-upload-zone');

  if(!input || !choose || !zone) return;

  if(!choose.dataset.bound){
    choose.dataset.bound='1';

    choose.addEventListener(
      'click',
      ()=>input.click()
    );
  }

  if(!input.dataset.bound){
    input.dataset.bound='1';

    input.addEventListener(
      'change',
      ()=>{
        uploadAssignmentFiles(input.files);
        input.value='';
      }
    );
  }

  if(!zone.dataset.dropBound){
    zone.dataset.dropBound='1';

    zone.addEventListener(
      'dragover',
      e=>{
        e.preventDefault();
        zone.classList.add('dragover');
      }
    );

    zone.addEventListener(
      'dragleave',
      ()=>{
        zone.classList.remove('dragover');
      }
    );

    zone.addEventListener(
      'drop',
      e=>{
        e.preventDefault();
        zone.classList.remove('dragover');
        uploadAssignmentFiles(e.dataTransfer.files);
      }
    );
  }
}

function bindCampusContent(){
  const root = $('#campus-content');
  if(!root) return;

  // Files
  $$('[href],[src]',root).forEach(el=>{
    const attr = el.hasAttribute('href') ? 'href' : 'src';
    const raw = el.getAttribute(attr);
    const x = normalizePath(raw);

    if(!x) return;

    if(
      isFile(x) ||
      (attr==='src' && /\/pluginfile\.php/i.test(x))
    ){
      el.addEventListener('click',e=>{
        e.preventDefault();
        downloadCampus(x);
      });

      if(attr==='href') el.setAttribute('href','#');
      return;
    }

    el.addEventListener('click',e=>{
      const t=e.target.closest('a');
      if(!t || e.defaultPrevented) return;

      e.preventDefault();
      openCampusPath(x);
    });
  });

  // Explicit Nova forms
  $$('form[data-nova-form]',root).forEach(form=>{
    if(form.dataset.novaBound) return;
    form.dataset.novaBound='1';
    form.addEventListener('submit',handleCampusForm);
  });

  // Activity forms
  if(state.route==='activity'){
    $$('form',root).forEach(form=>{
      if(form.dataset.novaBound) return;
      form.dataset.novaBound='1';

      form.addEventListener('submit',e=>{
        e.preventDefault();

        const submitter=e.submitter;
        const label=
          `${submitter?.name||''} ${submitter?.value||''}`
            .toLowerCase();

        if(/cancel|отмена/.test(label)) return;

        const kind=String(
          state.data.activity?.result?.kind||''
        );

        // Quiz start and quiz attempt forms are both routed
        // through Nova's Campus proxy.
        if(
          kind==='quiz' ||
          kind==='quiz-action'
        ){
          handleCampusForm(e);
          return;
        }

        if(kind==='assignment-form'){
          if(
            /submit|отправ|сдать/.test(label)
          ){
            executeActivityAction('submit');
          } else {
            executeActivityAction('save');
          }
        }
      });
    });
  }

  $$('[data-activity-action]').forEach(el=>{
    if(el.dataset.novaBound) return;
    el.dataset.novaBound='1';

    el.addEventListener(
      'click',
      ()=>executeActivityAction(
        el.dataset.activityAction
      )
    );
  });

  bindQuizStart();

  if(
    state.route==='activity' &&
    state.data.activity?.result?.kind==='assignment-form'
  ){
    bindAssignmentUploader();
  }
}

async function handleCampusForm(e){
  e.preventDefault();

  const form=e.currentTarget;
  const action=normalizePath(
    form.getAttribute('action') || state.param
  );

  const method=(
    form.getAttribute('method') || 'POST'
  ).toUpperCase();

  if(!action){
    return toast(
      'Не удалось определить действие Campus.',
      'error'
    );
  }

  if(method!=='POST'){
    return openCampusPath(action);
  }

  const fd=new FormData(form);

  const hasFile=[...fd.values()].some(
    v =>
      typeof File!=='undefined' &&
      v instanceof File &&
      v.size>0
  );

  let body;
  const headers={};

  if(
    hasFile ||
    /multipart\/form-data/i.test(form.enctype||'')
  ){
    if(
      e.submitter?.name &&
      !fd.has(e.submitter.name)
    ){
      fd.append(
        e.submitter.name,
        e.submitter.value||''
      );
    }

    body=fd;
  } else {
    body=new URLSearchParams();

    for(const [k,v] of fd.entries()){
      body.append(k,String(v));
    }

    if(
      e.submitter?.name &&
      !fd.has(e.submitter.name)
    ){
      body.append(
        e.submitter.name,
        e.submitter.value||''
      );
    }

    headers['content-type'] =
      'application/x-www-form-urlencoded';
  }

  try{
    const d=await api(
      `/api/campus/action?path=${encodeURIComponent(action)}`,
      {
        method:'POST',
        headers,
        body
      }
    );

    if(d.downloadPath){
      downloadCampus(
        d.downloadPath,
        d.filename
      );
      return;
    }

    if(d.page){
      /*
       * Activity forms stay inside Nova.
       * We replace only the activity payload with the new
       * Campus response instead of navigating to /view.
       */
      if(state.route==='activity'){
        const current=state.data.activity||{};
        const previous=current.result||{};

        let kind=previous.kind||'activity';

        if(
          /startattempt\.php/i.test(action) ||
          kind==='quiz'
        ){
          kind='quiz-action';
        }

        state.data.activity={
          activity:current.activity,
          result:{
            ...previous,
            kind,
            title:d.page.title||previous.title||current.activity?.identity?.name||'Активность',
            html:d.page.html||'',
            redirectedPath:d.page.path||d.redirectedPath||null
          }
        };

        state.status.activity='success';
        state.errors.activity=null;

        render();
        bindCampusContent();

        toast(
          kind==='quiz-action'
            ? 'Тест запущен.'
            : 'Действие выполнено.',
          'success'
        );

        return;
      }

      state.pageCache.set(
        `page:${d.page.path||action}`,
        d.page
      );

      render();
      loadView(true);

      toast(
        d.success===false
          ? 'Campus не подтвердил действие.'
          : 'Действие выполнено',
        'success'
      );
    }
  } catch(ex){
    toast(
      ex.message ||
      'Не удалось выполнить действие.',
      'error'
    );
  }
}

async function openConversation(id){
  state.selectedConversation=id;render();const view=$('#conversation-view');if(!view)return;const seq=(state.requests.conversation||0)+1;state.requests.conversation=seq;
  try{const d=await api(`/api/messages/conversation?id=${encodeURIComponent(id)}`);if(state.requests.conversation!==seq||state.route!=='messages'||String(state.selectedConversation)!==String(id))return;view.innerHTML=conversationMarkup(d.conversation);bindMessageForm()}
  catch(e){if(state.requests.conversation!==seq)return;view.innerHTML=statePanel('error','messages',false);}
}
function conversationMarkup(c){const msgs=[...(c?.messages||[])].sort((a,b)=>Number(a.timecreated||0)-Number(b.timecreated||0));const title=c?.name||c?.members?.find?.(m=>String(m.id)!==String(state.user?.id))?.fullname||'Диалог';return `<div class="conversation"><div class="conversation-head"><span class="avatar large">${esc(title.slice(0,1))}</span><div><h2>${esc(title)}</h2><p>${msgs.length} ${msgs.length===1?'сообщение':'сообщений'}</p></div></div><div class="conversation-body">${msgs.map(m=>`<div class="bubble ${String(m.userid||m.user?.id)===String(state.user?.id)?'mine':''}"><p>${esc(text(m.text||m.message||''))}</p><small>${m.timecreated?formatLong(m.timecreated)+' · '+formatTime(m.timecreated):''}</small></div>`).join('')||'<div class="inline-empty">История переписки пуста.</div>'}</div><form id="message-form" class="message-form"><textarea name="text" rows="1" required placeholder="Написать сообщение…"></textarea><button class="primary" type="submit" title="Отправить">${icon('send',18)}</button></form></div>`}
function bindMessageForm(){$('#message-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const btn=form.querySelector('button');const tx=form.querySelector('textarea');const value=tx.value.trim();if(!value)return;btn.disabled=true;try{await api('/api/messages/send',{method:'POST',body:JSON.stringify({conversationId:state.selectedConversation,text:value})});tx.value='';await openConversation(state.selectedConversation);toast('Сообщение отправлено','success')}catch(ex){toast(ex.message,'error')}finally{btn.disabled=false}})}
window.addEventListener('popstate',()=>{
  state.routeEpoch++;
  parseRoute();
  render(true);
  loadRouteData(false,state.routeEpoch);
});window.addEventListener('error',e=>console.error('[Nova]',e.error||e.message));window.addEventListener('unhandledrejection',e=>console.error('[Nova]',e.reason));
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#global-search')?.focus()}});
document.addEventListener('click',e=>{
  const openProfile=document.querySelector('.profile-menu.open');

  if(openProfile && !openProfile.contains(e.target)){
    openProfile.classList.remove('open');
    document.querySelector('#profile-menu-trigger')?.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  const target=e.target?.closest?.('a[data-go]');
  if(!target || !target.isConnected || e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const route=target.dataset.go||''; const param=target.dataset.param||'';
  e.preventDefault();
  try{ navigate(route==='course'?'course':route,param); }
  catch(error){ console.error('[Nova][NavigationFallback]',{route,param,error}); const href=target.getAttribute('href'); if(href) window.location.assign(href); }
});

document.addEventListener('pointerdown',e=>{
  const target=e.target?.closest?.(
    'button,.primary,.secondary,.nav-item,.metric,.course-card,.task-card,.test-card,.activity,.mini-course,.file-row,.panel-action,.quick-actions button'
  );

  if(!target || target.disabled) return;

  target.classList.remove('nova-press');

  novaFrame(()=>{
    target.classList.add('nova-press');
  });
});

document.addEventListener('animationend',e=>{
  if(e.animationName==='novaPress'){
    e.target.classList.remove('nova-press');
  }
});

/* NOVA_FORCE_DASHBOARD_HOME_OVERRIDES START */
function injectDashboardHomeOverrides(){
  if(
    typeof document.getElementById!=='function'
  ){
    return;
  }

  if(
    document.getElementById(
      'nova-force-dashboard-home'
    )
  ){
    return;
  }

  const style=document.createElement('style');
  style.id='nova-force-dashboard-home';

  style.textContent=`
    /* =====================================================
       NOVA HOME / CALENDAR
       ===================================================== */

    .calendar-mini .mini-grid .day,
    .calendar-mini .mini-grid .day.today,
    .calendar-mini .mini-grid .day.selected,
    .calendar-mini .mini-grid .day.today.selected{
      border:0 !important;
      outline:0 !important;
      box-shadow:none !important;
      background:transparent !important;
      transform:none !important;
      padding:0 !important;
    }

    .calendar-mini .mini-grid .day:hover,
    .calendar-mini .mini-grid .day.today:hover,
    .calendar-mini .mini-grid .day.selected:hover,
    .calendar-mini .mini-grid .day.today.selected:hover{
      border:0 !important;
      outline:0 !important;
      box-shadow:none !important;
      background:color-mix(in srgb,var(--accent) 6%,var(--surface-2)) !important;
    }

    .calendar-mini .mini-grid .day:focus,
    .calendar-mini .mini-grid .day:focus-visible{
      border:0 !important;
      outline:0 !important;
      box-shadow:none !important;
    }

    .calendar-mini .mini-grid .day:focus-visible .day-number,
    .calendar-mini .mini-grid .day:focus .day-number{
      outline:0 !important;
    }

    .calendar-mini .mini-grid .day-number{
      width:28px !important;
      height:28px !important;
      margin:0 !important;
      padding:0 !important;
      display:grid !important;
      place-items:center !important;
      box-sizing:border-box !important;
      border:0 !important;
      outline:0 !important;
      border-radius:10px !important;
      line-height:1 !important;
      font-size:10px !important;
      font-weight:850 !important;
      font-variant-numeric:tabular-nums !important;
      text-align:center !important;
      transform:none !important;
      background:transparent !important;
      box-shadow:none !important;
    }

    .calendar-mini .mini-grid .day.today:not(.selected) .day-number{
      color:var(--accent) !important;
      background:color-mix(in srgb,var(--accent) 9%,transparent) !important;
      box-shadow:
        inset 0 0 0 1px color-mix(
          in srgb,
          var(--accent) 32%,
          transparent
        ) !important;
    }

    .calendar-mini .mini-grid .day.selected .day-number,
    .calendar-mini .mini-grid .day.today.selected .day-number{
      color:#fff !important;
      background:var(--accent) !important;
      box-shadow:
        0 7px 18px color-mix(
          in srgb,
          var(--accent) 25%,
          transparent
        ),
        inset 0 0 0 1px rgba(255,255,255,.16) !important;
    }

    .calendar-mini .mini-grid .day-dots{
      bottom:2px !important;
      z-index:4 !important;
    }

    .calendar-mini .mini-grid .day-empty{
      visibility:hidden !important;
      border:0 !important;
      background:transparent !important;
    }

    .calendar-mini .mini-weekdays{
      display:grid !important;
      grid-template-columns:repeat(7,minmax(0,1fr)) !important;
      gap:3px !important;
      margin:0 0 6px !important;
      padding:0 1px !important;
    }

    .calendar-mini .mini-weekdays span{
      height:20px !important;
      display:grid !important;
      place-items:center !important;
      text-align:center !important;
      font-size:8px !important;
      line-height:1 !important;
      font-weight:850 !important;
      letter-spacing:.05em !important;
      white-space:nowrap !important;
    }

    /* =====================================================
       NOVA HOME / QUICK ACTIONS
       ===================================================== */

    .quick-actions{
      display:grid !important;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:9px !important;
      margin-top:5px !important;
    }

    .quick-action{
      position:relative !important;
      min-width:0 !important;
      min-height:86px !important;
      padding:12px 34px 12px 12px !important;
      display:grid !important;
      grid-template-columns:38px minmax(0,1fr) !important;
      align-items:center !important;
      gap:10px !important;

      border:1px solid var(--line) !important;
      border-radius:17px !important;

      background:
        radial-gradient(
          circle at 100% 100%,
          color-mix(in srgb,var(--accent) 9%,transparent),
          transparent 38%
        ),
        linear-gradient(
          145deg,
          var(--surface),
          var(--surface-2)
        ) !important;

      color:var(--text) !important;
      text-align:left !important;
      cursor:pointer !important;
      overflow:hidden !important;

      box-shadow:
        0 8px 24px rgba(0,0,0,.055),
        inset 0 1px 0 rgba(255,255,255,.025) !important;

      transition:
        transform .24s cubic-bezier(.2,.75,.25,1),
        border-color .24s ease,
        box-shadow .24s ease,
        background .24s ease !important;
    }

    .quick-action:before{
      content:"" !important;
      position:absolute !important;
      inset:-1px !important;
      pointer-events:none !important;
      background:
        linear-gradient(
          120deg,
          transparent 20%,
          rgba(255,255,255,.055) 48%,
          transparent 72%
        );
      transform:translateX(-120%) !important;
      transition:transform .7s ease !important;
    }

    .quick-action:hover{
      transform:translateY(-4px) scale(1.012) !important;
      border-color:color-mix(
        in srgb,
        var(--accent) 34%,
        var(--line)
      ) !important;

      background:
        radial-gradient(
          circle at 75% 25%,
          color-mix(in srgb,var(--accent) 8%,transparent),
          transparent 40%
        ),
        var(--surface) !important;

      box-shadow:
        0 17px 35px rgba(0,0,0,.12),
        0 0 0 1px color-mix(
          in srgb,
          var(--accent) 5%,
          transparent
        ) !important;
    }

    .quick-action:hover:before{
      transform:translateX(120%) !important;
    }

    .quick-action:active{
      transform:translateY(-1px) scale(.985) !important;
    }

    .quick-action-icon{
      width:38px !important;
      height:38px !important;
      display:grid !important;
      place-items:center !important;
      border-radius:12px !important;

      background:color-mix(
        in srgb,
        var(--accent) 10%,
        var(--surface-3)
      ) !important;

      border:1px solid color-mix(
        in srgb,
        var(--accent) 19%,
        var(--line)
      ) !important;

      color:var(--accent) !important;

      transition:
        transform .22s ease,
        background .22s ease,
        box-shadow .22s ease !important;
    }

    .quick-action:hover .quick-action-icon{
      transform:scale(1.07) rotate(-3deg) !important;

      background:color-mix(
        in srgb,
        var(--accent) 16%,
        var(--surface-3)
      ) !important;

      box-shadow:
        0 8px 20px color-mix(
          in srgb,
          var(--accent) 16%,
          transparent
        ) !important;
    }

    .quick-action-copy{
      min-width:0 !important;
      display:grid !important;
      gap:4px !important;
      z-index:2 !important;
    }

    .quick-action-copy b{
      font-size:11.5px !important;
      line-height:1.05 !important;
      font-weight:850 !important;
      color:var(--text) !important;
      white-space:nowrap !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
    }

    .quick-action-copy small{
      font-size:8.5px !important;
      line-height:1.2 !important;
      color:var(--muted) !important;
      white-space:nowrap !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
    }

    .quick-action-arrow{
      position:absolute !important;
      top:10px !important;
      right:10px !important;
      width:24px !important;
      height:24px !important;

      display:grid !important;
      place-items:center !important;

      border:1px solid var(--line) !important;
      border-radius:8px !important;

      background:var(--surface-2) !important;
      color:var(--muted) !important;

      transition:
        transform .23s ease,
        color .23s ease,
        border-color .23s ease,
        background .23s ease !important;
    }

    .quick-action:hover .quick-action-arrow{
      transform:translate(3px,-3px) !important;
      color:var(--accent) !important;

      border-color:color-mix(
        in srgb,
        var(--accent) 30%,
        var(--line)
      ) !important;

      background:color-mix(
        in srgb,
        var(--accent) 8%,
        var(--surface)
      ) !important;
    }

    /* =====================================================
       NOVA HOME / MAIN CTA
       ===================================================== */

    .quote-card{
      position:relative !important;
      width:100% !important;
      min-height:190px !important;

      padding:17px 18px 16px !important;

      display:grid !important;
      grid-template-rows:auto 1fr auto !important;
      gap:10px !important;

      border:1px solid rgba(255,255,255,.12) !important;
      border-radius:22px !important;

      background:
        radial-gradient(
          circle at 90% 8%,
          rgba(24,183,255,.25),
          transparent 28%
        ),
        radial-gradient(
          circle at 5% 105%,
          rgba(101,111,255,.16),
          transparent 31%
        ),
        linear-gradient(
          145deg,
          #09121d 0%,
          #0c1d2b 55%,
          #08141f 100%
        ) !important;

      color:#fff !important;
      text-align:left !important;
      cursor:pointer !important;

      overflow:hidden !important;
      isolation:isolate !important;

      box-shadow:
        0 18px 46px rgba(0,0,0,.20),
        inset 0 1px 0 rgba(255,255,255,.075) !important;

      transition:
        transform .28s cubic-bezier(.2,.75,.25,1),
        border-color .28s ease,
        box-shadow .28s ease,
        filter .28s ease !important;
    }

    .quote-card:before{
      content:"" !important;
      position:absolute !important;
      inset:0 !important;
      pointer-events:none !important;
      z-index:0 !important;

      background:
        linear-gradient(
          115deg,
          transparent 20%,
          rgba(255,255,255,.055) 48%,
          transparent 72%
        );

      transform:translateX(-125%) !important;
      transition:transform .8s ease !important;
    }

    .quote-card:hover{
      transform:translateY(-6px) !important;

      border-color:rgba(42,198,255,.44) !important;

      box-shadow:
        0 29px 66px rgba(0,0,0,.29),
        0 0 0 1px rgba(42,198,255,.06),
        0 0 46px rgba(24,183,255,.09) !important;

      filter:saturate(1.04) !important;
    }

    .quote-card:hover:before{
      transform:translateX(125%) !important;
    }

    .quote-card:active{
      transform:translateY(-2px) scale(.993) !important;
    }

    .quote-card:focus-visible{
      outline:2px solid rgba(42,198,255,.62) !important;
      outline-offset:3px !important;
    }

    .quote-card-glow{
      position:absolute !important;
      width:180px !important;
      height:180px !important;
      right:-75px !important;
      top:-80px !important;
      border-radius:50% !important;
      pointer-events:none !important;
      z-index:0 !important;

      background:rgba(24,183,255,.10) !important;
      filter:blur(2px) !important;
    }

    .quote-card-orb{
      position:absolute !important;
      border-radius:50% !important;
      pointer-events:none !important;
      z-index:0 !important;
    }

    .quote-card-orb-a{
      width:120px !important;
      height:120px !important;
      right:-50px !important;
      top:-46px !important;
      background:rgba(24,183,255,.13) !important;
    }

    .quote-card-orb-b{
      width:92px !important;
      height:92px !important;
      left:-48px !important;
      bottom:-55px !important;
      background:rgba(95,141,255,.11) !important;
    }

    .quote-card-head,
    .quote-card-copy,
    .quote-card-footer{
      position:relative !important;
      z-index:2 !important;
    }

    .quote-card-head{
      display:flex !important;
      align-items:center !important;
      justify-content:space-between !important;
      gap:9px !important;
    }

    .quote-card-kicker{
      display:inline-flex !important;
      align-items:center !important;
      gap:5px !important;

      color:rgba(168,221,255,.92) !important;
      font-size:8px !important;
      font-weight:850 !important;
      letter-spacing:.13em !important;
    }

    .quote-card-status{
      padding:5px 8px !important;
      border:1px solid rgba(255,255,255,.11) !important;
      border-radius:999px !important;
      background:rgba(255,255,255,.055) !important;

      color:rgba(255,255,255,.62) !important;
      font-size:7.5px !important;
      font-weight:800 !important;
    }

    .quote-card-copy{
      display:grid !important;
      align-content:center !important;
      gap:7px !important;
    }

    .quote-card-copy b{
      margin:0 !important;
      color:#fff !important;
      font-size:20px !important;
      line-height:1.02 !important;
      letter-spacing:-.048em !important;
      font-weight:850 !important;
    }

    .quote-card-copy b em{
      color:#9fe0ff !important;
      font-style:normal !important;
    }

    .quote-card-copy small{
      max-width:285px !important;
      margin:0 !important;
      color:rgba(255,255,255,.50) !important;
      font-size:9.5px !important;
      line-height:1.45 !important;
    }

    .quote-card-footer{
      display:flex !important;
      align-items:center !important;
      justify-content:space-between !important;
      gap:10px !important;
    }

    .quote-card-link{
      display:grid !important;
      gap:2px !important;
      color:rgba(255,255,255,.92) !important;
      font-size:10px !important;
      font-weight:850 !important;
    }

    .quote-card-link small{
      color:rgba(255,255,255,.42) !important;
      font-size:7.5px !important;
      font-weight:700 !important;
    }

    .quote-card-action{
      width:44px !important;
      height:44px !important;
      flex:0 0 44px !important;

      display:grid !important;
      place-items:center !important;

      border:1px solid rgba(255,255,255,.16) !important;
      border-radius:14px !important;

      background:rgba(255,255,255,.065) !important;
      color:#fff !important;

      backdrop-filter:blur(12px) !important;
      -webkit-backdrop-filter:blur(12px) !important;

      transition:
        transform .28s cubic-bezier(.2,.75,.25,1),
        background .28s ease,
        border-color .28s ease,
        box-shadow .28s ease !important;
    }

    .quote-card:hover .quote-card-action{
      transform:translate(5px,-5px) scale(1.08) !important;

      background:rgba(24,183,255,.16) !important;
      border-color:rgba(42,198,255,.38) !important;

      box-shadow:
        0 12px 26px rgba(24,183,255,.15) !important;
    }

    @media(max-width:760px){
      .quick-action{
        min-height:78px !important;
        padding-right:30px !important;
      }

      .calendar-mini .mini-weekdays span{
        font-size:7.6px !important;
      }

      .calendar-mini .mini-grid .day-number{
        width:26px !important;
        height:26px !important;
      }

      .quote-card{
        min-height:174px !important;
      }
    }

    @media(prefers-reduced-motion:reduce){
      .quick-action,
      .quick-action:before,
      .quick-action-icon,
      .quick-action-arrow,
      .quote-card,
      .quote-card:before,
      .quote-card-action{
        transition:none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* NOVA_FORCE_DASHBOARD_HOME_OVERRIDES END */


/* NOVA_INTERACTION_SYSTEM_2026 START */

function enhanceNovaInteractions(root=document){

  const selectors=[
    '.nav-item',
    '.theme-row',
    '.primary',
    '.secondary',
    '.icon-btn',
    '.metric',
    '.course-card',
    '.task-card',
    '.test-card',
    '.schedule-card',
    '.activity',
    '.event-card',
    '.material-card',
    '.mini-course',
    '.compact-row',
    '.conversation-item',
    '.course-group',
    '.file-row-main',
    '.nova-file-main',
    '.nova-file-open',
    '.nova-practice-file-action',
    '.nova-source-file',
    '.panel-action',
    '.quick-action',
    '.quote-card',
    '.back-button',
    '.view-toggle button'
  ];

  root.querySelectorAll(selectors.join(',')).forEach(el=>{

    if(
      el.classList.contains('nova-interactive-surface') &&
      el.querySelector(':scope > .nova-sheen')
    ){
      return;
    }

    el.classList.add('nova-interactive-surface');

    const glow=document.createElement('span');
    glow.className='nova-cursor-glow';
    glow.setAttribute('aria-hidden','true');

    const sheen=document.createElement('span');
    sheen.className='nova-sheen';
    sheen.setAttribute('aria-hidden','true');

    el.append(glow,sheen);
  });
}

/*
 * Track the pointer inside Nova interactive surfaces.
 * This is intentionally delegated so dynamically rendered
 * pages get the same behavior without extra binding logic.
 */
document.addEventListener('pointermove',e=>{
  const surface=e.target?.closest?.('.nova-interactive-surface');
  if(!surface) return;

  const r=surface.getBoundingClientRect();

  if(!r.width || !r.height) return;

  const x=((e.clientX-r.left)/r.width)*100;
  const y=((e.clientY-r.top)/r.height)*100;

  surface.style.setProperty('--nova-mx',`${x}%`);
  surface.style.setProperty('--nova-my',`${y}%`);
});

/*
 * Automatically decorate every newly rendered Nova page.
 */
if(
  typeof MutationObserver!=='undefined' &&
  !window.__novaInteractionObserver
){
  window.__novaInteractionObserver=
    new MutationObserver(()=>{
      requestAnimationFrame(()=>{
        enhanceNovaInteractions(document);
      });
    });

  window.__novaInteractionObserver.observe(
    document.body,
    {
      childList:true,
      subtree:true
    }
  );
}

/* Initial pass */
enhanceNovaInteractions(document);

/* NOVA_INTERACTION_SYSTEM_2026 END */

/* NOVA_CALENDAR_INLINE_FINAL_20260919 */

function injectNovaCalendarInlineStyles(){
  if(
    typeof document==='undefined' ||
    !document.head ||
    typeof document.createElement!=='function'
  ){
    return;
  }

  if(
    typeof document.getElementById==='function' &&
    document.getElementById('nova-calendar-inline-final')
  ){
    return;
  }

  const style=document.createElement('style');
  style.id='nova-calendar-inline-final';

  style.textContent=`

    /* =====================================================
       NOVA FULL CALENDAR FINAL
       ===================================================== */

    .calendar-page{
      position:relative !important;
    }

    /* header controls */

    .calendar-page .calendar-actions{
      display:flex !important;
      align-items:center !important;
      gap:8px !important;
    }

    .calendar-page .calendar-nav-btn{
      width:42px !important;
      height:42px !important;
      min-width:42px !important;
      min-height:42px !important;

      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;

      padding:0 !important;
      line-height:0 !important;
    }

    .calendar-page .calendar-today-btn{
      height:42px !important;
      min-height:42px !important;

      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;

      gap:7px !important;
    }

    /* =====================================================
       OVERVIEW
       ===================================================== */

    .calendar-page .calendar-overview{
      display:flex !important;
      align-items:center !important;
      justify-content:space-between !important;
      gap:18px !important;

      width:100% !important;
      min-height:72px !important;

      box-sizing:border-box !important;

      margin:0 0 16px !important;
      padding:13px 16px !important;

      border:1px solid var(--line) !important;
      border-radius:18px !important;

      background:var(--surface) !important;

      box-shadow:
        0 12px 32px rgba(0,0,0,.07) !important;
    }

    .calendar-page .calendar-overview-date{
      display:flex !important;
      align-items:center !important;
      gap:11px !important;
      min-width:0 !important;
    }

    .calendar-page .calendar-overview-icon{
      width:42px !important;
      height:42px !important;
      min-width:42px !important;

      display:grid !important;
      place-items:center !important;

      border-radius:12px !important;

      background:rgba(24,183,255,.09) !important;
      color:var(--accent) !important;
    }

    .calendar-page .calendar-overview-date span{
      display:block !important;

      color:var(--muted-2) !important;
      font-size:7px !important;
      font-weight:850 !important;

      letter-spacing:.12em !important;
      text-transform:uppercase !important;
    }

    .calendar-page .calendar-overview-date b{
      display:block !important;

      margin-top:3px !important;

      color:var(--text) !important;

      font-size:13px !important;
      font-weight:850 !important;
      line-height:1.15 !important;
    }

    .calendar-page .calendar-overview-date small{
      display:block !important;

      margin-top:3px !important;

      color:var(--muted) !important;
      font-size:8px !important;
    }

    .calendar-page .calendar-overview-stats{
      display:flex !important;
      align-items:center !important;
      gap:7px !important;
    }

    .calendar-page .calendar-stat{
      min-width:76px !important;

      display:grid !important;
      gap:4px !important;

      padding:8px 10px !important;

      border:1px solid var(--line) !important;
      border-radius:11px !important;

      background:var(--surface-2) !important;
    }

    .calendar-page .calendar-stat b{
      color:var(--text) !important;
      font-size:14px !important;
      font-weight:850 !important;
      line-height:1 !important;
    }

    .calendar-page .calendar-stat span{
      color:var(--muted) !important;
      font-size:7px !important;
    }

    .calendar-page .calendar-stat.task b{
      color:var(--warn) !important;
    }

    .calendar-page .calendar-stat.quiz b{
      color:var(--purple) !important;
    }

    /* =====================================================
       LAYOUT
       ===================================================== */

    .calendar-page .calendar-layout{
      display:grid !important;

      grid-template-columns:
        minmax(0,1fr)
        350px !important;

      gap:16px !important;
      align-items:start !important;
      width:100% !important;
    }

    .calendar-page .calendar-card,
    .calendar-page .events-card{
      min-width:0 !important;

      box-sizing:border-box !important;

      border:1px solid var(--line) !important;
      border-radius:22px !important;

      background:var(--surface) !important;

      overflow:hidden !important;

      box-shadow:
        0 14px 44px rgba(0,0,0,.075) !important;
    }

    .calendar-page .calendar-primary{
      padding:0 !important;
    }

    /* =====================================================
       MONTH CARD HEADER
       ===================================================== */

    .calendar-page .calendar-card-head{
      display:flex !important;
      align-items:flex-start !important;
      justify-content:space-between !important;
      gap:15px !important;

      padding:17px 18px 13px !important;

      border-bottom:1px solid var(--line) !important;
    }

    .calendar-page .calendar-card-kicker{
      display:inline-flex !important;
      align-items:center !important;
      gap:5px !important;

      color:var(--accent) !important;

      font-size:7px !important;
      font-weight:850 !important;

      letter-spacing:.13em !important;
    }

    .calendar-page .calendar-card-head > div:first-child > b{
      display:block !important;

      margin-top:4px !important;

      color:var(--text) !important;

      font-size:18px !important;
      font-weight:850 !important;

      letter-spacing:-.035em !important;
    }

    .calendar-page .calendar-card-head > div:first-child > small{
      display:block !important;

      margin-top:5px !important;

      color:var(--muted) !important;
      font-size:8px !important;
    }

    /* legend */

    .calendar-page .calendar-card-head .calendar-legend{
      display:flex !important;
      align-items:center !important;
      justify-content:flex-end !important;

      flex-wrap:wrap !important;
      gap:7px 10px !important;

      margin:2px 0 0 !important;
      padding:0 !important;
    }

    .calendar-page .calendar-card-head .calendar-legend span{
      display:inline-flex !important;
      align-items:center !important;
      gap:5px !important;

      color:var(--muted) !important;

      font-size:7px !important;
    }

    .calendar-page .calendar-card-head .calendar-legend i{
      position:static !important;

      width:6px !important;
      height:6px !important;

      display:block !important;

      padding:0 !important;
      margin:0 !important;

      border-radius:50% !important;

      background:var(--accent) !important;
      box-shadow:none !important;
    }

    .calendar-page .calendar-card-head .calendar-legend i.task{
      background:var(--warn) !important;
    }

    .calendar-page .calendar-card-head .calendar-legend i.quiz{
      background:var(--purple) !important;
    }

    /* =====================================================
       WEEKDAYS
       ===================================================== */

    .calendar-page .calendar-weekdays{
      display:grid !important;

      grid-template-columns:
        repeat(7,minmax(0,1fr)) !important;

      gap:0 !important;

      padding:10px 12px 6px !important;

      color:var(--muted-2) !important;

      font-size:7px !important;
      font-weight:850 !important;

      text-align:center !important;
      text-transform:uppercase !important;

      letter-spacing:.08em !important;
    }

    /* =====================================================
       THE IMPORTANT PART
       TRUE 7 x 5 GRID
       ===================================================== */

    .calendar-page .calendar-month-grid{
      display:grid !important;

      grid-template-columns:
        repeat(7,minmax(0,1fr)) !important;

      grid-template-rows:
        repeat(5,minmax(78px,1fr)) !important;

      grid-auto-flow:row !important;

      gap:5px !important;

      width:100% !important;

      box-sizing:border-box !important;

      padding:5px 12px 12px !important;
    }

    .calendar-page .calendar-month-grid > .day{
      appearance:none !important;
      -webkit-appearance:none !important;

      position:relative !important;

      width:100% !important;
      height:100% !important;
      min-width:0 !important;
      min-height:78px !important;

      display:flex !important;
      flex-direction:column !important;
      align-items:flex-start !important;
      justify-content:space-between !important;

      box-sizing:border-box !important;

      margin:0 !important;
      padding:8px !important;

      border:1px solid transparent !important;
      border-radius:13px !important;

      background:rgba(255,255,255,.015) !important;

      color:var(--text) !important;

      text-align:left !important;

      cursor:pointer !important;
    }

    .calendar-page .calendar-month-grid > .day:hover{
      background:var(--surface-2) !important;

      border-color:rgba(24,183,255,.16) !important;

      transform:translateY(-1px) !important;

      box-shadow:
        0 7px 18px rgba(0,0,0,.06) !important;
    }

    .calendar-page .calendar-month-grid > .day.other{
      opacity:.20 !important;
    }

    .calendar-page .calendar-month-grid > .day.today{
      background:rgba(24,183,255,.045) !important;

      border-color:rgba(24,183,255,.16) !important;
    }

    .calendar-page .calendar-month-grid > .day.selected{
      background:
        linear-gradient(
          145deg,
          rgba(24,183,255,.15),
          rgba(24,183,255,.055)
        ) !important;

      border-color:rgba(24,183,255,.50) !important;

      box-shadow:
        0 10px 25px rgba(24,183,255,.09),
        inset 0 1px 0 rgba(255,255,255,.05) !important;
    }

    .calendar-page .calendar-month-grid > .day-number{
      width:27px !important;
      height:27px !important;
      min-width:27px !important;

      display:grid !important;
      place-items:center !important;

      margin:0 !important;
      padding:0 !important;

      border-radius:9px !important;

      background:transparent !important;
      box-shadow:none !important;

      color:var(--text) !important;

      font-size:10px !important;
      font-weight:850 !important;

      line-height:1 !important;
    }

    .calendar-page .calendar-month-grid > .day.today .day-number{
      color:var(--accent) !important;

      background:rgba(24,183,255,.08) !important;

      box-shadow:
        inset 0 0 0 1px rgba(24,183,255,.30) !important;
    }

    .calendar-page .calendar-month-grid > .day.selected .day-number{
      color:#fff !important;

      background:var(--accent) !important;

      box-shadow:
        0 6px 15px rgba(24,183,255,.23) !important;
    }

    .calendar-page .calendar-month-grid > .day.today.selected .day-number{
      color:#fff !important;
      background:var(--accent) !important;
    }

    .calendar-page .calendar-month-grid > .day-dots{
      width:100% !important;

      min-height:6px !important;

      display:flex !important;
      align-items:center !important;

      gap:4px !important;
    }

    .calendar-page .calendar-month-grid > .day-dots .day-marker{
      position:static !important;

      width:5px !important;
      height:5px !important;
      min-width:5px !important;

      display:block !important;

      margin:0 !important;
      padding:0 !important;

      border:0 !important;
      border-radius:50% !important;

      background:var(--accent) !important;
      box-shadow:none !important;
    }

    .calendar-page .calendar-month-grid > .day-dots .day-marker.task{
      background:var(--warn) !important;
    }

    .calendar-page .calendar-month-grid > .day-dots .day-marker.quiz{
      background:var(--purple) !important;
    }

    .calendar-page .calendar-month-grid > .day-dots .day-marker.study{
      background:var(--accent) !important;
    }

    /* =====================================================
       EVENTS
       ===================================================== */

    .calendar-page .calendar-events{
      position:sticky !important;
      top:92px !important;

      padding:0 !important;
    }

    .calendar-page .calendar-events-head{
      display:flex !important;
      align-items:flex-start !important;
      gap:10px !important;

      padding:16px !important;
    }

    .calendar-page .calendar-events-icon{
      width:38px !important;
      height:38px !important;
      min-width:38px !important;

      display:grid !important;
      place-items:center !important;

      border-radius:11px !important;

      color:var(--accent) !important;
      background:rgba(24,183,255,.08) !important;
      border:1px solid rgba(24,183,255,.14) !important;
    }

    .calendar-page .calendar-events-head > div:last-child{
      min-width:0 !important;
    }

    .calendar-page .calendar-events-head > div:last-child > span{
      display:block !important;

      color:var(--muted-2) !important;

      font-size:7px !important;
      font-weight:850 !important;

      letter-spacing:.12em !important;
    }

    .calendar-page .calendar-events-head h2{
      margin:5px 0 0 !important;

      color:var(--text) !important;

      font-size:16px !important;
      font-weight:850 !important;

      letter-spacing:-.035em !important;
      line-height:1.08 !important;
    }

    .calendar-page .calendar-events-head small{
      display:block !important;

      margin-top:4px !important;

      color:var(--muted) !important;
      font-size:8px !important;
    }

    .calendar-page .calendar-events-divider{
      width:100% !important;
      height:1px !important;
      background:var(--line) !important;
    }

    .calendar-page .calendar-events-list{
      display:grid !important;
      gap:7px !important;

      padding:10px !important;
    }

    .calendar-page .calendar-event-item{
      appearance:none !important;
      -webkit-appearance:none !important;

      width:100% !important;

      display:grid !important;

      grid-template-columns:
        42px
        4px
        minmax(0,1fr)
        15px !important;

      align-items:center !important;
      gap:8px !important;

      box-sizing:border-box !important;

      margin:0 !important;
      padding:9px !important;

      border:1px solid var(--line) !important;
      border-radius:13px !important;

      background:var(--surface-2) !important;
      color:var(--text) !important;

      text-align:left !important;
      cursor:pointer !important;
    }

    .calendar-page .calendar-event-time{
      color:var(--accent) !important;

      font-size:9px !important;
      font-weight:850 !important;

      text-align:center !important;
    }

    .calendar-page .calendar-event-line{
      width:4px !important;
      height:28px !important;

      border-radius:999px !important;

      background:var(--accent) !important;
    }

    .calendar-page .calendar-event-copy{
      min-width:0 !important;
    }

    .calendar-page .calendar-event-type{
      display:block !important;

      margin-bottom:3px !important;

      color:var(--accent) !important;

      font-size:6.5px !important;
      font-weight:850 !important;

      letter-spacing:.10em !important;
      text-transform:uppercase !important;
    }

    .calendar-page .calendar-event-type.task{
      color:var(--warn) !important;
    }

    .calendar-page .calendar-event-type.quiz{
      color:var(--purple) !important;
    }

    .calendar-page .calendar-event-copy b{
      display:block !important;

      color:var(--text) !important;

      font-size:9.5px !important;
      font-weight:850 !important;
      line-height:1.28 !important;

      overflow:hidden !important;
      text-overflow:ellipsis !important;
    }

    .calendar-page .calendar-event-copy > small:last-child{
      display:block !important;

      margin-top:3px !important;

      color:var(--muted) !important;

      font-size:7.5px !important;

      overflow:hidden !important;
      text-overflow:ellipsis !important;
      white-space:nowrap !important;
    }

    .calendar-page .calendar-event-item > .icon{
      color:var(--muted-2) !important;
    }

    /* =====================================================
       EMPTY
       ===================================================== */

    .calendar-page .calendar-empty-state{
      padding:42px 18px !important;
      text-align:center !important;
    }

    .calendar-page .calendar-empty-icon{
      width:43px !important;
      height:43px !important;

      display:grid !important;
      place-items:center !important;

      margin:0 auto 10px !important;

      border-radius:13px !important;

      color:var(--good) !important;
      background:rgba(48,217,145,.08) !important;
    }

    .calendar-page .calendar-empty-state b{
      display:block !important;

      color:var(--text) !important;
      font-size:12px !important;
      font-weight:850 !important;
    }

    .calendar-page .calendar-empty-state p{
      max-width:230px !important;

      margin:6px auto 0 !important;

      color:var(--muted) !important;
      font-size:8.5px !important;
      line-height:1.5 !important;
    }

    /* =====================================================
       LIGHT
       ===================================================== */

    body[data-theme="light"] .calendar-page .calendar-overview,
    body[data-theme="light"] .calendar-page .calendar-card,
    body[data-theme="light"] .calendar-page .events-card{
      box-shadow:
        0 14px 38px rgba(38,65,95,.07) !important;
    }

    body[data-theme="light"] .calendar-page .calendar-month-grid > .day{
      background:#f8fafc !important;
    }

    body[data-theme="light"] .calendar-page .calendar-month-grid > .day:hover{
      background:#fff !important;
    }

    body[data-theme="light"] .calendar-page .calendar-month-grid > .day.selected{
      background:
        linear-gradient(
          145deg,
          rgba(8,127,240,.12),
          rgba(8,127,240,.045)
        ) !important;
    }

    body[data-theme="light"] .calendar-page .calendar-event-item{
      background:#f9fbfd !important;
    }

    /* =====================================================
       RESPONSIVE
       ===================================================== */

    @media(max-width:900px){
      .calendar-page .calendar-layout{
        grid-template-columns:1fr !important;
      }

      .calendar-page .calendar-events{
        position:static !important;
      }

      .calendar-page .calendar-overview{
        align-items:flex-start !important;
        flex-direction:column !important;
      }

      .calendar-page .calendar-overview-stats{
        width:100% !important;
      }

      .calendar-page .calendar-stat{
        flex:1 1 0 !important;
      }
    }

    @media(max-width:680px){
      .calendar-page .calendar-actions{
        width:100% !important;
      }

      .calendar-page .calendar-today-btn{
        flex:1 !important;
      }

      .calendar-page .calendar-card-head{
        flex-direction:column !important;
      }

      .calendar-page .calendar-card-head .calendar-legend{
        justify-content:flex-start !important;
      }

      .calendar-page .calendar-month-grid{
        grid-template-rows:
          repeat(5,minmax(58px,1fr)) !important;

        gap:4px !important;

        padding:4px 7px 8px !important;
      }

      .calendar-page .calendar-month-grid > .day{
        min-height:58px !important;
        padding:6px !important;
        border-radius:10px !important;
      }

      .calendar-page .calendar-month-grid > .day-number{
        width:24px !important;
        height:24px !important;
        min-width:24px !important;
        font-size:9px !important;
      }
    }

  `;

  document.head.appendChild(style);
}

/* NOVA_CALENDAR_INLINE_FINAL_20260919 */

(async function boot(){injectDashboardHomeOverrides();injectNovaAccountInlineStyles();injectNovaCalendarInlineStyles();setTheme();parseRoute();try{const st=await api('/api/auth/status');state.connected=Boolean(st.connected);state.user=st.user||null;state.campusUrl=st.campusUrl||state.campusUrl;if(state.campusUrl)localStorage.setItem('nova-campus-url',state.campusUrl)}catch(e){console.warn(e)}const params=new URLSearchParams(location.search);if(!state.connected&&params.get('demo')==='1'){return loadDemo()}render();if(state.connected)loadRouteData(state.route==='course')})();
