// NOVA 27.0 cache bust: nova27-messages-20260923-3
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
  data: { dashboard: null, courses: null, tasks: null, grades: null, schedule: null, calendar: null, messages: null, files: null, tests: null, materials: null, profile: null, view: null, activity: null, study: null, notifications: null, deadlines: null },
  status: { dashboard:'idle', search:'idle', courses:'idle', course:'idle', tasks:'idle', grades:'idle', schedule:'idle', calendar:'idle', messages:'idle', files:'idle', tests:'idle', materials:'idle', profile:'idle', view:'idle', activity:'idle', study:'idle', notifications:'idle', deadlines:'idle' },
  errors: {},
  selectedConversation: null,
  pageCache: new Map(),
  requests: {},
  routeEpoch: 0,
  courseView: localStorage.getItem('nova-course-view') || 'cards',
  studyFilter: localStorage.getItem('nova-study-filter') || 'open',
  searchFilter: localStorage.getItem('nova-search-filter') || 'all',
  deadlineFilter: localStorage.getItem('nova-deadline-filter-v1') || 'active',
  quizNavigationCache: new Map(),
  scheduleImport: (() => {
    try {
      return JSON.parse(
        localStorage.getItem('nova-schedule') || 'null'
      );
    } catch {
      return null;
    }
  })()
};

let novaStudyTimerHandle = null;
const NOVA_STUDY_STORAGE_KEY = 'nova-study-session-v1';
const NOVA_STUDY_DURATION_SEC = 60 * 60;

const NAV = [
  ['dashboard','home','Главная'], ['study','book','Учебный режим'], ['courses','grid','Курсы'], ['schedule','clock','Расписание'], ['deadlines','calendar','Дедлайны'], ['grades','chart','Оценки'],
  ['tasks','check-square','Задания'], ['calendar','calendar','Календарь'], ['messages','message','Сообщения'], ['files','folder','Файлы'], ['materials','folder','Материалы'], ['tests','quiz','Тесты']
];
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = (s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const text = (s='')=>String(s).replace(/\s+/g,' ').trim();

function messageText(value = '') {
  let source =
    String(value ?? '').trim();

  /*
   * Moodle иногда возвращает текст сообщения
   * вместе с HTML-разметкой или HTML,
   * закодированным как обычный текст.
   */
  for(let i = 0; i < 2; i++){
    const doc =
      new DOMParser().parseFromString(
        source,
        'text/html'
      );

    const decoded =
      doc.body?.textContent ?? source;

    if(decoded === source){
      break;
    }

    source = decoded;
  }

  return source
    .replace(
      /[<‹]\s*\/?\s*p\b[^>›]*[>›]/gi,
      ' '
    )
    .replace(
      /[<‹]\s*\/?\s*\/?p\s*[>›]/gi,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}



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
    book:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17"/><path d="M7.5 19H20"/>',
    upload:'<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
    edit:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="m13.5 6.5 4 4"/>',
    save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    x:'<path d="m6 6 12 12M18 6 6 18"/>',
    spinner:'<path d="M12 3a9 9 0 1 0 9 9"/>',
    play:'<path d="m9 6 10 6-10 6z"/>',
    pause:'<path d="M8 6v12M16 6v12"/>',
    'map-pin':'<path d="M12 21s7-5.2 7-11A7 7 0 0 0 5 10c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/>',
    link:'<path d="M10 13.5 8.5 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m14 10.5 1.5-1.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"/><path d="m8 16 8-8"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  };
  return `<svg class="icon" data-icon="${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
}
function toast(message,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.innerHTML=`<span>${icon(type==='error'?'info':type==='success'?'check':'sparkle',16)}</span><span>${esc(message)}</span>`;$('#toast-root')?.append(el);setTimeout(()=>el.remove(),4200)}
function expireLocalSession(){
  Object.assign(state,{connected:false,user:null,demo:false});
  state.data={dashboard:null,courses:null,tasks:null,grades:null,schedule:null,calendar:null,messages:null,files:null,tests:null,materials:null,profile:null,view:null,activity:null,study:null,notifications:null,deadlines:null};
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
  if(r.status===401){
    const activeQuiz =
      state.route === 'activity' &&
      (
        state.data.activity?.result?.kind === 'quiz-action' ||
        state.data.activity?.result?.kind === 'quiz'
      );

    /*
     * Не выбрасываем пользователя из Nova из-за одного
     * неудачного quiz-запроса. Иначе вопрос навигации
     * превращается в полный logout-интерфейс.
     */
    if(activeQuiz){
      throw new Error(
        d?.error ||
        'Сессия Campus закончилась. Подключите Campus заново.'
      );
    }

    expireLocalSession();

    throw new Error(
      d?.error ||
      'Сессия Campus закончилась. Подключите Campus заново.'
    );
  }
  if(!r.ok||d?.ok===false) throw new Error(d?.error||`Ошибка ${r.status}`);
  return d;
}
function routeLabel(r){return {dashboard:'Главная',study:'Учебный режим',notifications:'Уведомления',search:'Поиск',courses:'Курсы',schedule:'Расписание',deadlines:'Дедлайны',grades:'Оценки',tasks:'Задания',calendar:'Календарь',messages:'Сообщения',files:'Файлы',tests:'Тесты',materials:'Материалы',activity:'Активность',profile:'Профиль',course:'Курс',view:'Материал'}[r]||'Campus Nova'}
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
  const loadingRoute={dashboard:'dashboard',study:'study',courses:'courses',course:'course',schedule:'schedule',grades:'grades',tasks:'tasks',calendar:'calendar',messages:'messages',files:'files',materials:'materials',tests:'tests',activity:'activity',profile:'profile',notifications:'notifications',view:null}[state.route];
  if(loadingRoute && !state.demo) state.status[loadingRoute]='loading';
  render(true);
  loadRouteData();
}
function back(fallback='dashboard'){ if(history.state?.nova){history.back();return} navigate(fallback); }

function novaHandlePopState(){
  state.routeEpoch++;

  parseRoute();

  const loadingRoute = {
    dashboard:'dashboard',
    study:'study',
    courses:'courses',
    course:'course',
    schedule:'schedule',
    grades:'grades',
    tasks:'tasks',
    calendar:'calendar',
    messages:'messages',
    files:'files',
    materials:'materials',
    tests:'tests',
    activity:'activity',
    profile:'profile',
    notifications:'notifications',
    view:null
  }[state.route];

  if(
    loadingRoute &&
    !state.demo &&
    state.status[loadingRoute] !== 'loading'
  ){
    state.status[loadingRoute] = 'loading';
  }

  render(true);
  void loadRouteData(false, state.routeEpoch);
}

if(
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function' &&
  !window.__novaPopStateBound
){
  window.__novaPopStateBound = true;
  window.addEventListener(
    'popstate',
    novaHandlePopState
  );
}
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
function brand(){
  const host =
    state.campusUrl
      ? campusHost()
      : 'campus.fa.ru';

  return `
    <div class="brand">
      <span class="brand-mark">
        ${icon('university',22)}
      </span>

      <span class="brand-copy">
        <span class="brand-topline">
          <b>Campus <em>FA</em></b>
        </span>

        <small class="brand-hostline">
          <span>${esc(host)}</span>
          <span class="beta-badge">BETA1.0</span>
        </small>
      </span>
    </div>
  `;
}
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


/* NOVA 23.0 · NOTIFICATIONS CENTER */

const NOVA_NOTIFICATION_STORAGE_KEY = 'nova-notifications-v1';
const NOVA_NOTIFICATION_FILTER_KEY = 'nova-notifications-filter-v1';

function novaNotificationReadStore(){
  try{
    const raw = localStorage.getItem(
      NOVA_NOTIFICATION_STORAGE_KEY
    );

    const parsed = raw ? JSON.parse(raw) : {};

    return {
      read:Array.isArray(parsed?.read)
        ? parsed.read.map(String)
        : []
    };
  }catch{
    return {read:[]};
  }
}

function novaNotificationWriteStore(store){
  try{
    localStorage.setItem(
      NOVA_NOTIFICATION_STORAGE_KEY,
      JSON.stringify({
        read:Array.from(
          new Set(store?.read || [])
        ).slice(-300)
      })
    );
  }catch{}
}

function novaNotificationFilter(){
  try{
    const value =
      localStorage.getItem(
        NOVA_NOTIFICATION_FILTER_KEY
      ) || 'all';

    return ['all','unread','important'].includes(value)
      ? value
      : 'all';
  }catch{
    return 'all';
  }
}

function novaNotificationSetFilter(value){
  const filter =
    ['all','unread','important'].includes(value)
      ? value
      : 'all';

  localStorage.setItem(
    NOVA_NOTIFICATION_FILTER_KEY,
    filter
  );

  render();
}

function novaNotificationIsRead(id){
  return novaNotificationReadStore()
    .read
    .includes(String(id));
}

function novaNotificationMarkRead(id){
  if(!id) return;

  const store =
    novaNotificationReadStore();

  const value = String(id);

  if(!store.read.includes(value)){
    store.read.push(value);
  }

  novaNotificationWriteStore(store);
  render();
}

function novaNotificationMarkAllRead(){
  const store =
    novaNotificationReadStore();

  for(const item of novaNotificationItems()){
    if(item.id){
      store.read.push(String(item.id));
    }
  }

  novaNotificationWriteStore(store);
  render();
}

function novaNotificationTimestamp(item){
  const keys = [
    'duedate',
    'deadline',
    'due',
    'timeend',
    'timestart',
    'timestamp',
    'timecreated',
    'timemodified'
  ];

  for(const key of keys){
    const value = item?.[key];

    if(typeof value === 'number' && value > 0){
      return value > 100000000000
        ? value / 1000
        : value;
    }

    if(typeof value === 'string' && value.trim()){
      const parsed = Date.parse(value);

      if(!Number.isNaN(parsed)){
        return parsed / 1000;
      }

      const numeric = Number(value);

      if(numeric > 0){
        return numeric > 100000000000
          ? numeric / 1000
          : numeric;
      }
    }
  }

  return 0;
}

function novaNotificationRelativeTime(ts){
  const value = Number(ts || 0);

  if(!value){
    return 'сейчас';
  }

  const diff =
    Date.now()/1000 - value;

  if(diff < 60){
    return 'только что';
  }

  if(diff < 3600){
    return `${Math.floor(diff/60)} мин назад`;
  }

  if(diff < 86400){
    return `${Math.floor(diff/3600)} ч назад`;
  }

  if(diff < 172800){
    return 'вчера';
  }

  return formatDate(value);
}

function novaNotificationDueText(ts){
  if(!ts){
    return 'Срок не указан';
  }

  const diff =
    ts - Date.now()/1000;

  if(diff < 0){
    return 'Срок уже прошёл';
  }

  if(diff < 3600){
    return 'Дедлайн меньше чем через час';
  }

  if(diff < 86400){
    return 'Дедлайн сегодня';
  }

  if(diff < 172800){
    return 'Дедлайн завтра';
  }

  return `Дедлайн ${formatDate(ts)}`;
}

function novaNotificationItems(){

  const rows = [];

  const add = item => {
    if(!item?.id){
      return;
    }

    rows.push({
      ...item,
      id:String(item.id),
      read:novaNotificationIsRead(item.id)
    });
  };

  /* WHAT'S NEW */

  if(
    typeof novaGlobalUpdateReadStore === 'function'
  ){

    const global =
      novaGlobalUpdateReadStore();

    for(const event of global?.events || []){

      add({
        id:[
          'update',
          event.type || '',
          event.title || '',
          event.detectedAt || ''
        ].join(':'),
        type:'update',
        icon:event.icon || 'sparkle',
        title:event.title || 'Campus обновился',
        meta:event.meta || 'Nova',
        description:event.label || 'Обновление Campus',
        timestamp:event.detectedAt || 0,
        priority:event.label === 'Новое' ? 90 : 70,
        important:event.label === 'Новое',
        ref:event.ref || null,
        go:event.go || null,
        param:event.param || ''
      });

    }
  }

  /* TASKS */

  for(const task of Array.isArray(state.data.tasks)
    ? state.data.tasks
    : []
  ){

    const ts =
      novaNotificationTimestamp(task);

    if(!ts){
      continue;
    }

    const diff =
      ts - Date.now()/1000;

    if(diff > 7*86400){
      continue;
    }

    add({
      id:[
        'task',
        task.id || task.name || '',
        ts
      ].join(':'),
      type:'task',
      icon:'check-square',
      title:
        task.name ||
        task.title ||
        'Задание',
      meta:
        task.course ||
        task.courseName ||
        'Задание Campus',
      description:
        novaNotificationDueText(ts),
      timestamp:ts,
      priority:
        diff <= 86400
          ? 100
          : 75,
      important:
        diff <= 86400,
      ref:
        typeof novaGlobalUpdateActivityRef === 'function'
          ? novaGlobalUpdateActivityRef(task)
          : null
    });

  }

  /* TESTS */

  for(const test of Array.isArray(state.data.tests)
    ? state.data.tests
    : []
  ){

    const ts =
      novaNotificationTimestamp(test);

    if(!ts){
      continue;
    }

    const diff =
      ts - Date.now()/1000;

    if(diff > 7*86400){
      continue;
    }

    add({
      id:[
        'test',
        test.id || test.name || '',
        ts
      ].join(':'),
      type:'test',
      icon:'quiz',
      title:
        test.name ||
        test.title ||
        'Тест',
      meta:
        test.course ||
        test.courseName ||
        'Тест Campus',
      description:
        novaNotificationDueText(ts),
      timestamp:ts,
      priority:
        diff <= 86400
          ? 105
          : 80,
      important:
        diff <= 86400,
      ref:
        typeof novaGlobalUpdateActivityRef === 'function'
          ? novaGlobalUpdateActivityRef(test)
          : null
    });

  }

  /* MESSAGES */

  const conversations =
    state.data.messages?.conversations || [];

  for(const conversation of conversations){

    const unread =
      Number(
        conversation.unreadcount ||
        conversation.unreadCount ||
        0
      );

    if(unread <= 0){
      continue;
    }

    const latest =
      Array.isArray(conversation.messages)
        ? conversation.messages[0]
        : null;

    add({
      id:[
        'message',
        conversation.id || conversation.name || '',
        latest?.timecreated ||
        conversation.timemodified ||
        ''
      ].join(':'),
      type:'message',
      icon:'message',
      title:
        conversation.name ||
        'Новое сообщение',
      meta:
        `${unread} ${
          unread === 1
            ? 'новое сообщение'
            : 'новых сообщений'
        }`,
      description:
        messageText(
          latest?.text ||
          latest?.message ||
          ''
        ).slice(0,150),
      timestamp:
        Number(
          latest?.timecreated ||
          conversation.timemodified ||
          0
        ),
      priority:110,
      important:true,
      go:'messages'
    });

  }

  /* CALENDAR */

  const now =
    Date.now()/1000;

  for(const event of flattenCalendar(
    state.data.calendar || {}
  )){

    const ts =
      Number(event?.timestart || 0);

    if(
      !ts ||
      ts < now ||
      ts > now + 3*86400
    ){
      continue;
    }

    add({
      id:[
        'calendar',
        event.id || event.name || '',
        ts
      ].join(':'),
      type:'event',
      icon:'calendar',
      title:
        event.name ||
        'Событие',
      meta:
        event.course?.fullname ||
        event.modulename ||
        'Календарь',
      description:
        ts-now <= 7200
          ? 'Событие начинается скоро'
          : 'Ближайшее событие',
      timestamp:ts,
      priority:
        ts-now <= 7200
          ? 98
          : 60,
      important:
        ts-now <= 7200,
      go:'calendar'
    });

  }

  const unique = [];
  const seen = new Set();

  for(const item of rows){

    if(seen.has(item.id)){
      continue;
    }

    seen.add(item.id);
    unique.push(item);

  }

  unique.sort((a,b)=>{

    const unreadDiff =
      Number(!a.read) -
      Number(!b.read);

    if(unreadDiff){
      return unreadDiff;
    }

    const priorityDiff =
      Number(b.priority || 0) -
      Number(a.priority || 0);

    if(priorityDiff){
      return priorityDiff;
    }

    return Number(b.timestamp || 0) -
      Number(a.timestamp || 0);
  });

  return unique.slice(0,60);
}

function notificationItems(){
  return novaNotificationItems();
}

function notificationsBadge(){
  return novaNotificationItems()
    .some(item => !item.read)
      ? '<i></i>'
      : '';
}

function novaNotificationOpen(item){

  if(!item){
    return;
  }

  novaNotificationMarkRead(
    item.id
  );

  if(
    item.ref &&
    typeof openActivity === 'function'
  ){
    openActivity(item.ref);
    return;
  }

  if(item.go){
    navigate(
      item.go,
      item.param || ''
    );
  }

}

function showNotifications(){
  navigate('notifications');
}

function notificationsPage(){

  if(state.status.notifications === 'loading'){

    return `
      <section class="page nova-notifications-page">
        ${PageHead({
          eyebrow:'ЦЕНТР',
          title:'Уведомления',
          sub:'Получаем свежие сигналы Campus…'
        })}
        ${skeletonGrid(5)}
      </section>
    `;
  }

  if(state.status.notifications === 'error'){

    return `
      <section class="page nova-notifications-page">
        ${PageHead({
          eyebrow:'ЦЕНТР',
          title:'Уведомления',
          sub:'Не удалось получить данные.'
        })}
        ${statePanel('error','notifications')}
      </section>
    `;
  }

  const all =
    novaNotificationItems();

  const filter =
    novaNotificationFilter();

  const filtered =
    filter === 'unread'
      ? all.filter(item=>!item.read)
      : filter === 'important'
        ? all.filter(item=>item.important)
        : all;

  const unread =
    all.filter(item=>!item.read).length;

  const important =
    all.filter(item=>item.important).length;

  return `
    <section class="page nova-notifications-page">

      ${PageHead({
        eyebrow:'ЦЕНТР УВЕДОМЛЕНИЙ',
        title:'Уведомления',
        sub:'Всё важное из Campus в одном месте.',
        children:`
          <div class="nova-notifications-head-actions">

            <button
              class="secondary"
              data-retry="notifications"
              type="button"
            >
              ${icon('refresh',15)}
              Обновить
            </button>

            <button
              class="secondary"
              id="notifications-mark-all"
              type="button"
              ${unread ? '' : 'disabled'}
            >
              ${icon('check',15)}
              Прочитать всё
            </button>

          </div>
        `
      })}

      <div class="nova-notification-stats">

        <div class="nova-notification-stat">
          <span>${icon('bell',17)}</span>
          <div>
            <b>${unread}</b>
            <small>непрочитанных</small>
          </div>
        </div>

        <div class="nova-notification-stat">
          <span>${icon('sparkle',17)}</span>
          <div>
            <b>${important}</b>
            <small>важных</small>
          </div>
        </div>

        <div class="nova-notification-stat">
          <span>${icon('grid',17)}</span>
          <div>
            <b>${all.length}</b>
            <small>сигналов</small>
          </div>
        </div>

      </div>

      <section class="nova-notifications-panel">

        <div class="nova-notifications-toolbar">

          <div>
            <span class="eyebrow">ЛЕНТА</span>
            <h2>Что требует внимания</h2>
          </div>

          <div class="nova-notification-filters">

            ${[
              ['all','Все',all.length],
              ['unread','Непрочитанные',unread],
              ['important','Важные',important]
            ].map(([value,label,count])=>`

              <button
                type="button"
                class="
                  nova-notification-filter
                  ${filter===value?'active':''}
                "
                data-notification-filter="${value}"
              >
                ${label}
                <span>${count}</span>
              </button>

            `).join('')}

          </div>

        </div>

        <div class="nova-notification-list">

          ${
            filtered.length
              ? filtered.map(item=>`

                <article
                  class="
                    nova-notification
                    ${item.read?'is-read':'is-unread'}
                    ${item.important?'is-important':''}
                  "
                >

                  <button
                    type="button"
                    class="nova-notification-open"
                    data-notification-open="${esc(item.id)}"
                  >

                    <span class="nova-notification-icon">
                      ${icon(item.icon,18)}
                    </span>

                    <span class="nova-notification-copy">

                      <small>
                        ${
                          ({
                            task:'ЗАДАНИЕ',
                            test:'ТЕСТ',
                            message:'СООБЩЕНИЕ',
                            event:'КАЛЕНДАРЬ',
                            update:'ОБНОВЛЕНИЕ'
                          })[item.type] || 'CAMPUS'
                        }
                      </small>

                      <b>${esc(item.title)}</b>

                      <em>${esc(item.meta)}</em>

                      ${
                        item.description
                          ? `<p>${esc(item.description)}</p>`
                          : ''
                      }

                    </span>

                    <span class="nova-notification-right">

                      <time>
                        ${esc(
                          novaNotificationRelativeTime(
                            item.timestamp
                          )
                        )}
                      </time>

                      ${
                        item.read
                          ? ''
                          : '<i></i>'
                      }

                    </span>

                  </button>

                  ${
                    item.read
                      ? ''
                      : `
                        <button
                          type="button"
                          class="nova-notification-read"
                          data-notification-read="${esc(item.id)}"
                          title="Отметить прочитанным"
                        >
                          ${icon('check',15)}
                        </button>
                      `
                  }

                </article>

              `).join('')
              : `
                <div class="nova-notification-empty">

                  <div>
                    ${icon('check',25)}
                  </div>

                  <b>Здесь спокойно</b>

                  <p>
                    ${
                      filter === 'unread'
                        ? 'Непрочитанных уведомлений нет.'
                        : filter === 'important'
                          ? 'Важных сигналов нет.'
                          : 'Новых сигналов из Campus пока нет.'
                    }
                  </p>

                </div>
              `
          }

        </div>

      </section>

      <div class="nova-notifications-note">
        ${icon('info',15)}
        <span>
          Nova объединяет дедлайны, тесты, сообщения,
          ближайшие события и What's New.
        </span>
      </div>

    </section>
  `;
}

async function loadNotificationsData(
  force=false,
  epoch=state.routeEpoch
){

  if(
    !state.connected ||
    state.demo ||
    state.route !== 'notifications'
  ){
    return;
  }

  state.status.notifications='loading';
  state.errors.notifications=null;
  render();

  const services = [
    'tasks',
    'tests',
    'messages',
    'calendar',
    'materials',
    'files'
  ];

  await Promise.allSettled(
    services.map(service =>
      loadData(
        service,
        force,
        epoch
      )
    )
  );

  if(
    epoch !== state.routeEpoch ||
    state.route !== 'notifications'
  ){
    return;
  }

  const usable = services.some(
    service =>
      state.status[service] === 'success'
  );

  state.status.notifications =
    usable ? 'success' : 'error';

  render();
}

function shell(content){
  const active=['course','view'].includes(state.route)?'courses':state.route;
  const nav=NAV.map(([r,i,l])=>{const href=r==='dashboard'?'/':`/${r}`;return `<a class="nav-item ${active===r?'active':''}" href="${href}" data-go="${r}" aria-current="${active===r?'page':'false'}">${icon(i,18)}<span>${l}</span></a>`}).join('');
  return `<div class="app-shell"><aside class="sidebar"><div class="sidebar-top">${brand()}<div class="uni"><b>Финансовый университет</b><span>Краснодарский филиал</span></div></div><div class="nav-caption">УЧЕБНАЯ СРЕДА</div><nav class="nav">${nav}</nav><div class="sidebar-bottom"><button class="nav-item ${active==='profile'?'active':''}" data-go="profile">${icon('user',18)}<span>Профиль</span></button><button class="theme-row" id="theme-sidebar">${icon(state.theme==='dark'?'sun':'moon',17)}<span>${state.theme==='dark'?'Светлая тема':'Тёмная тема'}</span></button><span class="connection"><i></i>${state.demo?'Демо-режим':'Campus подключён'}</span></div></aside><main class="main"><header class="topbar"><div class="crumb"><button class="mobile-menu" id="mobile-menu">${icon('grid',18)}</button><span>Campus Nova</span><b>›</b><strong>${esc(routeLabel(state.route))}</strong></div><div class="top-actions"><div class="nova-global-search-wrap"><div class="nova-search-input-shell"><label class="search" for="global-search"><span>${icon('search',17)}</span><input id="global-search" value="${esc(state.search)}" placeholder="Найти в Nova…" autocomplete="off" spellcheck="false"><kbd class="nova-search-command">Ctrl K</kbd></label><button class="nova-search-submit" id="global-search-submit" type="button" title="Открыть все результаты">${icon('arrow',14)}</button></div><div id="nova-search-popover" class="nova-search-popover" aria-live="polite"></div></div><button class="icon-btn" id="theme-top" title="Сменить тему">${icon(state.theme==='dark'?'sun':'moon',17)}</button><button class="icon-btn ${notificationsBadge()?'has-dot':''}" id="notifications" title="Уведомления" type="button">${icon('bell',17)}${notificationsBadge()}</button><div class="profile-menu" id="profile-menu"><button class="profile-chip" id="profile-menu-trigger" type="button" aria-expanded="false" aria-controls="profile-popover"><span class="avatar">${avatar()}</span><span><b>${esc(firstName())}</b><small>Студент</small></span>${icon('chevron',14)}</button><div class="profile-popover" id="profile-popover"><div class="profile-popover-head"><span class="avatar large">${avatar()}</span><div><b>${esc(state.user?.fullname||'Студент')}</b><small>Студент</small></div></div><div class="profile-popover-meta"><span><small>Статус</small><b>Campus подключён</b></span><span><small>ID пользователя</small><b>${esc(state.user?.id||'—')}</b></span></div><div class="profile-popover-actions"><button class="profile-popover-item" data-go="profile" type="button"><span class="profile-popover-icon">${icon('user',15)}</span><span><b>Профиль</b><small>Данные аккаунта и подключение</small></span>${icon('next',14)}</button><button class="profile-popover-item danger" id="profile-logout" type="button"><span class="profile-popover-icon">${icon('close',15)}</span><span><b>Выйти</b><small>Завершить сессию Campus</small></span></button></div></div></div></div></header><div id="page">${content}</div></main></div>`;
}
function skeletonGrid(n=6){return `<div class="skeleton-grid">${Array.from({length:n},()=>'<div class="skeleton-card"><span></span><span></span><span></span></div>').join('')}</div>`}
function statePanel(kind,service,retry=true){
  const errorTitles={course:'Не удалось загрузить курс.',activity:'Не удалось открыть активность.',grades:'Не удалось загрузить оценки.',tasks:'Не удалось загрузить задания.',files:'Не удалось загрузить файлы.',tests:'Не удалось загрузить тесты.',materials:'Не удалось загрузить материалы.',messages:'Не удалось загрузить сообщения.',profile:'Не удалось загрузить профиль.',calendar:'Не удалось загрузить календарь.',schedule:'Не удалось загрузить расписание.',courses:'Не удалось загрузить курсы.',view:'Не удалось открыть материал.',dashboard:'Не удалось загрузить главную страницу.',notifications:'Не удалось загрузить уведомления.'};
  const cfg={loading:['Загружаем данные…','Секунду, получаем актуальную информацию из Campus.'],error:[errorTitles[service]||'Не удалось загрузить данные Campus.',state.errors?.[service]||'Проверьте соединение и попробуйте ещё раз.'],empty:['Пока ничего нет','Campus успешно ответил, но для этого раздела данных сейчас нет.']}[kind];
  return `<div class="state-card ${kind}"><div class="state-icon">${kind==='loading'?'<span class="spinner"></span>':icon(kind==='error'?'info':'sparkle',22)}</div><h3>${cfg[0]}</h3><p>${esc(cfg[1])}</p>${retry&&kind==='error'?`<button class="primary" data-retry="${service}">${icon('refresh',16)} Повторить</button>`:''}</div>`;
}
function hero(){

  const scheduleIsCurrent =
    Boolean(
      state.scheduleImport &&
      typeof novaScheduleIsCurrent==='function' &&
      novaScheduleIsCurrent()
    );

  const nextLesson =
    scheduleIsCurrent &&
    typeof novaScheduleNextLesson==='function'
      ? novaScheduleNextLesson()
      : null;

  const tasks =
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : [];

  const taskCount=
    tasks.length;

  const courseCount=
    Array.isArray(state.data.courses)
      ? state.data.courses.length
      : 0;

  const unreadCount=
    (state.data.messages?.conversations||[])
      .reduce(
        (sum,c)=>
          sum+
          Number(
            c?.unreadcount||
            c?.unreadCount||
            0
          ),
        0
      );

  const now=
    new Date();

  const todayLabel=
    now.toLocaleDateString(
      'ru-RU',
      {
        weekday:'long',
        day:'numeric',
        month:'long'
      }
    );

  const periodLabel=
    nextLesson?.isTomorrow
      ? 'Завтра'
      : nextLesson?.isToday
        ? 'Сегодня'
        : 'Ближайшее занятие';

  const kicker=
    nextLesson
      ? (
          nextLesson.isTomorrow
            ? 'ЗАВТРА · БЛИЖАЙШАЯ ПАРА'
            : nextLesson.isToday
              ? 'СЕГОДНЯ · БЛИЖАЙШАЯ ПАРА'
              : 'БЛИЖАЙШЕЕ ЗАНЯТИЕ'
        )
      : 'СЕГОДНЯ · УЧЕБНЫЙ ДЕНЬ';

  const subject=
    nextLesson?.subject||
    'Свободное время';

  const room=
    nextLesson?.room
      ? 'Ауд. ' + nextLesson.room
      : '';

  const teacher=
    nextLesson?.teacher||
    '';

  const scheduleMeta=
    [
      periodLabel,
      room,
      teacher
    ]
      .filter(Boolean)
      .join(' · ');

  return `
    <section
      class="
        hero
        dashboard-hero
        nova-ambient-hero
        ${nextLesson?.isTomorrow?'is-tomorrow':''}
        ${nextLesson?.isToday?'is-today':''}
      "
    >

      <div
        class="nova-ambient-field"
        aria-hidden="true"
      >

        <span class="nova-aurora nova-aurora-a"></span>
        <span class="nova-aurora nova-aurora-b"></span>
        <span class="nova-aurora nova-aurora-c"></span>


        <span class="nova-orbit nova-orbit-a"></span>
        <span class="nova-orbit nova-orbit-b"></span>

        <span class="nova-orbit-dot nova-orbit-dot-a"></span>
        <span class="nova-orbit-dot nova-orbit-dot-b"></span>
        <span class="nova-orbit-dot nova-orbit-dot-c"></span>

        <span class="nova-glow-core"></span>

      </div>

      <div
        class="nova-ambient-overlay"
        aria-hidden="true"
      ></div>

      <div class="hero-brand">

        ${icon('university',23)}

        <span>

          <b>
            Финансовый университет
          </b>

          <small>
            Краснодарский филиал
          </small>

        </span>

      </div>

      <div class="nova-hero-content">

        <div class="nova-hero-kicker">
          ${esc(kicker)}
        </div>

        ${
          nextLesson
            ? `
              <div class="nova-hero-time">
                ${esc(
                  nextLesson.start||
                  '--:--'
                )}

                <span>
                  ${esc(periodLabel)}
                </span>
              </div>

              <h2 class="nova-hero-title">
                ${esc(subject)}
              </h2>

              <div class="nova-hero-details">

                ${
                  room
                    ? `
                      <span>
                        ${icon('map-pin',12)}
                        ${esc(room)}
                      </span>
                    `
                    : ''
                }

                ${
                  teacher
                    ? `
                      <span>
                        ${icon('user',12)}
                        ${esc(teacher)}
                      </span>
                    `
                    : ''
                }

              </div>
            `
            : `
              <div class="nova-hero-free">

                <span>
                  Сегодня свободно
                </span>

                <h2 class="nova-hero-title">
                  Нет ближайших занятий
                </h2>

                <p>
                  Можно заняться заданиями,
                  материалами или подготовкой.
                </p>

                <small>
                  ${esc(todayLabel)}
                </small>

              </div>
            `
        }

      </div>

      <div class="nova-hero-focus">

        <div class="nova-hero-focus-top">
          <span>
            ${
              nextLesson
                ? 'БЛИЖАЙШАЯ ПАРА'
                : 'СЕГОДНЯ'
            }
          </span>

          <i></i>
        </div>

        ${
          nextLesson
            ? `
              <strong>
                ${esc(
                  nextLesson.start||
                  '--:--'
                )}
              </strong>

              <b>
                ${esc(
                  subject
                )}
              </b>

              <small>
                ${esc(
                  scheduleMeta
                )}
              </small>
            `
            : `
              <strong>
                Свободно
              </strong>

              <b>
                Ближайших занятий нет
              </b>

              <small>
                ${esc(todayLabel)}
              </small>
            `
        }

        <div class="nova-hero-focus-orb">
          ${icon(
            nextLesson
              ? 'clock'
              : 'check',
            23
          )}
        </div>

      </div>



    </section>
  `;
}


function novaDashboardTaskDue(task){
  return Number(
    task?.due ||
    task?.deadline ||
    task?.content?.due?.timestamp ||
    activityDue(task) ||
    0
  );
}


/* =========================================================
   NOVA 25.0 · DEADLINE INTELLIGENCE CORE
   ========================================================= */

const NOVA_DEADLINE_FILTER_KEY =
  'nova-deadline-filter-v1';

function novaDeadlineNormalizeTimestamp(value){

  if(
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  ){
    return value > 100000000000
      ? Math.floor(value / 1000)
      : Math.floor(value);
  }

  if(
    typeof value === 'string' &&
    value.trim()
  ){

    const numeric =
      Number(value);

    if(
      Number.isFinite(numeric) &&
      numeric > 0
    ){
      return numeric > 100000000000
        ? Math.floor(numeric / 1000)
        : Math.floor(numeric);
    }

    const parsed =
      Date.parse(value);

    if(!Number.isNaN(parsed)){
      return Math.floor(parsed / 1000);
    }
  }

  return 0;
}

function novaDeadlineExtractDue(item){

  if(!item){
    return 0;
  }

  const directKeys = [
    item.due,
    item.deadline,
    item.duedate,
    item.dueDate,
    item.content?.due?.timestamp,
    item.content?.due?.time,
    item.content?.deadline?.timestamp,
    item.content?.deadline?.time
  ];

  for(const value of directKeys){

    const timestamp =
      novaDeadlineNormalizeTimestamp(
        value
      );

    if(timestamp){
      return timestamp;
    }
  }

  const activityTimestamp =
    typeof activityDue === 'function'
      ? novaDeadlineNormalizeTimestamp(
          activityDue(item)
        )
      : 0;

  if(activityTimestamp){
    return activityTimestamp;
  }

  const dates =
    Array.isArray(item.content?.dates)
      ? item.content.dates
      : [];

  for(const date of dates){

    const label =
      String(
        date?.label ||
        date?.type ||
        ''
      );

    if(
      !/due|deadline|срок|оконч/i.test(label)
    ){
      continue;
    }

    const timestamp =
      novaDeadlineNormalizeTimestamp(
        date?.timestamp ||
        date?.time ||
        date?.value
      );

    if(timestamp){
      return timestamp;
    }
  }

  return 0;
}

function novaDeadlineIsCompleted(item){

  if(!item){
    return false;
  }

  if(item.completed === true){
    return true;
  }

  if(item.completion?.completed === true){
    return true;
  }

  if(item.completionstate === 1){
    return true;
  }

  const values = [
    item.status,
    item.state,
    item.completion?.status,
    item.completion?.state
  ]
    .map(
      value =>
        String(value || '')
          .toLowerCase()
          .trim()
    )
    .filter(Boolean);

  return values.some(
    value =>
      [
        'complete',
        'completed',
        'done',
        'finished',
        'завершено',
        'выполнено'
      ].includes(value)
  );
}

function novaDeadlineBucket(due,now=Date.now()/1000){

  const timestamp =
    Number(due || 0);

  if(!timestamp){
    return 'none';
  }

  const diff =
    timestamp - now;

  if(diff < 0){
    return 'overdue';
  }

  if(diff <= 86400){
    return 'today';
  }

  if(diff <= 3 * 86400){
    return 'soon';
  }

  return 'later';
}

function novaDeadlineBucketLabel(bucket){

  return {
    overdue:'Просрочено',
    today:'Ближайшие 24 часа',
    soon:'Ближайшие 3 дня',
    later:'Позже',
    completed:'Выполнено',
    none:'Без срока'
  }[bucket] || 'Дедлайн';
}

function novaDeadlinePriority(due,completed=false){

  if(completed){
    return -100;
  }

  const now =
    Date.now()/1000;

  const diff =
    Number(due || 0) - now;

  if(diff < 0){
    return 1000 +
      Math.min(
        Math.abs(diff) / 3600,
        240
      );
  }

  if(diff <= 3600){
    return 950 -
      diff / 3600;
  }

  if(diff <= 86400){
    return 900 -
      diff / 3600;
  }

  if(diff <= 3 * 86400){
    return 700 -
      diff / 86400;
  }

  return Math.max(
    100,
    500 -
      diff / 86400
  );
}

function novaDeadlineWhy(row){

  if(row.completed){
    return 'Уже выполнено';
  }

  if(row.bucket === 'overdue'){
    return 'Срок уже прошёл';
  }

  if(row.bucket === 'today'){
    return 'Требует внимания в ближайшие 24 часа';
  }

  if(row.bucket === 'soon'){
    return 'Срок наступает в ближайшие 3 дня';
  }

  return 'Срок пока не близкий';
}

function novaDeadlineIdentity(item,kind,fallback=''){

  if(
    typeof novaGlobalUpdateIdentity === 'function'
  ){

    return novaGlobalUpdateIdentity(
      item,
      kind
    );
  }

  const ref =
    item?.ref ||
    item?.activity?.ref ||
    null;

  if(ref?.courseId){
    return [
      kind,
      ref.courseId || 0,
      ref.cmid || 0,
      ref.instance || 0,
      ref.type || ''
    ].join(':');
  }

  return [
    kind,
    item?.id || '',
    item?.name || '',
    fallback
  ].join(':');
}

function novaDeadlineBuildRow(
  item,
  kind,
  source='campus'
){

  const due =
    novaDeadlineExtractDue(
      item
    );

  if(!due){
    return null;
  }

  const completed =
    novaDeadlineIsCompleted(
      item
    );

  const title =
    item?.name ||
    item?.title ||
    item?.identity?.name ||
    (kind === 'test' ? 'Тест' : 'Задание');

  const course =
    activityCourseName(
      item
    );

  const ref =
    typeof novaGlobalUpdateActivityRef === 'function'
      ? novaGlobalUpdateActivityRef(item)
      : null;

  const bucket =
    completed
      ? 'completed'
      : novaDeadlineBucket(
          due
        );

  return {
    id:novaDeadlineIdentity(
      item,
      kind,
      String(due)
    ),
    source,
    kind,
    title,
    course,
    due,
    completed,
    bucket,
    bucketLabel:
      novaDeadlineBucketLabel(
        bucket
      ),
    priority:
      novaDeadlinePriority(
        due,
        completed
      ),
    why:
      novaDeadlineWhy({
        due,
        completed,
        bucket
      }),
    ref,
    go:
      kind === 'test'
        ? 'tests'
        : 'tasks'
  };
}

function novaDeadlineItems(){

  const rows = [];

  const add = row => {
    if(!row){
      return;
    }

    if(
      rows.some(
        existing =>
          existing.id === row.id
      )
    ){
      return;
    }

    rows.push(row);
  };

  for(
    const task of
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : []
  ){

    add(
      novaDeadlineBuildRow(
        task,
        'task',
        'task'
      )
    );
  }

  for(
    const test of
    Array.isArray(state.data.tests)
      ? state.data.tests
      : []
  ){

    add(
      novaDeadlineBuildRow(
        test,
        'test',
        'test'
      )
    );
  }

  /*
   * Calendar contributes deadline-like task/quiz events.
   * Ordinary lessons and generic calendar events are not
   * converted into deadlines.
   */
  const calendarEvents =
    flattenCalendar(
      state.data.calendar || {}
    );

  for(
    const event of calendarEvents
  ){

    const eventKind =
      typeof calendarEventKind === 'function'
        ? calendarEventKind(event)
        : '';

    if(
      eventKind !== 'task' &&
      eventKind !== 'quiz'
    ){
      continue;
    }

    const timestamp =
      novaDeadlineNormalizeTimestamp(
        event?.timestart
      );

    if(!timestamp){
      continue;
    }

    const pseudoItem = {
      id:event?.id || event?.name || '',
      name:event?.name || 'Событие',
      title:event?.name || 'Событие',
      course:
        event?.course?.fullname ||
        event?.course?.shortname ||
        '',
      due:timestamp,
      ref:event?.ref || null
    };

    const kind =
      eventKind === 'quiz'
        ? 'test'
        : 'task';

    const row =
      novaDeadlineBuildRow(
        pseudoItem,
        kind,
        'calendar'
      );

    if(row){
      add(row);
    }
  }

  return rows.sort(
    (a,b)=>{

      if(
        Number(a.completed) !==
        Number(b.completed)
      ){
        return Number(a.completed) -
          Number(b.completed);
      }

      const priorityDiff =
        Number(b.priority || 0) -
        Number(a.priority || 0);

      if(priorityDiff){
        return priorityDiff;
      }

      return Number(a.due || 0) -
        Number(b.due || 0);
    }
  );
}

function novaDeadlineFilter(){

  const allowed = [
    'all',
    'active',
    'overdue',
    'today',
    'soon'
  ];

  try{

    const stored =
      localStorage.getItem(
        NOVA_DEADLINE_FILTER_KEY
      ) || 'active';

    return allowed.includes(
      stored
    )
      ? stored
      : 'active';

  }catch{
    return 'active';
  }
}

function novaDeadlineSetFilter(value){

  const filter =
    [
      'all',
      'active',
      'overdue',
      'today',
      'soon'
    ].includes(value)
      ? value
      : 'active';

  state.deadlineFilter =
    filter;

  try{
    localStorage.setItem(
      NOVA_DEADLINE_FILTER_KEY,
      filter
    );
  }catch{}

  render();
}

function novaDeadlineFilteredItems(
  items=novaDeadlineItems()
){

  const filter =
    novaDeadlineFilter();

  if(filter === 'all'){
    return items;
  }

  if(filter === 'overdue'){
    return items.filter(
      item =>
        item.bucket === 'overdue' &&
        !item.completed
    );
  }

  if(filter === 'today'){
    return items.filter(
      item =>
        item.bucket === 'today' &&
        !item.completed
    );
  }

  if(filter === 'soon'){
    return items.filter(
      item =>
        (
          item.bucket === 'today' ||
          item.bucket === 'soon'
        ) &&
        !item.completed
    );
  }

  return items.filter(
    item =>
      !item.completed
  );
}

function novaDeadlineOpen(id){

  const item =
    novaDeadlineItems()
      .find(
        row =>
          row.id === String(id || '')
      );

  if(!item){
    return;
  }

  if(
    item.ref &&
    typeof openActivity === 'function'
  ){
    openActivity(item.ref);
    return;
  }

  navigate(
    item.go || (
      item.kind === 'test'
        ? 'tests'
        : 'tasks'
    )
  );
}

function novaDeadlineStats(
  items=novaDeadlineItems()
){

  const active =
    items.filter(
      item =>
        !item.completed
    );

  return {
    all:items.length,
    active:active.length,
    overdue:active.filter(
      item =>
        item.bucket === 'overdue'
    ).length,
    today:active.filter(
      item =>
        item.bucket === 'today'
    ).length,
    soon:active.filter(
      item =>
        item.bucket === 'today' ||
        item.bucket === 'soon'
    ).length,
    completed:
      items.length -
      active.length
  };
}

function novaDashboardDeadlineRadar(
  items = novaDeadlineItems()
){

  const active =
    items
      .filter(
        item =>
          !item.completed
      )
      .slice()
      .sort(
        (a,b) =>
          Number(b.priority || 0) -
          Number(a.priority || 0)
      );

  const overdue =
    active.filter(
      item =>
        item.bucket === 'overdue'
    ).length;

  const today =
    active.filter(
      item =>
        item.bucket === 'today'
    ).length;

  const soon =
    active.filter(
      item =>
        item.bucket === 'today' ||
        item.bucket === 'soon'
    ).length;

  return {
    items:active.slice(0,5),
    active:active.length,
    overdue,
    today,
    soon,
    next:active[0] || null
  };
}

function deadlinePage(){

  if(
    state.status.deadlines ===
    'loading'
  ){

    return `
      <section
        class="page nova-deadlines-page"
      >

        ${PageHead({
          eyebrow:'DEADLINE INTELLIGENCE',
          title:'Дедлайны',
          sub:'Собираем сроки из заданий, тестов и календаря…'
        })}

        ${skeletonGrid(6)}

      </section>
    `;
  }

  if(
    state.status.deadlines ===
    'error'
  ){

    return `
      <section
        class="page nova-deadlines-page"
      >

        ${PageHead({
          eyebrow:'DEADLINE INTELLIGENCE',
          title:'Дедлайны',
          sub:'Не удалось собрать сроки из Campus.'
        })}

        ${statePanel(
          'error',
          'deadlines'
        )}

      </section>
    `;
  }

  const all =
    novaDeadlineItems();

  const visible =
    novaDeadlineFilteredItems(
      all
    );

  const stats =
    novaDeadlineStats(
      all
    );

  const filter =
    novaDeadlineFilter();

  const next =
    all.find(
      item =>
        !item.completed
    );

  return `
    <section
      class="page nova-deadlines-page"
    >

      ${PageHead({
        eyebrow:'DEADLINE INTELLIGENCE',
        title:'Дедлайны',
        sub:
          all.length
            ? `${stats.active} активных сроков · ${stats.overdue} просрочено`
            : 'Активных дедлайнов сейчас нет.',
        children:`
          <button
            class="secondary"
            data-retry="deadlines"
            type="button"
          >
            ${icon('refresh',15)}
            Обновить
          </button>
        `
      })}

      ${
        next
          ? `
            <section
              class="nova-deadline-next"
            >

              <div
                class="nova-deadline-next-icon"
              >
                ${icon(
                  next.kind === 'test'
                    ? 'quiz'
                    : 'check-square',
                  20
                )}
              </div>

              <div
                class="nova-deadline-next-main"
              >

                <span>
                  СЛЕДУЮЩИЙ ДЕДЛАЙН
                </span>

                <b>
                  ${esc(next.title)}
                </b>

                <small>
                  ${esc(next.course)} ·
                  ${esc(formatLong(next.due))}
                </small>

              </div>

              <div
                class="nova-deadline-next-side"
              >

                <strong
                  class="tone-${esc(next.bucket)}"
                >
                  ${esc(next.bucketLabel)}
                </strong>

                <small>
                  ${esc(next.why)}
                </small>

              </div>

              <button
                type="button"
                class="secondary"
                data-deadline-open="${esc(next.id)}"
              >
                Открыть
                ${icon('arrow',14)}
              </button>

            </section>
          `
          : ''
      }

      <div
        class="nova-deadline-stats"
      >

        <div
          class="
            nova-deadline-stat
            overdue
          "
        >
          <span>${icon('close',16)}</span>
          <b>${stats.overdue}</b>
          <small>просрочено</small>
        </div>

        <div
          class="
            nova-deadline-stat
            today
          "
        >
          <span>${icon('clock',16)}</span>
          <b>${stats.today}</b>
          <small>в ближайшие 24 часа</small>
        </div>

        <div
          class="
            nova-deadline-stat
            soon
          "
        >
          <span>${icon('calendar',16)}</span>
          <b>${stats.soon}</b>
          <small>в ближайшие 3 дня</small>
        </div>

        <div
          class="
            nova-deadline-stat
            all
          "
        >
          <span>${icon('check-square',16)}</span>
          <b>${stats.active}</b>
          <small>активных всего</small>
        </div>

      </div>

      <section
        class="nova-deadline-panel"
      >

        <div
          class="nova-deadline-toolbar"
        >

          <div>
            <span class="eyebrow">
              ПЛАН
            </span>

            <h2>
              Что требует внимания
            </h2>

            <small>
              Приоритет считается по реальному сроку.
            </small>
          </div>

          <div
            class="nova-deadline-filters"
          >

            ${[
              ['active','Активные',stats.active],
              ['all','Все',stats.all],
              ['overdue','Просроченные',stats.overdue],
              ['today','24 часа',stats.today],
              ['soon','3 дня',stats.soon]
            ].map(
              ([value,label,count])=>`
                <button
                  type="button"
                  class="
                    nova-deadline-filter
                    ${filter===value?'active':''}
                  "
                  data-deadline-filter="${value}"
                >
                  ${label}
                  <span>${count}</span>
                </button>
              `
            ).join('')}

          </div>

        </div>

        <div
          class="nova-deadline-list"
        >

          ${
            visible.length
              ? visible.map(
                  item=>`
                    <article
                      class="
                        nova-deadline-row
                        ${item.completed?'is-completed':''}
                        tone-${esc(item.bucket)}
                      "
                    >

                      <div
                        class="nova-deadline-kind"
                      >
                        ${icon(
                          item.kind === 'test'
                            ? 'quiz'
                            : 'check-square',
                          18
                        )}
                      </div>

                      <div
                        class="nova-deadline-copy"
                      >

                        <small>
                          ${
                            item.kind === 'test'
                              ? 'ТЕСТ'
                              : 'ЗАДАНИЕ'
                          }
                          ·
                          ${esc(item.source)}
                        </small>

                        <b>
                          ${esc(item.title)}
                        </b>

                        <span>
                          ${esc(item.course)}
                        </span>

                      </div>

                      <div
                        class="nova-deadline-when"
                      >

                        <strong
                          class="
                            tone-${esc(item.bucket)}
                          "
                        >
                          ${esc(item.bucketLabel)}
                        </strong>

                        <time>
                          ${esc(formatLong(item.due))}
                        </time>

                        <small>
                          ${esc(item.why)}
                        </small>

                      </div>

                      <button
                        type="button"
                        class="nova-deadline-open"
                        data-deadline-open="${esc(item.id)}"
                        aria-label="Открыть ${esc(item.title)}"
                      >
                        ${icon('arrow',15)}
                      </button>

                    </article>
                  `
                ).join('')
              : `
                <div
                  class="
                    nova-deadline-empty
                  "
                >

                  <div>
                    ${icon('check',23)}
                  </div>

                  <b>
                    ${
                      filter === 'overdue'
                        ? 'Просроченных дедлайнов нет'
                        : filter === 'today'
                          ? 'На ближайшие 24 часа всё спокойно'
                          : filter === 'soon'
                            ? 'В ближайшие 3 дня дедлайнов нет'
                            : 'Активных дедлайнов нет'
                    }
                  </b>

                  <p>
                    Nova проверяет реальные сроки из
                    заданий, тестов и календаря Campus.
                  </p>

                </div>
              `
          }

        </div>

      </section>

      <div
        class="nova-deadline-note"
      >
        ${icon('info',14)}

        <span>
          Дедлайн считается по данным Campus.
          Nova не меняет сроки, статусы или оценки.
        </span>

      </div>

    </section>
  `;
}

function novaDashboardDeadlineInfo(ts){
  const value = Number(ts || 0);
  if(!value){
    return {
      tone:'later',
      label:'Без срока'
    };
  }

  const due =
    new Date(value * 1000);

  const now =
    new Date();

  const startToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const startDue =
    new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );

  const dayDiff =
    Math.round(
      (startDue - startToday) /
      86400000
    );

  if(due.getTime() < now.getTime()){
    return {
      tone:'overdue',
      label:'Просрочено'
    };
  }

  if(dayDiff === 0){
    return {
      tone:'today',
      label:'Сегодня · ' + formatTime(ts)
    };
  }

  if(dayDiff === 1){
    return {
      tone:'tomorrow',
      label:'Завтра · ' + formatTime(ts)
    };
  }

  if(dayDiff <= 3){
    return {
      tone:'soon',
      label:'Через ' + dayDiff + ' дн. · ' + formatDate(ts)
    };
  }

  return {
    tone:'later',
    label:formatLong(ts)
  };
}

function novaDashboardDeadlineRows(tasks, limit=6){
  return (tasks || [])
    .map(task => ({
      task,
      due:novaDashboardTaskDue(task)
    }))
    .filter(item => item.due > 0)
    .sort((a,b) => a.due - b.due)
    .slice(0,limit);
}

function novaDashboardNextAction(tasks){

  const now =
    Date.now()/1000;

  const candidates=[];

  const addDueCandidate=(
    item,
    kind
  )=>{
    const due=
      novaDashboardTaskDue(item) ||
      activityDue(item);

    if(!due || due<=0){
      return;
    }

    const distance=
      due-now;

    let score=0;

    if(distance<0){
      score=1000000000+
        Math.min(
          86400000,
          Math.abs(distance)
        );
    }else if(distance<=3600){
      score=900000000-
        distance;
    }else if(distance<=86400){
      score=700000000-
        distance;
    }else if(distance<=259200){
      score=500000000-
        distance;
    }else{
      score=300000000-
        Math.min(
          distance,
          30*86400
        );
    }

    candidates.push({
      kind,
      item,
      task:
        kind==='task'
          ? item
          : null,
      test:
        kind==='test'
          ? item
          : null,
      due,
      score
    });
  };

  for(
    const task of
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : []
  ){
    addDueCandidate(
      task,
      'task'
    );
  }

  for(
    const test of
    Array.isArray(state.data.tests)
      ? state.data.tests
      : []
  ){
    addDueCandidate(
      test,
      'test'
    );
  }

  /*
   * Unread messages are actionable,
   * but a concrete deadline wins over them.
   */
  const unread=
    novaDashboardUnreadMessages();

  if(unread>0){

    candidates.push({
      kind:'message',
      score:600000000+
        Math.min(
          unread,
          99
        ),
      unread
    });

  }

  /*
   * The imported schedule is another real source
   * of immediate actions.
   */
  if(
    state.scheduleImport &&
    novaScheduleIsCurrent() &&
    typeof novaScheduleNextLesson==='function'
  ){

    const lesson=
      novaScheduleNextLesson();

    if(lesson){

      const lessonDate=
        scheduleDateKey(
          lesson.date
        );

      const todayKey=
        scheduleTodayKey();

      let score=
        lesson.diffDays===0
          ? 450000000
          : lesson.diffDays===1
            ? 250000000
            : 100000000;

      if(
        lessonDate===todayKey &&
        Number.isFinite(
          Number(lesson.startMinutes)
        )
      ){

        const currentMinutes=
          new Date().getHours()*60+
          new Date().getMinutes();

        const minutesUntil=
          Number(
            lesson.startMinutes
          )-
          currentMinutes;

        if(
          minutesUntil>=0 &&
          minutesUntil<=120
        ){
          score=
            650000000-
            minutesUntil;
        }

      }

      candidates.push({
        kind:'lesson',
        lesson,
        score
      });
    }
  }

  if(!candidates.length){
    return null;
  }

  candidates.sort(
    (a,b)=>
      Number(b.score||0)-
      Number(a.score||0)
  );

  return candidates[0];
}

function novaDashboardAgendaRows(){
  const now =
    new Date();

  const todayKey =
    [
      now.getFullYear(),
      String(now.getMonth()+1).padStart(2,'0'),
      String(now.getDate()).padStart(2,'0')
    ].join('-');

  if(
    state.scheduleImport &&
    novaScheduleIsCurrent() &&
    typeof novaScheduleTodayLessons === 'function'
  ){
    return novaScheduleTodayLessons()
      .slice()
      .sort(
        (a,b) =>
          Number(a?.startMinutes || 0) -
          Number(b?.startMinutes || 0)
      )
      .slice(0,8)
      .map(lesson => ({
        type:'lesson',
        time:lesson.start || '--:--',
        end:lesson.end || '',
        title:lesson.subject || 'Занятие',
        meta:[
          lesson.room ? 'ауд. ' + lesson.room : '',
          lesson.teacher || ''
        ].filter(Boolean).join(' · '),
        action:'schedule'
      }));
  }

  const events =
    flattenCalendar(
      state.data.calendar || {}
    )
      .filter(
        event =>
          dateKey(event.timestart) === todayKey
      )
      .sort(
        (a,b) =>
          Number(a.timestart || 0) -
          Number(b.timestart || 0)
      )
      .slice(0,8);

  return events.map(event => ({
    type:'event',
    time:formatTime(event.timestart),
    end:'',
    title:event.name || 'Событие',
    meta:event.course?.fullname || event.course?.shortname || 'Campus',
    action:'calendar'
  }));
}

function novaDashboardUnreadMessages(){
  return (state.data.messages?.conversations || [])
    .reduce(
      (sum,item) =>
        sum +
        Number(
          item?.unreadcount ||
          item?.unreadCount ||
          0
        ),
      0
    );
}

function novaDashboardAverage(grades){
  const values =
    (grades || [])
      .map(
        item =>
          parseFloat(
            String(
              item?.grade ?? ''
            ).replace(',','.')
          )
      )
      .filter(Number.isFinite);

  return values.length
    ? (
        values.reduce(
          (sum,value) =>
            sum + value,
          0
        ) / values.length
      )
        .toFixed(1)
        .replace('.',',')
    : '—';
}

function novaDashboardProgressCourses(courses, limit=6){
  return (courses || [])
    .map(course => ({
      course,
      progress:Number.isFinite(Number(course?.progress))
        ? Math.max(
            0,
            Math.min(
              100,
              Number(course.progress)
            )
          )
        : null
    }))
    .filter(item => item.course)
    .slice(0,limit);
}

function novaDashboardImportantItems(tasks, grades){
  const items=[];
  const unread=novaDashboardUnreadMessages();

  if(unread){
    items.push({
      icon:'message',
      tone:'message',
      title:'Непрочитанные сообщения',
      meta:`${unread} ${unread === 1 ? 'новое сообщение' : 'новых сообщений'}`,
      go:'messages'
    });
  }

  const deadlines =
    novaDashboardDeadlineRows(tasks,1)[0];

  const tests=
    Array.isArray(state.data.tests)
      ? state.data.tests
      : [];

  if(tests.length){
    const test=
      tests
        .map(item=>({
          item,
          due:
            activityDue(item)
        }))
        .filter(
          entry=>entry.due
        )
        .sort(
          (a,b)=>
            a.due-b.due
        )[0];

    if(test){
      items.push({
        icon:'quiz',
        tone:'grade',
        title:
          test.item?.name||
          test.item?.identity?.name||
          'Ближайший тест',
        meta:
          `Тест · ${formatDate(test.due)}`,
        activity:test.item
      });
    }
  }

  if(deadlines){
    const info =
      novaDashboardDeadlineInfo(
        deadlines.due
      );

    items.push({
      icon:'check-square',
      tone:'task',
      title:deadlines.task?.name || 'Ближайшее задание',
      meta:info.label,
      activity:deadlines.task
    });
  }

  if((grades || []).length){
    const grade=grades[0];
    items.push({
      icon:'chart',
      tone:'grade',
      title:grade?.course || grade?.name || 'Последняя оценка',
      meta:'Оценка: ' + (grade?.grade || '—'),
      go:'grades'
    });
  }

  if(!items.length){
    items.push({
      icon:'sparkle',
      tone:'message',
      title:'Всё спокойно',
      meta:'Новых критичных событий сейчас нет.',
      go:'dashboard'
    });
  }

  return items.slice(0,4);
}
function metric(iconName,label,value,sub,route,cls){return `<button class="metric ${cls}" data-go="${route}"><span class="metric-icon">${icon(iconName,22)}</span><span><small>${esc(label)}</small><strong>${esc(String(value))}</strong><em>${esc(sub)} ${icon('arrow',13)}</em></span></button>`}

function novaScheduleTodayLessons() {
  const schedule =
    state.scheduleImport;

  const lessons =
    Array.isArray(
      schedule?.lessons
    )
      ? schedule.lessons
      : [];

  const today =
    new Date();

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1)
      .padStart(2, '0'),
    String(today.getDate())
      .padStart(2, '0')
  ].join('-');

  return lessons
    .filter(
      lesson =>
        String(
          lesson?.date || ''
        ).slice(0, 10) === todayKey
    )
    .sort(
      (a, b) =>
        Number(
          a?.startMinutes || 0
        ) -
        Number(
          b?.startMinutes || 0
        )
    );
}


function novaScheduleUpcomingLessons(limit = 6){
  const schedule =
    state.scheduleImport;

  const lessons =
    Array.isArray(schedule?.lessons)
      ? schedule.lessons
      : [];

  const todayKey =
    scheduleTodayKey();

  const now =
    new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  return lessons
    .filter(lesson => {
      const date =
        scheduleDateKey(
          lesson?.date
        );

      if(!date){
        return false;
      }

      if(date > todayKey){
        return true;
      }

      if(date < todayKey){
        return false;
      }

      return Number(
        lesson?.endMinutes || 0
      ) > currentMinutes;
    })
    .sort((a,b) => {
      const dateA =
        scheduleDateKey(a?.date);

      const dateB =
        scheduleDateKey(b?.date);

      if(dateA !== dateB){
        return dateA.localeCompare(
          dateB
        );
      }

      return (
        Number(
          a?.startMinutes || 0
        ) -
        Number(
          b?.startMinutes || 0
        )
      );
    })
    .slice(
      0,
      Math.max(1, Number(limit) || 1)
    );
}

function novaScheduleNextLesson(){
  const next =
    novaScheduleUpcomingLessons(1)[0];

  if(!next){
    return null;
  }

  const todayKey =
    scheduleTodayKey();

  const date =
    scheduleDateKey(
      next?.date
    );

  const today =
    new Date(
      `${todayKey}T12:00:00`
    );

  const lessonDate =
    new Date(
      `${date}T12:00:00`
    );

  const diffDays =
    Math.round(
      (
        lessonDate.getTime() -
        today.getTime()
      ) / 86400000
    );

  return {
    ...next,
    date,
    diffDays,
    dayLabel:
      diffDays === 0
        ? 'Сегодня'
        : diffDays === 1
          ? 'Завтра'
          : scheduleDayText(date),
    isToday:
      diffDays === 0,
    isTomorrow:
      diffDays === 1
  };
}

function novaScheduleFocusLabel(){
  const next =
    novaScheduleNextLesson();

  if(!next){
    return 'Занятий больше нет';
  }

  return next.isToday
    ? 'Занятий сегодня'
    : next.isTomorrow
      ? 'Занятий завтра'
      : 'Ближайшие занятия';
}

function novaScheduleDashboardTitle(){
  const next =
    novaScheduleNextLesson();

  if(!next){
    return 'Расписание';
  }

  return next.isToday
    ? 'Расписание на сегодня'
    : next.isTomorrow
      ? 'Расписание на завтра'
      : 'Ближайшие занятия';
}

function novaScheduleIsCurrent() {
  const schedule =
    state.scheduleImport;

  const start =
    String(
      schedule?.period?.startDate || ''
    );

  const end =
    String(
      schedule?.period?.endDate || ''
    );

  if(!start || !end){
    return false;
  }

  const today =
    novaScheduleTodayLessons();

  if(today.length){
    return true;
  }

  const now =
    new Date();

  const key = [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, '0'),
    String(
      now.getDate()
    ).padStart(2, '0')
  ].join('-');

  return (
    key >= start &&
    key <= end
  );
}

function novaScheduleDashboardLesson(
  lesson
){
  const type =
    scheduleTypeClass(
      lesson?.type
    );

  const meta = [
    lesson?.room
      ? `ауд. ${lesson.room}`
      : '',
    lesson?.teacher || ''
  ]
    .filter(Boolean)
    .join(' · ');

  return `
    <button
      class="
        nova-dashboard-schedule-row
        schedule-tone-${esc(type)}
      "
      data-go="schedule"
      type="button"
    >

      <span class="nova-dashboard-schedule-time">
        <b>
          ${esc(
            lesson?.start || '--:--'
          )}
        </b>

        <small>
          ${esc(
            lesson?.end || '--:--'
          )}
        </small>
      </span>

      <span class="nova-dashboard-schedule-accent"></span>

      <span class="nova-dashboard-schedule-main">

        <b>
          ${esc(
            lesson?.subject ||
            'Занятие'
          )}
        </b>

        <small>
          ${
            meta
              ? esc(meta)
              : scheduleTypeLabel(
                  lesson?.type
                )
          }
        </small>

      </span>

      <span class="nova-dashboard-schedule-arrow">
        ${icon('arrow',14)}
      </span>

    </button>
  `;
}


function novaScheduleDashboardContent(){
  const schedule =
    state.scheduleImport;

  if(!schedule){
    return `
      <div class="nova-dashboard-schedule-empty-final">
        <div class="nova-dashboard-empty-icon-final">
          ${icon('calendar',18)}
        </div>

        <div class="nova-dashboard-empty-copy-final">
          <b>Добавь своё расписание</b>
          <small>
            Nova будет показывать ближайшие занятия
            прямо на главной.
          </small>
        </div>

        <button
          class="secondary"
          type="button"
          data-schedule-action="import"
        >
          Добавить
        </button>
      </div>
    `;
  }

  if(!novaScheduleIsCurrent()){
    return `
      <div class="nova-dashboard-schedule-empty-final">
        <div class="nova-dashboard-empty-icon-final warning">
          ${icon('refresh',18)}
        </div>

        <div class="nova-dashboard-empty-copy-final">
          <b>Обнови расписание</b>
          <small>
            Сохранённая учебная неделя закончилась.
          </small>
        </div>

        <button
          class="secondary"
          type="button"
          data-schedule-action="import"
        >
          Обновить
        </button>
      </div>
    `;
  }

  const upcoming =
    novaScheduleUpcomingLessons(4);

  const next =
    upcoming[0] || null;

  if(!next){
    return `
      <div class="nova-dashboard-finished-final">

        <div class="nova-dashboard-finished-icon-final">
          ${icon('check',18)}
        </div>

        <div>
          <b>На сегодня занятий больше нет</b>
          <small>
            Следующие занятия появятся после обновления
            новой учебной недели.
          </small>
        </div>

      </div>
    `;
  }

  const todayKey =
    scheduleTodayKey();

  const firstDate =
    scheduleDateKey(
      next.date
    );

  const firstDayIsTomorrow =
    firstDate >
    todayKey;

  return `
    <div class="nova-dashboard-schedule-header-final">

      <span>
        ${
          firstDayIsTomorrow
            ? 'Сегодня пары уже закончились'
            : 'Ближайшие занятия'
        }
      </span>

      <b>
        ${
          firstDayIsTomorrow
            ? 'Завтра'
            : 'Сегодня'
        }
      </b>

    </div>

    <div class="nova-dashboard-schedule-list-final">

      ${
        upcoming.map(
          lesson => {

            const date =
              scheduleDateKey(
                lesson.date
              );

            const label =
              date === todayKey
                ? 'Сегодня'
                : (() => {
                    const tomorrow =
                      new Date(
                        `${todayKey}T12:00:00`
                      );

                    tomorrow.setDate(
                      tomorrow.getDate() + 1
                    );

                    const tomorrowKey =
                      [
                        tomorrow.getFullYear(),
                        String(
                          tomorrow.getMonth() + 1
                        ).padStart(2,'0'),
                        String(
                          tomorrow.getDate()
                        ).padStart(2,'0')
                      ].join('-');

                    return date === tomorrowKey
                      ? 'Завтра'
                      : scheduleDayText(date);
                  })();

            return `
              <button
                class="nova-dashboard-lesson-final"
                type="button"
                data-go="schedule"
              >

                <span class="nova-dashboard-lesson-time-final">

                  <b>
                    ${esc(
                      lesson.start ||
                      '--:--'
                    )}
                  </b>

                  <small>
                    ${esc(
                      lesson.end ||
                      ''
                    )}
                  </small>

                </span>

                <span class="nova-dashboard-lesson-main-final">

                  <span class="nova-dashboard-lesson-day-final">
                    ${esc(label)}
                  </span>

                  <b>
                    ${esc(
                      lesson.subject ||
                      'Занятие'
                    )}
                  </b>

                  <small>
                    ${
                      [
                        lesson.room
                          ? `ауд. ${lesson.room}`
                          : '',
                        lesson.teacher || ''
                      ]
                        .filter(Boolean)
                        .map(esc)
                        .join(' · ') ||
                      scheduleTypeLabel(
                        lesson.type
                      )
                    }
                  </small>

                </span>

                <span class="nova-dashboard-lesson-arrow-final">
                  ${icon('arrow',13)}
                </span>

              </button>
            `;
          }
        ).join('')
      }

    </div>
  `;
}

function novaNextLessonPanel(){
  const schedule =
    state.scheduleImport;

  const next =
    novaScheduleNextLesson();

  if(!schedule || !novaScheduleIsCurrent()){
    return Panel({
      title:'Ближайшая пара',
      iconName:'clock',
      action:'Добавить',
      children:`
        <div class="nova-next-empty-final">

          <div class="nova-next-empty-icon-final">
            ${icon('calendar',17)}
          </div>

          <div>
            <b>Расписание ещё не добавлено</b>
            <small>
              Добавь учебную неделю из Telegram-бота.
            </small>
          </div>

          <button
            class="secondary"
            type="button"
            data-schedule-action="import"
          >
            Добавить
          </button>

        </div>
      `
    });
  }

  if(!next){
    return Panel({
      title:'Ближайшая пара',
      iconName:'check',
      action:'Расписание',
      go:'schedule',
      children:`
        <div class="nova-next-empty-final">

          <div class="nova-next-empty-icon-final">
            ${icon('check',17)}
          </div>

          <div>
            <b>На сегодня всё</b>
            <small>
              Следующее занятие появится
              после обновления новой недели.
            </small>
          </div>

        </div>
      `
    });
  }

  const details = [
    next.room
      ? `ауд. ${next.room}`
      : '',
    next.teacher || ''
  ]
    .filter(Boolean)
    .join(' · ');

  return Panel({
    title:
      next.isTomorrow
        ? 'Следующая пара · завтра'
        : next.isToday
          ? 'Следующая пара'
          : 'Ближайшая пара',
    iconName:'clock',
    action:'Всё расписание',
    go:'schedule',
    children:`
      <div class="nova-next-card-final">

        <div class="nova-next-card-time-final">

          <b>
            ${esc(
              next.start ||
              '--:--'
            )}
          </b>

          <span>
            ${esc(
              next.end ||
              ''
            )}
          </span>

        </div>

        <div class="nova-next-card-main-final">

          <div class="nova-next-card-status-final">
            ${esc(
              next.isTomorrow
                ? 'ЗАВТРА'
                : next.isToday
                  ? 'СЕГОДНЯ'
                  : 'БЛИЖАЙШЕЕ'
            )}
          </div>

          <h3>
            ${esc(
              next.subject ||
              'Занятие'
            )}
          </h3>

          <p>
            ${esc(
              details ||
              scheduleTypeLabel(
                next.type
              )
            )}
          </p>

        </div>

        <span class="nova-next-card-arrow-final">
          ${icon('arrow',16)}
        </span>

      </div>
    `
  });
}


function novaGlobalUpdateStorageKey(){
  return 'nova-whats-new-v1';
}

function novaGlobalUpdateNormalizeTimestamp(value){
  const n=Number(value||0);

  if(!Number.isFinite(n)||n<=0){
    return 0;
  }

  return n>20000000000
    ? Math.floor(n/1000)
    : Math.floor(n);
}

function novaGlobalUpdateActivityRef(item){
  if(!item){
    return null;
  }

  const ref=
    item?.ref||
    item?.activity?.ref;

  if(!ref?.courseId){
    return null;
  }

  return {
    courseId:Number(ref.courseId)||null,
    cmid:Number(ref.cmid)||null,
    instance:Number(ref.instance)||null,
    contextId:Number(ref.contextId)||null,
    type:String(ref.type||'').toLowerCase()||null
  };
}

function novaGlobalUpdateIdentity(item,fallback=''){
  const ref=
    novaGlobalUpdateActivityRef(item);

  if(ref){
    return [
      'activity',
      ref.courseId||0,
      ref.cmid||0,
      ref.instance||0,
      ref.type||'activity'
    ].join(':');
  }

  if(item?.id!=null){
    return `${fallback}:id:${item.id}`;
  }

  return [
    fallback,
    item?.courseId||'',
    item?.course||'',
    item?.name||'',
    item?.identity?.name||''
  ].join(':').toLowerCase();
}

function novaGlobalUpdateFingerprint(value){
  try{
    return JSON.stringify(value);
  }catch{
    return String(value||'');
  }
}

function novaGlobalUpdateCourseName(item){
  return (
    item?.relations?.course?.name||
    item?.course?.fullname||
    item?.course?.name||
    item?.course||
    activityCourseName(item)
  );
}

function novaGlobalUpdateBuildSnapshot(){

  const snapshot={};
  const rows=[];

  const add=(entry)=>{
    if(!entry?.id){
      return;
    }

    snapshot[entry.id]={
      fingerprint:entry.fingerprint,
      title:entry.title,
      meta:entry.meta,
      type:entry.type,
      icon:entry.icon,
      ref:entry.ref||null,
      go:entry.go||null,
      param:entry.param||''
    };

    rows.push({
      ...snapshot[entry.id],
      id:entry.id
    });
  };

  /*
   * COURSES
   */
  for(
    const course of
    Array.isArray(state.data.courses)
      ? state.data.courses
      : []
  ){

    const title=
      course?.fullnamedisplay||
      course?.fullname||
      course?.shortname||
      course?.title||
      'Курс';

    const id=
      novaGlobalUpdateIdentity(
        course,
        'course'
      );

    add({
      id,
      type:'course',
      icon:'grid',
      title,
      meta:'Курс',
      ref:null,
      go:'course',
      param:String(
        course?.id||
        course?.ref?.courseId||
        ''
      ),
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          shortname:
            course?.shortname||
            course?.shortName||
            '',
          summary:
            course?.summary||
            course?.description||
            ''
        })
    });
  }

  /*
   * TASKS
   */
  for(
    const task of
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : []
  ){

    const title=
      task?.name||
      task?.identity?.name||
      'Задание';

    const id=
      novaGlobalUpdateIdentity(
        task,
        'task'
      );

    add({
      id,
      type:'task',
      icon:'check-square',
      title,
      meta:
        `Задание · ${novaGlobalUpdateCourseName(task)}`,
      ref:novaGlobalUpdateActivityRef(task),
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          due:
            task?.due||
            activityDue(task)||
            0,
          description:
            task?.description||
            task?.content?.description||
            '',
          state:
            task?.state||
            task?.completion||
            null
        })
    });
  }

  /*
   * TESTS
   */
  for(
    const test of
    Array.isArray(state.data.tests)
      ? state.data.tests
      : []
  ){

    const title=
      test?.name||
      test?.identity?.name||
      'Тест';

    const id=
      novaGlobalUpdateIdentity(
        test,
        'test'
      );

    add({
      id,
      type:'test',
      icon:'quiz',
      title,
      meta:
        `Тест · ${novaGlobalUpdateCourseName(test)}`,
      ref:novaGlobalUpdateActivityRef(test),
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          dates:
            test?.content?.dates||
            test?.dates||
            [],
          description:
            test?.description||
            test?.content?.description||
            '',
          state:
            test?.state||
            null
        })
    });
  }

  /*
   * MATERIALS
   */
  for(
    const material of
    Array.isArray(state.data.materials)
      ? state.data.materials
      : []
  ){

    const title=
      material?.name||
      material?.identity?.name||
      'Материал';

    const id=
      novaGlobalUpdateIdentity(
        material,
        'material'
      );

    add({
      id,
      type:'material',
      icon:'book',
      title,
      meta:
        `Материал · ${novaGlobalUpdateCourseName(material)}`,
      ref:novaGlobalUpdateActivityRef(material),
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          description:
            material?.description||
            material?.content?.description||
            '',
          files:
            material?.content?.files||
            []
        })
    });
  }

  /*
   * FILES
   */
  for(
    const entry of
    Array.isArray(state.data.files)
      ? state.data.files
      : []
  ){

    const activity=
      entry?.activity||
      {};

    const file=
      entry?.file||
      {};

    const title=
      file?.filename||
      activity?.identity?.name||
      'Файл';

    const id=
      [
        'file',
        novaGlobalUpdateIdentity(
          activity,
          'activity'
        ),
        title
      ]
        .join(':')
        .toLowerCase();

    add({
      id,
      type:'file',
      icon:'file',
      title,
      meta:
        `Файл · ${novaGlobalUpdateCourseName(activity)}`,
      ref:
        novaGlobalUpdateActivityRef(
          activity
        ),
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          mimetype:
            file?.mimetype||
            '',
          filesize:
            Number(file?.filesize||0),
          filepath:
            file?.filepath||
            ''
        })
    });
  }

  /*
   * MESSAGES
   */
  for(
    const conversation of
    state.data.messages?.conversations||
    []
  ){

    const messages=
      Array.isArray(
        conversation?.messages
      )
        ? conversation.messages
        : [];

    const latest=
      messages[0]||
      {};

    const title=
      conversation?.name||
      'Диалог';

    const latestTimestamp=
      novaGlobalUpdateNormalizeTimestamp(
        latest?.timecreated||
        conversation?.timemodified||
        conversation?.timecreated||
        0
      );

    const id=
      [
        'message',
        conversation?.id||
        conversation?.userid||
        title
      ]
        .join(':')
        .toLowerCase();

    add({
      id,
      type:'message',
      icon:'message',
      title,
      meta:
        Number(
          conversation?.unreadcount||0
        )>0
          ? `Сообщения · ${conversation.unreadcount} новых`
          : 'Сообщения',
      go:'messages',
      fingerprint:
        novaGlobalUpdateFingerprint({
          unread:
            Number(
              conversation?.unreadcount||0
            ),
          latest:
            messageText(
              latest?.text||
              latest?.message||
              ''
            ),
          latestTimestamp
        })
    });
  }

  /*
   * GRADES
   */
  for(
    const grade of
    Array.isArray(state.data.grades)
      ? state.data.grades
      : []
  ){

    const title=
      grade?.course||
      grade?.name||
      'Оценка';

    const id=
      novaGlobalUpdateIdentity(
        grade,
        'grade'
      );

    add({
      id,
      type:'grade',
      icon:'chart',
      title,
      meta:
        `Оценка · ${grade?.grade??'—'}`,
      go:'grades',
      fingerprint:
        novaGlobalUpdateFingerprint({
          title,
          grade:
            grade?.grade||
            '',
          percentage:
            grade?.percentage||
            grade?.contribution||
            '',
          range:
            grade?.range||
            '',
          modified:
            grade?.timemodified||
            grade?.timecreated||
            0
        })
    });
  }

  return {
    snapshot,
    rows
  };
}

function novaGlobalUpdateReadStore(){

  try{
    const raw=
      localStorage.getItem(
        novaGlobalUpdateStorageKey()
      );

    if(!raw){
      return {
        initialized:false,
        snapshot:{},
        events:[]
      };
    }

    const parsed=
      JSON.parse(raw);

    return {
      initialized:
        parsed?.initialized===true,
      snapshot:
        parsed?.snapshot&&
        typeof parsed.snapshot==='object'
          ? parsed.snapshot
          : {},
      events:
        Array.isArray(parsed?.events)
          ? parsed.events
          : []
    };

  }catch{
    return {
      initialized:false,
      snapshot:{},
      events:[]
    };
  }
}

function novaGlobalUpdateWriteStore(store){

  try{
    localStorage.setItem(
      novaGlobalUpdateStorageKey(),
      JSON.stringify({
        initialized:Boolean(
          store.initialized
        ),
        snapshot:
          store.snapshot||
          {},
        events:
          Array.isArray(store.events)
            ? store.events.slice(0,30)
            : []
      })
    );
  }catch{
  }
}

function novaGlobalUpdateCommit(){

  const built=
    novaGlobalUpdateBuildSnapshot();

  const store=
    novaGlobalUpdateReadStore();

  /*
   * First sync creates the baseline.
   * We intentionally do NOT call everything "new".
   */
  if(!store.initialized){

    novaGlobalUpdateWriteStore({
      initialized:true,
      snapshot:built.snapshot,
      events:[]
    });

    return [];
  }

  const events=[];

  for(
    const row of
    built.rows
  ){

    const previous=
      store.snapshot[row.id];

    if(!previous){
      events.push({
        type:row.type,
        icon:row.icon,
        title:row.title,
        meta:row.meta,
        ref:row.ref||
          null,
        go:row.go||
          null,
        param:row.param||
          '',
        label:'Новое',
        detectedAt:Date.now()
      });

      continue;
    }

    if(
      previous.fingerprint!==
      row.fingerprint
    ){
      events.push({
        type:row.type,
        icon:row.icon,
        title:row.title,
        meta:row.meta,
        ref:row.ref||
          null,
        go:row.go||
          null,
        param:row.param||
          '',
        label:'Обновлено',
        detectedAt:Date.now()
      });
    }
  }

  /*
   * Remove items that disappeared from the current Campus view.
   * A removal is not presented as a "news" item.
   */
  const merged=[
    ...events,
    ...store.events
  ];

  const unique=[];
  const seen=new Set();

  for(
    const event of
    merged
  ){

    const identity=
      [
        event.type,
        event.ref?.courseId||'',
        event.ref?.cmid||'',
        event.ref?.instance||'',
        event.title,
        event.label,
        event.detectedAt
      ].join(':');

    if(seen.has(identity)){
      continue;
    }

    seen.add(identity);
    unique.push(event);

    if(unique.length>=30){
      break;
    }
  }

  novaGlobalUpdateWriteStore({
    initialized:true,
    snapshot:built.snapshot,
    events:unique
  });

  return unique;
}

function novaGlobalUpdateEvents(limit=6){

  return novaGlobalUpdateReadStore()
    .events
    .slice(0,limit);
}

function novaDashboardUpdateItems(limit=6){

  return novaGlobalUpdateEvents(
    limit
  );
}

function novaDashboardUpdatesMarkup(){

  const items=
    novaDashboardUpdateItems(
      6
    );

  return `
    <section
      class="nova-command-panel nova-updates-panel nova19-global-updates"
    >

      <div
        class="nova-command-panel-head"
      >

        <div>

          <span>
            ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ
          </span>

          <h2>
            Что нового
          </h2>

        </div>

        ${
          items.length
            ? `
              <span class="nova-command-live nova19-live">
                <i></i>
                ${items.length} СВЕЖИХ
              </span>
            `
            : `
              <span class="nova19-sync-state">
                SYNC
              </span>
            `
        }

      </div>

      ${
        items.length
          ? `
            <div class="nova-update-list nova19-update-list">

              ${
                items
                  .map(item=>{

                    const attrs=
                      item.ref
                        ? `
                          data-activity="${activityRefAttr(
                            item.ref
                          )}"
                        `
                        : `
                          data-go="${esc(
                            item.go||
                            'dashboard'
                          )}"
                          ${
                            item.param
                              ? `data-param="${esc(item.param)}"`
                              : ''
                          }
                        `;

                    return `
                      <button
                        class="nova-update-row nova19-update-row"
                        type="button"
                        ${attrs}
                      >

                        <span
                          class="nova-update-icon ${esc(
                            item.type||
                            'update'
                          )}"
                        >
                          ${icon(
                            item.icon||
                            'sparkle',
                            15
                          )}
                        </span>

                        <span
                          class="nova-update-copy"
                        >

                          <b>
                            ${esc(
                              item.title||
                              'Изменение'
                            )}
                          </b>

                          <small>
                            ${esc(
                              item.meta||
                              'Campus'
                            )}
                          </small>

                        </span>

                        <span
                          class="nova19-update-badge ${esc(
                            item.label||
                            'Новое'
                          )}"
                        >
                          ${esc(
                            item.label||
                            'Новое'
                          )}
                        </span>

                        <span
                          class="nova-update-date"
                        >
                          ${esc(
                            novaGlobalUpdateDate(
                              item.detectedAt
                            )
                          )}
                        </span>

                        ${icon(
                          'arrow',
                          12
                        )}

                      </button>
                    `;
                  })
                  .join('')
              }

            </div>
          `
          : `
            <div
              class="nova-command-empty compact nova19-empty"
            >

              <span>
                ${icon('sparkle',17)}
              </span>

              <div>

                <b>
                  Изменений пока не обнаружено
                </b>

                <small>
                  Nova создала базовую точку данных.
                  Новые и изменённые элементы появятся
                  после следующей синхронизации с Campus.
                </small>

              </div>

            </div>
          `
      }

    </section>
  `;
}

function novaGlobalUpdateDate(timestamp){

  const ts=
    novaGlobalUpdateNormalizeTimestamp(
      timestamp
    );

  if(!ts){
    return 'сейчас';
  }

  const diff=
    Math.max(
      0,
      Date.now()-
      ts*1000
    );

  const minutes=
    Math.floor(
      diff/60000
    );

  if(minutes<1){
    return 'сейчас';
  }

  if(minutes<60){
    return `${minutes} мин назад`;
  }

  const hours=
    Math.floor(
      minutes/60
    );

  if(hours<24){
    return `${hours} ч назад`;
  }

  const days=
    Math.floor(
      hours/24
    );

  if(days===1){
    return 'вчера';
  }

  if(days<7){
    return `${days} дн назад`;
  }

  return formatLong(ts);
}

function dashboard(){
  const courses =
    Array.isArray(state.data.courses)
      ? state.data.courses
      : [];

  const tasks =
    Array.isArray(state.data.tasks)
      ? state.data.tasks
      : [];

  const grades =
    Array.isArray(state.data.grades)
      ? state.data.grades
      : [];

  const agenda =
    novaDashboardAgendaRows();

  const dayLabel =
    new Date().toLocaleDateString(
      'ru-RU',
      {
        weekday:'long',
        day:'numeric',
        month:'long'
      }
    );

  const nextAction =
    novaDashboardNextAction(tasks);

  const deadlineRadar =
    novaDashboardDeadlineRadar();

  const deadlineRows =
    deadlineRadar.items;

  const progressCourses =
    novaDashboardProgressCourses(courses,6);

  const importantItems =
    novaDashboardImportantItems(
      tasks,
      grades
    );

  const unread =
    novaDashboardUnreadMessages();

  const avg =
    novaDashboardAverage(grades);

  const completedProgress =
    progressCourses.filter(
      item =>
        item.progress !== null
    );

  const progressAvg =
    completedProgress.length
      ? Math.round(
          completedProgress.reduce(
            (sum,item) =>
              sum + item.progress,
            0
          ) /
          completedProgress.length
        )
      : 0;

  const actionMarkup =
    nextAction
      ? (()=>{

          if(
            nextAction.kind==='task'||
            nextAction.kind==='test'
          ){

            const item=
              nextAction.item||
              nextAction.task||
              nextAction.test||
              {};

            const due=
              nextAction.due||
              activityDue(item);

            const info=
              novaDashboardDeadlineInfo(
                due
              );

            const isTest=
              nextAction.kind===
              'test';

            const actionText=
              isTest
                ? 'Пройти'
                : 'Продолжить';

            const kicker=
              isTest
                ? 'БЛИЖАЙШИЙ ТЕСТ'
                : 'БЛИЖАЙШЕЕ ЗАДАНИЕ';

            return `
              <button
                class="
                  nova-command-action
                  nova20-smart-action
                "
                type="button"
                data-study-quickstart="${activityRefAttr(item)}"
              >

                <span
                  class="
                    nova-command-action-icon
                    tone-${esc(info.tone)}
                  "
                >
                  ${icon(
                    isTest
                      ? 'quiz'
                      : 'check-square',
                    20
                  )}
                </span>

                <span
                  class="nova-command-action-main"
                >

                  <span
                    class="nova-command-action-kicker"
                  >
                    ${kicker}
                  </span>

                  <b>
                    ${esc(
                      item?.name||
                      item?.identity?.name||
                      (
                        isTest
                          ? 'Ближайший тест'
                          : 'Ближайшее задание'
                      )
                    )}
                  </b>

                  <small>
                    ${esc(
                      activityCourseName(
                        item
                      )
                    )}
                  </small>

                </span>

                <span
                  class="nova-command-action-side"
                >

                  <strong>
                    ${esc(
                      info.label||
                      formatDate(due)
                    )}
                  </strong>

                  <span
                    class="nova20-action-label"
                  >
                    <span class="nova20-action-label-text">Учиться сейчас</span>
                    ${icon('arrow',15)}
                  </span>

                </span>

              </button>
            `;
          }

          if(
            nextAction.kind===
            'message'
          ){

            return `
              <button
                class="
                  nova-command-action
                  nova20-smart-action
                  nova20-message-action
                "
                type="button"
                data-go="messages"
              >

                <span
                  class="
                    nova-command-action-icon
                    tone-tomorrow
                  "
                >
                  ${icon('message',20)}
                </span>

                <span
                  class="nova-command-action-main"
                >

                  <span
                    class="nova-command-action-kicker"
                  >
                    ВНИМАНИЕ
                  </span>

                  <b>
                    Новые сообщения
                  </b>

                  <small>
                    ${esc(
                      `${nextAction.unread} ${
                        nextAction.unread===1
                          ? 'непрочитанное сообщение'
                          : 'непрочитанных сообщений'
                      }`
                    )}
                  </small>

                </span>

                <span
                  class="nova-command-action-side"
                >

                  <strong>
                    ${esc(
                      String(
                        nextAction.unread
                      )
                    )}
                  </strong>

                  <span
                    class="nova20-action-label"
                  >
                    <span class="nova20-action-label-text">Открыть</span>
                    ${icon('arrow',15)}
                  </span>

                </span>

              </button>
            `;
          }

          return `
            <button
              class="
                nova-command-action
                nova20-smart-action
              "
              type="button"
              data-go="schedule"
            >

              <span
                class="
                  nova-command-action-icon
                  tone-tomorrow
                "
              >
                ${icon('clock',20)}
              </span>

              <span
                class="nova-command-action-main"
              >

                <span
                  class="nova-command-action-kicker"
                >
                  ${
                    nextAction.lesson?.isTomorrow
                      ? 'ЗАВТРА'
                      : 'СЛЕДУЮЩАЯ ПАРА'
                  }
                }

                <b>
                  ${esc(
                    nextAction.lesson?.subject||
                    'Ближайшее занятие'
                  )}
                </b>

                <small>
                  ${esc(
                    [
                      nextAction.lesson?.start||
                        '',
                      nextAction.lesson?.room
                        ? 'ауд. '+
                          nextAction.lesson.room
                        : '',
                      nextAction.lesson?.teacher||
                        ''
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  )}
                </small>

              </span>

              <span
                class="nova-command-action-side"
              >

                <strong>
                  ${esc(
                    nextAction.lesson?.start||
                    '--:--'
                  )}
                </strong>

                <span
                  class="nova20-action-label"
                >
                  Открыть
                  ${icon('arrow',15)}
                </span>

              </span>

            </button>
          `;
        })()
      : `
          <div
            class="
              nova-command-empty
              nova20-smart-empty
            "
          >
            <span>
              ${icon('check',18)}
            </span>

            <div>
              <b>
                Сейчас всё спокойно
              </b>

              <small>
                Нет срочных заданий, тестов,
                сообщений или ближайших занятий.
              </small>
            </div>
          </div>
        `;


  const agendaMarkup =
    agenda.length
      ? agenda.map(row => `
          <button
            class="nova-command-agenda-row"
            type="button"
            data-go="${esc(row.action === 'calendar' ? 'calendar' : 'schedule')}"
          >
            <span class="nova-command-agenda-time">
              <b>${esc(row.time)}</b>
              <small>${esc(row.end || 'сегодня')}</small>
            </span>

            <span class="nova-command-agenda-line"></span>

            <span class="nova-command-agenda-copy">
              <b>${esc(row.title)}</b>
              <small>${esc(row.meta || 'Campus')}</small>
            </span>

            <span class="nova-command-agenda-arrow">
              ${icon('arrow',13)}
            </span>
          </button>
        `).join('')
      : `
          <div class="nova-command-empty compact">
            <span>${icon('calendar',17)}</span>
            <div>
              <b>Сегодня занятий нет</b>
              <small>Можно спокойно заняться ближайшими заданиями.</small>
            </div>
          </div>
        `;

  const deadlinesMarkup =
    deadlineRows.length
      ? deadlineRows.map(item => {

          return `
            <button
              class="
                nova-command-deadline
                nova-dashboard-deadline-radar-row
                tone-${esc(item.bucket)}
              "
              type="button"
              data-deadline-open="${esc(item.id)}"
            >

              <span
                class="nova-command-deadline-status"
              ></span>

              <span
                class="nova-command-deadline-main"
              >

                <b>
                  ${esc(
                    item.title ||
                    'Учебная активность'
                  )}
                </b>

                <small>
                  ${esc(
                    item.course ||
                    'Без курса'
                  )}
                </small>

              </span>

              <span
                class="nova-command-deadline-time"
              >
                ${esc(
                  item.bucketLabel ||
                  formatLong(item.due)
                )}
              </span>

              <span
                class="nova-command-deadline-arrow"
              >
                ${icon('arrow',12)}
              </span>

            </button>
          `;
        }).join('')
      : `
          <div class="nova-command-empty compact">

            <span>
              ${icon('check',17)}
            </span>

            <div>
              <b>
                Дедлайнов не найдено
              </b>

              <small>
                Nova проверяет задания,
                тесты и сроки из календаря.
              </small>
            </div>

          </div>
        `;


  const progressMarkup =
    progressCourses.length
      ? progressCourses.map(item => {
          const course =
            item.course;

          const progress =
            item.progress === null
              ? 0
              : Math.round(item.progress);

          return `
            <button
              class="nova-command-course-progress"
              type="button"
              data-go="course"
              data-param="${esc(course?.id || '')}"
            >
              <span class="nova-command-course-head">
                <b>
                  ${esc(
                    course?.fullnamedisplay ||
                    course?.fullname ||
                    course?.shortname ||
                    'Курс'
                  )}
                </b>
                <strong>
                  ${
                    item.progress === null
                      ? '—'
                      : progress + '%'
                  }
                </strong>
              </span>

              <span class="nova-command-progress-track">
                <i style="width:${progress}%"></i>
              </span>
            </button>
          `;
        }).join('')
      : `
          <div class="nova-command-empty compact">
            <span>${icon('grid',17)}</span>
            <div>
              <b>Курсы пока не загружены</b>
              <small>После подключения Campus здесь появится прогресс.</small>
            </div>
          </div>
        `;

  const importantMarkup =
    importantItems.map(item => `
      <button
        class="nova-command-important"
        type="button"
        ${item.activity
          ? `data-activity="${activityRefAttr(item.activity)}"`
          : `data-go="${esc(item.go || 'dashboard')}"`
        }
      >
        <span class="nova-command-important-icon ${esc(item.tone)}">
          ${icon(item.icon,16)}
        </span>

        <span>
          <b>${esc(item.title)}</b>
          <small>${esc(item.meta)}</small>
        </span>

        ${icon('arrow',12)}
      </button>
    `).join('');

  if(state.status.dashboard === 'loading'){
    return `
      <section class="page nova-command-page">
        ${hero()}
        <div class="nova-command-panel">
          <div class="skeleton-card" style="height:150px"></div>
        </div>
      </section>
    `;
  }

  return `
    <section class="page nova-command-page">

      <header class="nova-command-header">
        <div>
          <span class="nova-command-kicker">
            CAMPUS NOVA · COMMAND CENTER
          </span>

          <h1>
            Привет, <span>${esc(firstName())}</span>
          </h1>

          <p>
            Твой учебный день, дедлайны и ближайшие действия в одном месте.
          </p>
        </div>

        <div class="nova-command-header-stats">
          <span>
            <b>${tasks.length}</b>
            <small>заданий</small>
          </span>

          <span>
            <b>${courses.length}</b>
            <small>курсов</small>
          </span>

          <span>
            <b>${unread}</b>
            <small>сообщений</small>
          </span>
        </div>
      </header>

      ${hero()}

      <div class="nova-command-grid">

        <div class="nova-command-main">

          <section class="nova-command-panel">
            <div class="nova-command-panel-head">
              <div>
                <span>ПРИОРИТЕТ</span>
                <h2>Ближайшее действие</h2>
              </div>
              <span class="nova-command-live">
                <i></i>
                LIVE
              </span>
            </div>

            ${actionMarkup}
          </section>

          <section class="nova-command-panel">
            <div class="nova-command-panel-head">
              <div>
                <span>РАСПИСАНИЕ</span>
                <h2>
                  Твой день
                  <small class="nova-command-day-date">
                    ${esc(dayLabel)}
                  </small>
                </h2>
              </div>
              <button
                class="panel-action"
                type="button"
                data-go="schedule"
              >
                Всё расписание ${icon('arrow',13)}
              </button>
            </div>

            <div class="nova-command-agenda">
              ${agendaMarkup}
            </div>
          </section>

          <section class="nova-command-panel nova-dashboard-deadline-radar">

            <div class="nova-command-panel-head">

              <div>

                <span>
                  DEADLINE RADAR
                </span>

                <h2>
                  Дедлайны
                  <small class="nova-dashboard-deadline-summary">
                    ${
                      deadlineRadar.active
                    }
                    активных
                    ·
                    ${
                      deadlineRadar.today
                    }
                    сегодня
                  </small>
                </h2>

              </div>

              <button
                class="panel-action"
                type="button"
                data-go="deadlines"
              >
                Все дедлайны
                ${icon('arrow',13)}
              </button>

            </div>

            <div
              class="nova-dashboard-deadline-radar-stats"
            >

              <span>
                <b>${deadlineRadar.overdue}</b>
                <small>просрочено</small>
              </span>

              <span>
                <b>${deadlineRadar.today}</b>
                <small>24 часа</small>
              </span>

              <span>
                <b>${deadlineRadar.soon}</b>
                <small>3 дня</small>
              </span>

            </div>

            <div class="nova-command-deadlines">
              ${deadlinesMarkup}
            </div>

          </section>

        </div>

        <aside class="nova-command-side">

          ${novaDashboardUpdatesMarkup()}

          <section class="nova-command-panel nova-command-pulse">
            <div class="nova-command-panel-head">
              <div>
                <span>СОСТОЯНИЕ</span>
                <h2>Учебный пульс</h2>
              </div>
            </div>

            <div class="nova-command-pulse-stats">
              <div>
                <b>${tasks.length}</b>
                <small>заданий</small>
              </div>

              <div>
                <b>${avg}</b>
                <small>средний балл</small>
              </div>

              <div>
                <b>${progressAvg}%</b>
                <small>ср. прогресс</small>
              </div>
            </div>
          </section>

          <section class="nova-command-panel">
            <div class="nova-command-panel-head">
              <div>
                <span>ПРОГРЕСС</span>
                <h2>Мои курсы</h2>
              </div>
              <button
                class="panel-action"
                type="button"
                data-go="courses"
              >
                Все курсы ${icon('arrow',13)}
              </button>
            </div>

            <div class="nova-command-progress-list">
              ${progressMarkup}
            </div>
          </section>

          <section class="nova-command-panel">
            <div class="nova-command-panel-head">
              <div>
                <span>АКЦЕНТ</span>
                <h2>Важное</h2>
              </div>
            </div>

            <div class="nova-command-important-list">
              ${importantMarkup}
            </div>
          </section>

          <section class="nova-command-panel">
            <div class="nova-command-panel-head">
              <div>
                <span>БЫСТРЫЙ ДОСТУП</span>
                <h2>Открыть раздел</h2>
              </div>
            </div>

            <div class="nova-command-quick-grid">
              <button class="nova-command-quick" type="button" data-go="courses">
                ${icon('grid',18)}
                <b>Курсы</b>
                <small>Все предметы</small>
              </button>

              <button class="nova-command-quick" type="button" data-go="schedule">
                ${icon('clock',18)}
                <b>Расписание</b>
                <small>Пары и время</small>
              </button>

              <button class="nova-command-quick" type="button" data-go="tasks">
                ${icon('check-square',18)}
                <b>Задания</b>
                <small>Что сдавать</small>
              </button>

              <button class="nova-command-quick" type="button" data-go="tests">
                ${icon('quiz',18)}
                <b>Тесты</b>
                <small>Проверка знаний</small>
              </button>
            </div>
          </section>

        </aside>
      </div>
    </section>
  `;
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

function novaSearchText(value=''){
  return String(value||'')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function novaSearchItems(){
  const items=[];

  const add=item=>{
    if(item?.title){
      items.push(item);
    }
  };

  for(const c of Array.isArray(state.data.courses)?state.data.courses:[]){

    const courseName=
      c.fullnamedisplay||
      c.fullname||
      c.shortname||
      'Курс';

    add({
      type:'course',
      icon:'grid',
      title:courseName,
      meta:'Курс',
      searchable:[
        courseName,
        c.shortname,
        c.summary
      ].map(novaSearchText).join(' '),
      go:'course',
      param:String(c.id||'')
    });

    for(const teacher of Array.isArray(c.teachers)?c.teachers:[]){

      const teacherName=
        teacher?.fullname||
        teacher?.name||
        '';

      if(!teacherName){
        continue;
      }

      add({
        type:'teacher',
        icon:'user',
        title:teacherName,
        meta:`Преподаватель · ${courseName}`,
        searchable:[
          teacherName,
          courseName
        ].map(novaSearchText).join(' '),
        go:'course',
        param:String(c.id||'')
      });
    }
  }

  for(const a of Array.isArray(state.data.tasks)?state.data.tasks:[]){

    const title=
      a?.name||
      a?.identity?.name||
      'Задание';

    add({
      type:'task',
      icon:'check-square',
      title,
      meta:`Задание · ${activityCourseName(a)}`,
      searchable:[
        title,
        a?.description,
        activityCourseName(a)
      ].map(novaSearchText).join(' '),
      activity:a
    });
  }

  for(const a of Array.isArray(state.data.tests)?state.data.tests:[]){

    const title=
      a?.name||
      a?.identity?.name||
      'Тест';

    add({
      type:'test',
      icon:'quiz',
      title,
      meta:`Тест · ${activityCourseName(a)}`,
      searchable:[
        title,
        a?.description,
        activityCourseName(a)
      ].map(novaSearchText).join(' '),
      activity:a
    });
  }

  for(const a of Array.isArray(state.data.materials)?state.data.materials:[]){

    const title=
      a?.name||
      a?.identity?.name||
      'Материал';

    add({
      type:'material',
      icon:'book',
      title,
      meta:`Материал · ${activityCourseName(a)}`,
      searchable:[
        title,
        a?.description,
        a?.ref?.type,
        activityCourseName(a)
      ].map(novaSearchText).join(' '),
      activity:a
    });
  }

  for(const item of Array.isArray(state.data.files)?state.data.files:[]){

    const activity=
      item?.activity||
      {};

    const file=
      item?.file||
      {};

    const title=
      file?.filename||
      activity?.identity?.name||
      'Файл';

    add({
      type:'file',
      icon:'file',
      title,
      meta:`Файл · ${activityCourseName(activity)}`,
      searchable:[
        title,
        file?.mimetype,
        activity?.identity?.name,
        activityCourseName(activity)
      ].map(novaSearchText).join(' '),
      activity
    });
  }

  for(const conversation of state.data.messages?.conversations||[]){

    const title=
      conversation?.name||
      'Диалог';

    const preview=
      messageText(
        conversation?.messages?.[0]?.text||
        conversation?.messages?.[0]?.message||
        ''
      );

    add({
      type:'message',
      icon:'message',
      title,
      meta:
        Number(conversation?.unreadcount||0)>0
          ? `Сообщения · ${conversation.unreadcount} новых`
          : 'Сообщения',
      searchable:[
        title,
        preview
      ].map(novaSearchText).join(' '),
      go:'messages'
    });
  }

  for(const grade of Array.isArray(state.data.grades)?state.data.grades:[]){

    const title=
      grade?.course||
      grade?.name||
      'Оценка';

    add({
      type:'grade',
      icon:'chart',
      title,
      meta:`Оценка · ${grade?.grade??'—'}`,
      searchable:[
        title,
        grade?.grade,
        grade?.percentage,
        grade?.range
      ].map(novaSearchText).join(' '),
      go:'grades'
    });
  }

  return items;
}


function novaSearchTokens(value=''){
  return novaSearchText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu,' ')
    .split(/\s+/)
    .filter(Boolean);
}

function novaSearchFilter(){
  const value =
    localStorage.getItem(
      'nova-search-filter'
    ) || 'all';

  const allowed = [
    'all',
    'course',
    'teacher',
    'task',
    'test',
    'material',
    'file',
    'message',
    'grade'
  ];

  return allowed.includes(value)
    ? value
    : 'all';
}

function novaSearchSetFilter(value){
  const allowed = [
    'all',
    'course',
    'teacher',
    'task',
    'test',
    'material',
    'file',
    'message',
    'grade'
  ];

  const filter =
    allowed.includes(value)
      ? value
      : 'all';

  state.searchFilter = filter;

  localStorage.setItem(
    'nova-search-filter',
    filter
  );

  render();
}

function novaSearchRecent(){
  try{
    const raw =
      localStorage.getItem(
        'nova-search-recent-v1'
      );

    const list =
      raw ? JSON.parse(raw) : [];

    return Array.isArray(list)
      ? list
          .map(novaSearchText)
          .filter(Boolean)
          .slice(0,8)
      : [];
  }catch{
    return [];
  }
}

function novaSearchRemember(query=''){
  const value =
    novaSearchText(query);

  if(!value){
    return;
  }

  const next =
    novaSearchRecent()
      .filter(
        item =>
          item.toLowerCase() !==
          value.toLowerCase()
      );

  next.unshift(value);

  localStorage.setItem(
    'nova-search-recent-v1',
    JSON.stringify(
      next.slice(0,8)
    )
  );
}

function novaSearchClearRecent(){
  localStorage.removeItem(
    'nova-search-recent-v1'
  );

  render();
}

function novaSearchScore(item, query=''){

  const q =
    novaSearchText(query)
      .toLowerCase();

  if(!q){
    return 0;
  }

  const title =
    novaSearchText(
      item?.title || ''
    ).toLowerCase();

  const hay =
    novaSearchText(
      item?.searchable || ''
    ).toLowerCase();

  let score = 0;

  if(title === q){
    score += 200;
  }else if(title.startsWith(q)){
    score += 100;
  }else if(title.includes(q)){
    score += 60;
  }

  if(hay.includes(q)){
    score += 30;
  }

  const queryTokens =
    novaSearchTokens(q);

  const titleTokens =
    novaSearchTokens(title);

  const hayTokens =
    novaSearchTokens(hay);

  for(const token of queryTokens){

    if(titleTokens.includes(token)){
      score += 45;
      continue;
    }

    if(
      titleTokens.some(
        value =>
          value.startsWith(token)
      )
    ){
      score += 28;
      continue;
    }

    if(hayTokens.includes(token)){
      score += 18;
      continue;
    }

    if(
      hayTokens.some(
        value =>
          value.includes(token)
      )
    ){
      score += 8;
    }
  }

  return score;
}


function novaSearchResults(query=''){

  const filter =
    novaSearchFilter();

  return novaSearchItems()
    .filter(
      item =>
        filter === 'all' ||
        item.type === filter
    )
    .map(
      item => ({
        ...item,
        score:novaSearchScore(
          item,
          query
        )
      })
    )
    .filter(
      item =>
        item.score > 0
    )
    .sort(
      (a,b) =>
        b.score-a.score
    )
    .slice(0,8);
}

function novaSearchResultMarkup(query=''){

  const results=
    novaSearchResults(query);

  if(!query.trim()){
    return `
      <div class="nova-search-empty">
        <span class="nova-search-empty-icon">
          ${icon('search',18)}
        </span>

        <div>
          <b>Поиск по Nova</b>
          <small>
            Курсы, задания, тесты, материалы, файлы,
            сообщения и оценки.
          </small>
        </div>
      </div>
    `;
  }

  if(!results.length){
    return `
      <div class="nova-search-empty">
        <span class="nova-search-empty-icon">
          ${icon('search',18)}
        </span>

        <div>
          <b>Ничего не найдено</b>
          <small>
            Попробуй название курса,
            задания или материала.
          </small>
        </div>
      </div>
    `;
  }

  return `
    <div class="nova-search-results">

      ${
        results.map(item=>{

          const attrs=
            item.activity
              ? `data-activity="${activityRefAttr(item.activity)}"`
              : `data-go="${esc(item.go||'dashboard')}" data-param="${esc(item.param||'')}"`;

          return `
            <button
              class="nova-search-result"
              type="button"
              ${attrs}
            >

              <span
                class="nova-search-result-icon ${esc(item.type)}"
              >
                ${icon(item.icon||'search',16)}
              </span>

              <span class="nova-search-result-copy">

                <b>
                  ${esc(item.title)}
                </b>

                <small>
                  ${esc(item.meta||'')}
                </small>

              </span>

              <span class="nova-search-result-arrow">
                ${icon('arrow',13)}
              </span>

            </button>
          `;
        }).join('')
      }

    </div>
  `;
}

let novaSearchRequest=0;

async function novaEnsureGlobalSearchData(){

  const requestId=
    ++novaSearchRequest;

  const jobs=[
    [
      'courses',
      '/api/courses',
      d=>{
        state.data.courses=
          d?.courses||
          [];
      }
    ],

    [
      'tasks',
      '/api/tasks',
      d=>{
        state.data.tasks=
          d?.tasks||
          d||
          [];
      }
    ],

    [
      'grades',
      '/api/grades',
      d=>{
        state.data.grades=
          d?.courses||
          d?.items||
          [];
      }
    ],

    [
      'messages',
      '/api/messages',
      d=>{
        state.data.messages=
          d||
          {};
      }
    ],

    [
      'files',
      '/api/files',
      d=>{
        state.data.files=
          d?.files||
          d||
          [];
      }
    ],

    [
      'materials',
      '/api/materials',
      d=>{
        state.data.materials=
          d?.materials||
          d||
          [];
      }
    ],

    [
      'tests',
      '/api/tests',
      d=>{
        state.data.tests=
          d?.tests||
          d||
          [];
      }
    ]
  ];

  await Promise.allSettled(
    jobs
      .filter(
        job=>
          state.data[job[0]]===null
      )
      .map(
        async job=>{
          try{

            const data=
              await api(job[1]);

            if(
              requestId !==
              novaSearchRequest
            ){
              return;
            }

            job[2](data);

          }catch{
          }
        }
      )
  );

  updateNovaSearchPopover();
}

function updateNovaSearchPopover(){

  const input=
    document.querySelector(
      '#global-search'
    );

  const popover=
    document.querySelector(
      '#nova-search-popover'
    );

  if(!input||!popover){
    return;
  }

  popover.innerHTML=
    novaSearchResultMarkup(
      state.search
    );

  const active=
    document.activeElement===input||
    Boolean(
      novaSearchText(
        state.search
      )
    );

  popover.classList.toggle(
    'open',
    active
  );

  popover
    .querySelectorAll(
      '.nova-search-result'
    )
    .forEach(result=>{

      if(
        result.dataset.novaSearchBound===
        '1'
      ){
        return;
      }

      result.dataset.novaSearchBound='1';

      result.addEventListener(
        'click',
        ()=>{

          const raw=
            result.dataset.activity;

          state.search='';

          popover.classList.remove(
            'open'
          );

          if(raw){

            try{
              openActivity(
                JSON.parse(
                  decodeURIComponent(raw)
                )
              );
            }catch{}

            return;
          }

          navigate(
            result.dataset.go||
            'dashboard',

            result.dataset.param||
            ''
          );
        }
      );
    });
}




function novaSearchResultsFull(query=''){

  const q =
    novaSearchText(
      query
    );

  if(!q){
    return [];
  }

  const filter =
    novaSearchFilter();

  return novaSearchItems()
    .filter(
      item =>
        filter === 'all' ||
        item.type === filter
    )
    .map(
      item => ({
        ...item,
        score:novaSearchScore(
          item,
          q
        )
      })
    )
    .filter(
      item =>
        item.score > 0
    )
    .sort(
      (a,b)=>{

        if(
          b.score !== a.score
        ){
          return b.score-a.score;
        }

        return String(
          a.title || ''
        ).localeCompare(
          String(b.title || ''),
          'ru'
        );
      }
    );
}

function novaSearchTypeLabel(type=''){
  return {
    course:'Курсы',
    teacher:'Преподаватели',
    task:'Задания',
    test:'Тесты',
    material:'Материалы',
    file:'Файлы',
    message:'Сообщения',
    grade:'Оценки'
  }[type] || 'Результаты';
}


function novaSearchReset(){

  state.search =
    '';

  state.searchFilter =
    'all';

  localStorage.setItem(
    'nova-search-filter',
    'all'
  );

  /*
   * Search reset is a UI-state reset only.
   * Recent queries remain available to the user.
   */
  window.__novaSearchResetAt =
    Date.now();

  const input =
    $('#global-search');

  if(input){

    input.value =
      '';

  }

  const popover =
    document.querySelector(
      '#nova-search-popover'
    );

  if(popover){

    popover.classList.remove(
      'open'
    );

    popover.innerHTML =
      '';

  }

  /*
   * The search route is already mounted:
   * reset locally and rerender immediately.
   *
   * This avoids an unnecessary Campus request.
   */
  if(
    state.route ===
    'search'
  ){

    state.status.search =
      'success';

    render(true);

    return;
  }

  /*
   * Preserve the existing navigation
   * behavior when reset is triggered
   * from another route.
   */
  navigate(
    'search'
  );
}

function searchPage(){

  const query=
    novaSearchText(
      state.search
    );

  if(
    state.status.search===
    'loading'
  ){

    return `
      <section class="page nova-search-page">

        ${PageHead({
          eyebrow:'ПОИСК',
          title:'Поиск',
          sub:'Собираем результаты из твоего Campus…'
        })}

        <div class="nova-search-page-loading">
          ${Array.from(
            {length:7},
            ()=>
              `<div class="nova-search-page-skeleton"></div>`
          ).join('')}
        </div>

      </section>
    `;
  }

  if(
    !query
  ){

    return `
      <section class="page nova-search-page">

        ${PageHead({
          eyebrow:'ПОИСК',
          title:'Поиск',
          sub:'Найди всё нужное в одном месте.'
        })}

        <div class="nova-search-page-empty">

          <div class="nova-search-page-empty-icon">
            ${icon('search',26)}
          </div>

          <h2>
            Что ищем?
          </h2>

          <p>
            Введи название курса, задания,
            материала, файла, теста,
            преподавателя или сообщения.
          </p>

        </div>

        ${
          novaSearchRecent().length
            ? `
              <section class="nova-search-recent">

                <div class="nova-search-section-head">

                  <div>
                    <span>НЕДАВНИЕ</span>
                    <b>Последние запросы</b>
                  </div>

                  <button
                    type="button"
                    class="nova-search-text-btn"
                    id="nova-search-clear-recent"
                  >
                    Очистить
                  </button>

                </div>

                <div class="nova-search-recent-list">

                  ${
                    novaSearchRecent()
                      .map(
                        query => `
                          <button
                            type="button"
                            class="nova-search-recent-item"
                            data-search-recent="${esc(query)}"
                          >
                            ${icon('search',14)}
                            <span>
                              ${esc(query)}
                            </span>
                          </button>
                        `
                      )
                      .join('')
                  }

                </div>

              </section>
            `
            : ''
        }

      </section>
    `;
  }

  const results=
    novaSearchResultsFull(
      query
    );

  const groups=
    results.reduce(
      (acc,item)=>{
        const key=
          novaSearchTypeLabel(
            item.type
          );

        if(!acc[key]){
          acc[key]=[];
        }

        acc[key].push(item);

        return acc;
      },
      {}
    );

  return `
    <section
      class="page nova-search-page"
    >

      <div
        class="nova-search-page-head"
      >

        <div>

          <span
            class="nova-command-kicker"
          >
            РЕЗУЛЬТАТЫ ПОИСКА
          </span>

          <h1>
            Поиск
          </h1>

          <p>
            По запросу
            <b>«${esc(query)}»</b>
            найдено
            <b>${results.length}</b>
            совпадений
          </p>

        </div>

        <button
          class="secondary nova-search-clear nova-search-reset-filter"
          type="button"
          id="nova-search-clear"
          data-search-reset-filter="true"
          aria-label="Сбросить поиск и фильтр"
        >
          ${icon('close',14)}
          Очистить
        </button>

      </div>

      <div class="nova-search-filterbar">

        ${[
          ['all','Все'],
          ['course','Курсы'],
          ['teacher','Преподаватели'],
          ['task','Задания'],
          ['test','Тесты'],
          ['material','Материалы'],
          ['file','Файлы'],
          ['message','Сообщения'],
          ['grade','Оценки']
        ].map(
          ([value,label])=>`
            <button
              type="button"
              class="
                nova-search-filter
                ${novaSearchFilter()===value?'active':''}
              "
              data-search-filter="${value}"
            >
              ${label}
            </button>
          `
        ).join('')}

      </div>


      ${
        results.length
          ? `
            <div
              class="nova-search-groups"
            >

              ${
                Object.entries(groups)
                  .map(
                    ([label,items])=>`

                      <section
                        class="nova-search-group"
                      >

                        <div
                          class="nova-search-group-head"
                        >

                          <div>

                            <span>
                              ${esc(label)}
                            </span>

                            <b>
                              ${items.length}
                            </b>

                          </div>

                        </div>

                        <div
                          class="nova-search-page-results"
                        >

                          ${
                            items.map(
                              item=>{

                                const attrs=
                                  item.activity
                                    ? `data-activity="${activityRefAttr(item.activity)}"`
                                    : `data-go="${esc(item.go||'dashboard')}" data-param="${esc(item.param||'')}"`;

                                return `
                                  <button
                                    class="nova-search-page-result"
                                    type="button"
                                    ${attrs}
                                  >

                                    <span
                                      class="
                                        nova-search-page-result-icon
                                        ${esc(item.type)}
                                      "
                                    >
                                      ${icon(
                                        item.icon||
                                        'search',
                                        18
                                      )}
                                    </span>

                                    <span
                                      class="nova-search-page-result-copy"
                                    >

                                      <b>
                                        ${esc(
                                          item.title
                                        )}
                                      </b>

                                      <small>
                                        ${esc(
                                          item.meta||
                                          ''
                                        )}
                                      </small>

                                    </span>

                                    <span
                                      class="nova-search-page-result-arrow"
                                    >
                                      ${icon(
                                        'arrow',
                                        14
                                      )}
                                    </span>

                                  </button>
                                `;
                              }
                            ).join('')
                          }

                        </div>

                      </section>
                    `
                  )
                  .join('')
              }

            </div>
          `
          : `
            <div
              class="nova-search-page-empty"
            >

              <div
                class="nova-search-page-empty-icon"
              >
                ${icon('search',25)}
              </div>

              <h2>
                Ничего не найдено
              </h2>

              <p>
                Попробуй изменить запрос
                или использовать часть названия.
              </p>

            </div>
          `
      }

    </section>
  `;
}

async function loadDeadlinesData(
  force=false,
  epoch=state.routeEpoch
){

  if(
    !state.connected ||
    state.demo ||
    state.route !== 'deadlines'
  ){
    return;
  }

  state.status.deadlines =
    'loading';

  state.errors.deadlines =
    null;

  render();

  const services = [
    'tasks',
    'tests',
    'calendar'
  ];

  await Promise.allSettled(
    services.map(
      service =>
        loadData(
          service,
          force,
          epoch
        )
    )
  );

  if(
    epoch !== state.routeEpoch ||
    state.route !== 'deadlines'
  ){
    return;
  }

  const usable =
    services.some(
      service =>
        state.status[service] ===
        'success'
    );

  state.status.deadlines =
    usable
      ? 'success'
      : 'error';

  render();
}

async function loadSearchData(
  epoch=state.routeEpoch
){

  if(
    !state.connected ||
    state.route!=='search' ||
    epoch!==state.routeEpoch
  ){
    return;
  }

  state.status.search=
    'loading';

  state.errors.search=
    null;

  render();

  await Promise.allSettled([
    loadData('courses',false,epoch),
    loadData('tasks',false,epoch),
    loadData('tests',false,epoch),
    loadData('materials',false,epoch),
    loadData('files',false,epoch),
    loadData('messages',false,epoch),
    loadData('grades',false,epoch)
  ]);

  if(
    state.route!=='search' ||
    epoch!==state.routeEpoch
  ){
    return;
  }

  state.status.search=
    'success';

  render();
}

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

  if(state.status.course==='loading'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'КУРС',
          title:'Загрузка курса',
          sub:'Получаем содержимое Campus…'
        })}
        ${skeletonGrid(3)}
      </section>
    `;
  }

  if(state.status.course==='error'){
    return `
      <section class="page">
        ${PageHead({
          eyebrow:'КУРС',
          title:'Не удалось открыть курс',
          sub:
            state.errors?.course||
            'Campus не вернул содержимое этого курса.'
        })}
        ${statePanel('error','course')}
      </section>
    `;
  }

  const c=state.data.course;

  if(!c){
    return `
      <section class="page">
        ${statePanel(
          'empty',
          'course',
          false
        )}
      </section>
    `;
  }

  const sections=
    Array.isArray(c.sections)
      ? c.sections
      : [];

  const activities=
    sections.flatMap(
      section=>
        Array.isArray(section.activities)
          ? section.activities
          : []
    );

  const count=activities.length;

  const teachers=
    (
      Array.isArray(c.teachers)
        ? c.teachers
        : []
    )
      .map(
        teacher=>
          teacher?.fullname||
          teacher?.name||
          ''
      )
      .filter(Boolean);

  const progressRaw=
    Number(c.progress);

  const hasNativeProgress=
    Number.isFinite(progressRaw);

  const completionKnown=
    activities
      .some(a=>{
        return (
          a?.completionstate!==undefined ||
          a?.completed!==undefined ||
          a?.completion?.state!==undefined ||
          a?.completion?.completed!==undefined
        );
      });

  const completedCount=
    activities.filter(a=>{
      const stateValue=
        Number(a?.completionstate);

      if(Number.isFinite(stateValue)){
        return stateValue>0;
      }

      if(a?.completion?.state!==undefined){
        return Number(a.completion.state)>0;
      }

      if(
        a?.completed===true ||
        a?.completion?.completed===true
      ){
        return true;
      }

      const normalized=
        String(
          a?.status||
          a?.state||
          a?.completionstatus||
          ''
        ).toLowerCase();

      return (
        normalized==='complete'||
        normalized==='completed'||
        normalized==='done'||
        normalized==='finished'
      );
    })
    .length;

  const derivedProgress=
    !hasNativeProgress &&
    completionKnown &&
    count
      ? (completedCount/count)*100
      : null;

  const progress=
    hasNativeProgress
      ? Math.max(0,Math.min(100,progressRaw))
      : derivedProgress;

  const assignments=
    activities.filter(
      activity=>
        /assign|assignment/i.test(
          String(
            activity?.type||
            activity?.modname||
            ''
          )
        )
    ).length;

  const tests=
    activities.filter(
      activity=>
        /quiz|test/i.test(
          String(
            activity?.type||
            activity?.modname||
            ''
          )
        )
    ).length;

  const files=
    activities.filter(
      activity=>
        Boolean(
          Array.isArray(activity?.contents) &&
          activity.contents.some(
            file=>file?.fileurl
          )
        ) ||
        /file|resource/i.test(
          String(
            activity?.type||
            activity?.modname||
            ''
          )
        )
    ).length;


  const activityKinds=
    activities.map(activity=>{
      const type=
        String(
          activity?.type||
          activity?.modname||
          ''
        ).toLowerCase();

      const hasFile=
        Boolean(
          Array.isArray(activity?.contents) &&
          activity.contents.some(
            file=>file?.fileurl
          )
        );

      if(type==='quiz' || /quiz|test/.test(type)){
        return 'tests';
      }

      if(
        /assign|assignment|workshop|feedback|choice/.test(type)
      ){
        return 'tasks';
      }

      if(
        hasFile ||
        /(^|[-_])file$/.test(type) ||
        type==='file'
      ){
        return 'files';
      }

      return 'materials';
    });

  const activityKindCount={
    all:activities.length,
    materials:activityKinds.filter(
      x=>x==='materials'
    ).length,
    tasks:activityKinds.filter(
      x=>x==='tasks'
    ).length,
    tests:activityKinds.filter(
      x=>x==='tests'
    ).length,
    files:activityKinds.filter(
      x=>x==='files'
    ).length
  };

  const activeCourseFilter=
    ['all','materials','tasks','tests','files']
      .includes(state.courseFilter)
      ? state.courseFilter
      : 'all';

  const dueItems=
    activities
      .map(
        item=>({
          item,
          due:activityDue(item)
        })
      )
      .filter(item=>item.due)
      .sort((a,b)=>a.due-b.due);

  const nextDue=
    dueItems[0]||
    null;

  const updateItems=
    novaCourseUpdateItems(
      activities
    );

  const sectionMarkup=
    sections
      .map(
        (section,index)=>{

          const list=
            Array.isArray(section.activities)
              ? section.activities
              : [];

          return `
            <details
              class="course-section nova-course-section"
              data-course-section="1"
              ${index<2?'open':''}
            >

              <summary>

                <span class="section-number">
                  ${String(index+1).padStart(2,'0')}
                </span>

                <span class="nova-course-section-copy">

                  <b>
                    ${esc(
                      section.name||
                      `Раздел ${index+1}`
                    )}
                  </b>

                  <small>
                    ${list.length}
                    ${
                      list.length===1
                        ? 'активность'
                        : 'активностей'
                    }
                  </small>

                </span>

                ${icon('chevron',17)}

              </summary>

              <div class="activity-list">

                ${
                  list.length
                    ? list.map(activity).join('')
                    : `
                      <div class="inline-empty">
                        В этом разделе пока нет материалов.
                      </div>
                    `
                }

              </div>

            </details>
          `;
        }
      )
      .join('');

  const native=
    typeof c.nativeHtml==='string' &&
    c.nativeHtml.trim()
      ? `
        <div class="native-course">

          <div class="native-course-head">

            <div>

              <b>
                ${icon('university',15)}
                Оригинальный Campus
              </b>

              <small>
                Nova не потеряла содержимое.
                Здесь отображается реальная страница курса.
              </small>

            </div>

            ${
              c.fallback?.url
                ? `
                  <button
                    class="secondary tiny"
                    data-view="${esc(c.fallback.url)}"
                  >
                    Открыть отдельно
                    ${icon('arrow',13)}
                  </button>
                `
                : ''
            }

          </div>

          <div
            id="campus-content"
            class="native-course-content"
          >
            ${c.nativeHtml}
          </div>

        </div>
      `
      : '';

  const empty=`
    <div class="state-card empty course-empty">

      <div class="state-icon">
        ${icon('sparkle',22)}
      </div>

      <h3>
        Campus пока не отдал
        структурированные материалы.
      </h3>

      <p>
        Nova сохранила реальную страницу курса
        и может открыть её напрямую.
      </p>

      ${
        c.fallback?.url
          ? `
            <button
              class="primary"
              data-view="${esc(c.fallback.url)}"
            >
              Открыть содержимое Campus
              ${icon('arrow',16)}
            </button>
          `
          : ''
      }

    </div>
  `;

  const body=
    count||sections.length
      ? `
        <div class="sections nova-course-sections">
          ${sectionMarkup}
        </div>
      `
      : (native||empty);

  const progressLabel=
    progress!==null
      ? `${Math.round(progress)}%`
      : 'Нет данных';

  const completedLabel=
    completionKnown
      ? `${completedCount} из ${count} выполнено`
      : (
        progress!==null
          ? 'Прогресс получен из Campus'
          : 'Данные о выполнении пока недоступны'
      );

  const progressWidth=
    progress!==null
      ? Math.max(
          0,
          Math.min(
            100,
            Number(progress)
          )
        )
      : 0;

  const nextDueMarkup=
    nextDue
      ? `
        <div class="nova18-next-content">

          <span class="nova18-mini-label">
            БЛИЖАЙШИЙ СРОК
          </span>

          <b>
            ${esc(
              nextDue.item?.name||
              nextDue.item?.identity?.name||
              'Активность'
            )}
          </b>

          <small>
            ${esc(
              formatLong(nextDue.due)
            )}
          </small>

          <button
            type="button"
            class="nova18-next-action"
            data-activity="${activityRefAttr(nextDue.item)}"
          >
            Открыть
            ${icon('arrow',13)}
          </button>

        </div>
      `
      : `
        <div class="nova18-next-content">

          <span class="nova18-mini-label">
            СЛЕДУЮЩЕЕ
          </span>

          <b>
            Дедлайнов пока нет
          </b>

          <small>
            Новые сроки появятся автоматически.
          </small>

        </div>
      `;

  const updatesMarkup=
    updateItems.length
      ? `
        <div class="nova18-updates-list">

          ${
            updateItems
              .map(entry=>`
                <button
                  type="button"
                  class="nova18-update-item"
                  data-activity="${activityRefAttr(entry.item)}"
                >

                  <span class="nova18-update-icon">
                    ${icon(
                      novaCourseUpdateIcon(
                        entry.item
                      ),
                      14
                    )}
                  </span>

                  <span class="nova18-update-copy">

                    <small>
                      ${esc(
                        novaCourseUpdateDate(
                          entry.timestamp
                        )
                      )}
                    </small>

                    <b>
                      ${esc(
                        novaCourseUpdateKind(
                          entry.item
                        )
                      )}
                    </b>

                    <span>
                      ${esc(
                        entry.item?.name||
                        entry.item?.identity?.name||
                        'Активность'
                      )}
                    </span>

                  </span>

                  <span class="nova18-update-arrow">
                    ${icon('arrow',12)}
                  </span>

                </button>
              `)
              .join('')
          }

        </div>
      `
      : `
        <div class="nova18-updates-empty">

          <span>
            ${icon('info',15)}
          </span>

          <div>
            <b>
              Изменения не определены
            </b>

            <small>
              Campus не передал даты создания
              или изменения активностей.
            </small>
          </div>

        </div>
      `;

  return `
    <section class="page course-page nova-course-page nova18-course-page">

      <button
        class="back-button nova-course-back"
        data-back="courses"
      >
        ${icon('back',17)}
        Все курсы
      </button>

      <section class="nova18-course-hero">

        <div class="nova18-hero-orb nova18-hero-orb-a"></div>
        <div class="nova18-hero-orb nova18-hero-orb-b"></div>
        <div class="nova18-hero-grid"></div>

        <div class="nova18-hero-main">

          <div class="nova18-course-kicker">
            <span>COURSE OS</span>
            <i></i>
            <span>${count} ${
              count===1 ? 'АКТИВНОСТЬ' : 'АКТИВНОСТЕЙ'
            }</span>
          </div>

          <h1>
            ${esc(
              c.title||
              'Курс'
            )}
          </h1>

          <p class="nova18-course-description">
            ${esc(
              c.description||
              'Электронный учебный курс'
            )}
          </p>

          <div class="nova18-course-meta">

            ${
              teachers.length
                ? `
                  <span>
                    ${icon('user',13)}
                    ${esc(
                      teachers.join(' · ')
                    )}
                  </span>
                `
                : ''
            }

            <span>
              ${icon('book',13)}
              ${sections.length} ${
                sections.length===1
                  ? 'раздел'
                  : 'разделов'
              }
            </span>

            <span>
              ${icon('grid',13)}
              ${count} ${
                count===1
                  ? 'активность'
                  : 'активностей'
              }
            </span>

          </div>

        </div>

        <div class="nova18-progress-card">

          <div class="nova18-progress-top">

            <div>
              <span class="nova18-mini-label">
                ПРОГРЕСС КУРСА
              </span>

              <small>
                ${esc(completedLabel)}
              </small>
            </div>

            <strong>
              ${progressLabel}
            </strong>

          </div>

          <div class="nova18-progress-track">

            <i
              style="width:${progressWidth}%"
            ></i>

          </div>

          <div class="nova18-progress-bottom">

            <span>
              ${
                completionKnown
                  ? `${completedCount} выполнено`
                  : 'Отслеживание активностей'
              }
            </span>

            <span>
              ${count} всего
            </span>

          </div>

        </div>

      </section>

      <div class="nova18-course-stats">

        <div class="nova18-stat">
          <span>${icon('book',16)}</span>
          <b>${sections.length}</b>
          <small>разделов</small>
        </div>

        <div class="nova18-stat">
          <span>${icon('grid',16)}</span>
          <b>${count}</b>
          <small>активностей</small>
        </div>

        <div class="nova18-stat">
          <span>${icon('check-square',16)}</span>
          <b>${assignments}</b>
          <small>заданий</small>
        </div>

        <div class="nova18-stat">
          <span>${icon('quiz',16)}</span>
          <b>${tests}</b>
          <small>тестов</small>
        </div>

        <div class="nova18-stat">
          <span>${icon('file',16)}</span>
          <b>${files}</b>
          <small>файлов</small>
        </div>

        <div class="nova18-stat nova18-stat-focus">
          <span>${icon('clock',16)}</span>
          <b>${dueItems.length}</b>
          <small>сроков</small>
        </div>

      </div>

      <div class="nova18-course-filters" role="tablist" aria-label="Фильтр содержимого курса">

        <button
          type="button"
          class="nova18-course-filter ${activeCourseFilter==='all'?'active':''}"
          data-course-filter="all"
          role="tab"
          aria-selected="${activeCourseFilter==='all'?'true':'false'}"
        >
          <span>Обзор</span>
          <b>${activityKindCount.all}</b>
        </button>

        <button
          type="button"
          class="nova18-course-filter ${activeCourseFilter==='materials'?'active':''}"
          data-course-filter="materials"
          role="tab"
          aria-selected="${activeCourseFilter==='materials'?'true':'false'}"
        >
          <span>Материалы</span>
          <b>${activityKindCount.materials}</b>
        </button>

        <button
          type="button"
          class="nova18-course-filter ${activeCourseFilter==='tasks'?'active':''}"
          data-course-filter="tasks"
          role="tab"
          aria-selected="${activeCourseFilter==='tasks'?'true':'false'}"
        >
          <span>Практики</span>
          <b>${activityKindCount.tasks}</b>
        </button>

        <button
          type="button"
          class="nova18-course-filter ${activeCourseFilter==='tests'?'active':''}"
          data-course-filter="tests"
          role="tab"
          aria-selected="${activeCourseFilter==='tests'?'true':'false'}"
        >
          <span>Тесты</span>
          <b>${activityKindCount.tests}</b>
        </button>

        <button
          type="button"
          class="nova18-course-filter ${activeCourseFilter==='files'?'active':''}"
          data-course-filter="files"
          role="tab"
          aria-selected="${activeCourseFilter==='files'?'true':'false'}"
        >
          <span>Файлы</span>
          <b>${activityKindCount.files}</b>
        </button>

      </div>

      <div class="nova-course-layout nova18-course-layout">

        <main>

          <div class="course-toolbar nova-course-toolbar nova18-toolbar">

            <div>

              <span>
                СОДЕРЖАНИЕ
              </span>

              <b>
                Учебный план курса
              </b>

            </div>

            <div>

              <button
                id="expand-all"
                class="secondary tiny"
              >
                Развернуть всё
              </button>

              <button
                id="collapse-all"
                class="secondary tiny"
              >
                Свернуть всё
              </button>

            </div>

          </div>

          ${body}

        </main>

        <aside class="nova-course-sidebar nova18-sidebar">

          <section class="nova18-next-card">
            ${nextDueMarkup}
          </section>

          <section class="nova18-updates-card">

            <div class="nova18-updates-head">
              <div>
                <span class="nova18-mini-label">
                  АКТИВНОСТЬ КУРСА
                </span>

                <b>
                  Последние изменения
                </b>
              </div>

              <span class="nova18-updates-badge">
                ${updateItems.length||0}
              </span>
            </div>

            ${updatesMarkup}

          </section>

          <section class="nova-course-side-card nova18-side-card">

            <span>
              БЫСТРАЯ НАВИГАЦИЯ
            </span>

            <button
              type="button"
              class="nova-course-side-link"
              data-course-action="expand"
            >
              Все разделы
              ${icon('arrow',13)}
            </button>

            <button
              type="button"
              class="nova-course-side-link"
              data-go="tasks"
            >
              Задания
              ${icon('arrow',13)}
            </button>

            <button
              type="button"
              class="nova-course-side-link"
              data-go="tests"
            >
              Тесты
              ${icon('arrow',13)}
            </button>

            <button
              type="button"
              class="nova-course-side-link"
              data-go="materials"
            >
              Материалы
              ${icon('arrow',13)}
            </button>

          </section>

        </aside>

      </div>

    </section>
  `;
}


function novaCourseUpdateTimestamp(value){
  const n=Number(value||0);

  if(!Number.isFinite(n) || n<=0){
    return 0;
  }

  /*
   * Moodle timestamps are normally seconds.
   * Keep the helper defensive in case a connector returns ms.
   */
  return n>20000000000
    ? Math.floor(n/1000)
    : Math.floor(n);
}

function novaCourseActivityTimestamp(item){
  const candidates=[
    item?.timemodified,
    item?.timecreated,
    item?.content?.timemodified,
    item?.content?.timecreated,
    item?.metadata?.timemodified,
    item?.metadata?.timecreated
  ];

  for(const value of candidates){
    const ts=
      novaCourseUpdateTimestamp(value);

    if(ts){
      return ts;
    }
  }

  return 0;
}

function novaCourseUpdateKind(item){
  const created=
    novaCourseUpdateTimestamp(
      item?.timecreated||
      item?.content?.timecreated||
      item?.metadata?.timecreated
    );

  const modified=
    novaCourseUpdateTimestamp(
      item?.timemodified||
      item?.content?.timemodified||
      item?.metadata?.timemodified
    );

  if(!modified && created){
    return 'Добавлено';
  }

  if(
    created &&
    modified &&
    Math.abs(modified-created)<=60
  ){
    return 'Добавлено';
  }

  if(modified){
    return 'Обновлено';
  }

  if(created){
    return 'Добавлено';
  }

  return 'Изменено';
}

function novaCourseUpdateDate(ts){
  if(!ts){
    return 'Дата не указана';
  }

  const now=
    new Date();

  const date=
    new Date(Number(ts)*1000);

  const sameDay=
    now.getFullYear()===
      date.getFullYear() &&
    now.getMonth()===
      date.getMonth() &&
    now.getDate()===
      date.getDate();

  const yesterday=
    new Date(now);

  yesterday.setDate(
    yesterday.getDate()-1
  );

  const isYesterday=
    yesterday.getFullYear()===
      date.getFullYear() &&
    yesterday.getMonth()===
      date.getMonth() &&
    yesterday.getDate()===
      date.getDate();

  if(sameDay){
    return `Сегодня · ${formatTime(ts)}`;
  }

  if(isYesterday){
    return `Вчера · ${formatTime(ts)}`;
  }

  return `${formatLong(ts)} · ${formatTime(ts)}`;
}

function novaCourseUpdateIcon(item){
  const type=
    String(
      item?.type||
      item?.modname||
      ''
    ).toLowerCase();

  if(/quiz|test/.test(type)){
    return 'quiz';
  }

  if(/assign|assignment|workshop|feedback|choice/.test(type)){
    return 'check-square';
  }

  if(
    type==='file'||
    /(^|[-_])file$/.test(type)
  ){
    return 'download';
  }

  return 'book';
}

function novaCourseUpdateItems(activities){
  return (Array.isArray(activities)?activities:[])
    .map(item=>({
      item,
      timestamp:
        novaCourseActivityTimestamp(item)
    }))
    .filter(entry=>entry.timestamp>0)
    .sort(
      (a,b)=>
        b.timestamp-a.timestamp
    )
    .slice(0,6);
}

function activity(a){

  const file=
    Array.isArray(a.contents)
      ? a.contents.find(
          x=>x.fileurl
        )
      : null;

  const canDownload=
    Boolean(file?.fileurl);

  const canOpen=
    Boolean(
      a.url||
      a.cmid||
      a.id
    );

  const directFile=
    Boolean(
      canDownload &&
      (!a.url || a.type==='file')
    );

  const type=
    String(
      a.type||
      a.modname||
      ''
    ).toLowerCase();

  const kind=
    type==='quiz'||
    /quiz|test/.test(type)
      ? 'tests'
      : /assign|assignment|workshop|feedback|choice/.test(type)
        ? 'tasks'
        : (
            canDownload||
            type==='file'||
            /(^|[-_])file$/.test(type)
          )
          ? 'files'
          : 'materials';

  const labels={
    resource:'Материал',
    file:'Файл',
    folder:'Папка',
    page:'Страница',
    url:'Ссылка',
    assign:'Задание',
    quiz:'Тест',
    lesson:'Урок',
    book:'Книга',
    forum:'Форум',
    label:'Блок',
    feedback:'Опрос',
    workshop:'Семинар',
    choice:'Выбор',
    glossary:'Глоссарий'
  };

  const label=
    labels[a.type]||
    text(a.type||'Активность');

  const glyph=
    a.type==='assign'||
    a.type==='feedback'||
    a.type==='workshop'
      ? 'check-square'
      : a.type==='quiz'
        ? 'quiz'
        : a.type==='resource'||
          a.type==='file'||
          canDownload
          ? 'download'
          : a.type==='forum'
            ? 'message'
            : 'grid';

  const due=
    activityDue(a);

  const now=
    Date.now();

  const isCompleted=(()=>{
    const completionState=
      Number(a?.completionstate);

    if(Number.isFinite(completionState)){
      return completionState>0;
    }

    if(a?.completion?.state!==undefined){
      return Number(a.completion.state)>0;
    }

    if(
      a?.completed===true||
      a?.completion?.completed===true
    ){
      return true;
    }

    const normalized=
      String(
        a?.status||
        a?.state||
        a?.completionstatus||
        ''
      ).toLowerCase();

    return (
      normalized==='complete'||
      normalized==='completed'||
      normalized==='done'||
      normalized==='finished'
    );
  })();

  const isIncompleteExplicit=(()=>{
    const completionState=
      Number(a?.completionstate);

    if(Number.isFinite(completionState)){
      return completionState===0;
    }

    const normalized=
      String(
        a?.status||
        a?.state||
        a?.completionstatus||
        ''
      ).toLowerCase();

    return (
      normalized==='incomplete'||
      normalized==='not completed'||
      normalized==='not_started'||
      normalized==='not-started'
    );
  })();

  let stateTone='neutral';
  let stateLabel='Без статуса';

  if(isCompleted){
    stateTone='complete';
    stateLabel='Выполнено';
  }else if(due && due<now){
    stateTone='overdue';
    stateLabel='Просрочено';
  }else if(due){

    const dateNow=
      new Date(now);

    const dateDue=
      new Date(due);

    const sameDay=
      dateNow.getFullYear()===
      dateDue.getFullYear() &&
      dateNow.getMonth()===
      dateDue.getMonth() &&
      dateNow.getDate()===
      dateDue.getDate();

    const tomorrow=
      new Date(dateNow);

    tomorrow.setDate(
      tomorrow.getDate()+1
    );

    const tomorrowDay=
      tomorrow.getFullYear()===
      dateDue.getFullYear() &&
      tomorrow.getMonth()===
      dateDue.getMonth() &&
      tomorrow.getDate()===
      dateDue.getDate();

    if(sameDay){
      stateTone='today';
      stateLabel='Сегодня';
    }else if(tomorrowDay){
      stateTone='tomorrow';
      stateLabel='Завтра';
    }else{
      stateTone='scheduled';
      stateLabel=formatLong(due);
    }

  }else if(isIncompleteExplicit){
    stateTone='pending';
    stateLabel='Не завершено';
  }

  /*
   * Контекстное действие.
   * Здесь не происходит новая бизнес-логика.
   * Карточка продолжает использовать существующие
   * data-activity / data-download bindings.
   */
  let actionLabel='Открыть';
  let actionIcon='arrow';

  if(directFile){
    actionLabel='Скачать';
    actionIcon='download';

  }else if(
    kind==='tests' &&
    !isCompleted
  ){
    actionLabel='Пройти';
    actionIcon='arrow';

  }else if(
    kind==='tasks' &&
    !isCompleted
  ){
    actionLabel='Продолжить';
    actionIcon='arrow';

  }else if(
    isCompleted &&
    canOpen
  ){
    actionLabel='Открыть';
    actionIcon='arrow';
  }

  const ref={
    courseId:
      a.courseId||
      a.ref?.courseId||
      state.data.course?.id,

    cmid:
      a.cmid||
      a.id,

    instance:
      a.instance||
      null,

    contextId:
      a.contextId||
      null,

    type:
      a.type||
      a.modname||
      'unknown'
  };

  const activityAttr=
    esc(
      encodeURIComponent(
        JSON.stringify(ref)
      )
    );

  const descriptionParts=[
    label
  ];

  if(a.description){
    descriptionParts.push(
      text(a.description).slice(0,90)
    );
  }

  if(a.availabilityinfo){
    descriptionParts.push(
      text(a.availabilityinfo).slice(0,90)
    );
  }

  if(
    canDownload &&
    a.type!=='file'
  ){
    descriptionParts.push(
      file.filename||
      'Файл доступен'
    );
  }

  if(
    due &&
    !isCompleted
  ){
    descriptionParts.push(
      formatLong(due)
    );
  }

  const inner=`

    <span
      class="activity-icon ${esc(
        a.type||'activity'
      )}"
    >
      ${icon(glyph,19)}
    </span>

    <span class="nova18-activity-main">

      <span class="nova18-activity-title-row">

        <b>
          ${esc(
            a.name||
            'Без названия'
          )}
        </b>

      </span>

      <small class="nova18-activity-meta">
        ${esc(
          descriptionParts.join(' · ')
        )}
      </small>

    </span>

    <span
      class="nova18-activity-status ${stateTone}"
    >
      ${esc(stateLabel)}
    </span>

    <span
      class="nova18-activity-action ${directFile?'download':''}"
    >
      <b>
        ${esc(actionLabel)}
      </b>
      ${icon(actionIcon,14)}
    </span>

  `;

  if(
    !canOpen &&
    !directFile
  ){
    return `
      <div
        class="activity activity-static nova18-activity-card"
        data-course-activity="1"
        data-course-kind="${kind}"
        data-activity-state="${stateTone}"
      >
        ${inner}
      </div>
    `;
  }

  const attrs=[];

  if(!directFile){
    attrs.push(
      `data-activity="${activityAttr}"`
    );
  }

  if(canOpen){
    attrs.push(
      `data-view="${esc(a.url||'')}"`
    );

    attrs.push(
      `data-route-url`
    );
  }

  if(directFile){
    attrs.push(
      `data-download="${esc(
        file.fileurl
      )}"`
    );
  }

  return `
    <button
      class="activity nova18-activity-card"
      data-course-activity="1"
      data-course-kind="${kind}"
      data-activity-state="${stateTone}"
      aria-label="${esc(
        `${a.name||'Активность'} · ${actionLabel}`
      )}"
      ${attrs.join(' ')}
    >
      ${inner}
    </button>
  `;
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
                  group.items.map(a=>`
                    <button
                      class="
                        material-card
                        task-card
                        material-tone-${esc(
                          learningMaterialVisual(a).tone
                        )}
                      "
                      data-activity="${activityRefAttr(a)}"
                    >

                      <span class="material-card-icon">

                        <span class="material-card-icon-core">
                          ${icon(
                            learningMaterialVisual(a).icon,
                            19
                          )}
                        </span>

                        <small class="material-card-kind">
                          ${esc(
                            learningMaterialVisual(a).shortLabel ||
                            learningMaterialVisual(a).label ||
                            'МАТЕРИАЛ'
                          )}
                        </small>

                      </span>

                      <span class="material-card-main">

                        <b>
                          ${esc(
                            a.identity?.name ||
                            'Материал'
                          )}
                        </b>

                        <small>
                          ${esc(
                            a.ref?.type ||
                            'material'
                          )}
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

function scheduleDateKey(date = '') {
  return String(date || '').slice(0, 10);
}

function schedulePeriodText(schedule = {}) {
  const start =
    schedule?.period?.startDate || '';

  const end =
    schedule?.period?.endDate || '';

  if(!start || !end){
    return 'Период не указан';
  }

  const format = value => {
    const parts =
      String(value).split('-');

    if(parts.length !== 3){
      return value;
    }

    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  return `${format(start)}–${format(end)}`;
}

function scheduleDayText(date = '') {
  const parsed =
    new Date(`${date}T12:00:00`);

  if(Number.isNaN(parsed.getTime())){
    return date;
  }

  return parsed.toLocaleDateString(
    'ru-RU',
    {
      weekday:'long',
      day:'numeric',
      month:'long'
    }
  );
}

function scheduleTodayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1)
      .padStart(2, '0'),
    String(now.getDate())
      .padStart(2, '0')
  ].join('-');
}

function saveImportedSchedule(schedule) {
  const value = {
    ...schedule,
    importedAt: Date.now()
  };

  state.scheduleImport =
    value;

  localStorage.setItem(
    'nova-schedule',
    JSON.stringify(value)
  );

  return value;
}

function clearImportedSchedule() {
  state.scheduleImport = null;

  localStorage.removeItem(
    'nova-schedule'
  );
}

function scheduleTypeLabel(type = '') {
  const labels = {
    practice: 'Практика',
    lecture: 'Лекция',
    lab: 'Лабораторная',
    seminar: 'Семинар',
    computer: 'Практика',
    unknown: 'Занятие'
  };

  return labels[type] ||
    'Занятие';
}

function scheduleTypeClass(type = '') {
  const allowed = new Set([
    'practice',
    'lecture',
    'lab',
    'seminar',
    'computer',
    'unknown'
  ]);

  return allowed.has(type)
    ? type
    : 'unknown';
}

function scheduleImportModal() {
  return `
    <div
      class="modal-backdrop nova-schedule-backdrop nova-schedule-backdrop-v2"
      id="nova-schedule-import-modal"
    >

      <style>
        .nova-schedule-backdrop-v2{
          position:fixed!important;
          inset:0!important;
          z-index:9999!important;
          display:grid!important;
          place-items:center!important;
          padding:24px!important;
          background:
            radial-gradient(
              circle at 50% 12%,
              rgba(24,183,255,.13),
              transparent 34%
            ),
            radial-gradient(
              circle at 80% 90%,
              rgba(104,91,255,.10),
              transparent 30%
            ),
            rgba(3,7,13,.78)!important;
          backdrop-filter:blur(24px)!important;
          -webkit-backdrop-filter:blur(24px)!important;
        }

        .nova-schedule-modal-v2{
          position:relative!important;
          width:min(880px,100%)!important;
          max-height:min(880px,calc(100vh - 48px))!important;
          overflow:auto!important;
          padding:0!important;
          margin:0!important;
          border:1px solid rgba(130,180,255,.17)!important;
          border-radius:30px!important;
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(77,102,255,.13),
              transparent 34%
            ),
            radial-gradient(
              circle at 0 100%,
              rgba(24,183,255,.08),
              transparent 31%
            ),
            color-mix(
              in srgb,
              var(--surface) 96%,
              #07111d
            )!important;
          box-shadow:
            0 50px 140px rgba(0,0,0,.52),
            0 0 0 1px rgba(255,255,255,.025) inset,
            0 0 80px rgba(24,183,255,.045)!important;
          color:var(--text)!important;
        }

        .nova-schedule-modal-v2::-webkit-scrollbar{
          width:8px;
        }

        .nova-schedule-modal-v2::-webkit-scrollbar-thumb{
          background:rgba(130,150,180,.20);
          border-radius:999px;
        }

        .nova-schedule-hero-v2{
          position:relative;
          overflow:hidden;
          padding:28px 30px 24px;
          border-bottom:1px solid var(--line);
        }

        .nova-schedule-hero-v2:before{
          content:"";
          position:absolute;
          width:280px;
          height:280px;
          top:-160px;
          right:-80px;
          border-radius:50%;
          background:
            radial-gradient(
              circle,
              rgba(65,122,255,.20),
              transparent 68%
            );
          filter:blur(8px);
          pointer-events:none;
        }

        .nova-schedule-hero-v2:after{
          content:"";
          position:absolute;
          left:30px;
          right:30px;
          bottom:0;
          height:1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(24,183,255,.42),
              transparent
            );
          opacity:.8;
        }

        .nova-schedule-hero-top-v2{
          position:relative;
          z-index:1;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:20px;
        }

        .nova-schedule-brand-v2{
          display:flex;
          align-items:center;
          gap:13px;
          min-width:0;
        }

        .nova-schedule-brand-icon-v2{
          width:50px;
          height:50px;
          display:grid;
          place-items:center;
          flex:0 0 50px;
          border-radius:16px;
          color:#fff;
          background:
            linear-gradient(
              145deg,
              #19bcff,
              #6873ff
            );
          box-shadow:
            0 14px 32px rgba(43,118,255,.25),
            inset 0 1px 0 rgba(255,255,255,.24);
        }

        .nova-schedule-brand-copy-v2{
          min-width:0;
        }

        .nova-schedule-brand-copy-v2 .eyebrow{
          margin-bottom:5px;
          font-size:8px;
          letter-spacing:.17em;
        }

        .nova-schedule-brand-copy-v2 h2{
          margin:0;
          font-size:26px;
          line-height:1.03;
          letter-spacing:-.045em;
        }

        .nova-schedule-brand-copy-v2 p{
          margin:7px 0 0;
          color:var(--muted);
          font-size:9px;
          line-height:1.5;
        }

        .nova-schedule-close-v2{
          width:40px!important;
          height:40px!important;
          min-width:40px!important;
          padding:0!important;
          border-radius:13px!important;
          background:rgba(255,255,255,.035)!important;
        }

        .nova-schedule-steps-v2{
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
          margin-top:22px;
        }

        .nova-schedule-step-v2{
          position:relative;
          display:flex;
          align-items:flex-start;
          gap:11px;
          min-width:0;
          padding:13px;
          border:1px solid rgba(150,170,200,.10);
          border-radius:17px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.035),
              rgba(255,255,255,.012)
            );
          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease;
        }

        .nova-schedule-step-v2:hover{
          transform:translateY(-2px);
          border-color:rgba(24,183,255,.20);
          background:
            linear-gradient(
              145deg,
              rgba(24,183,255,.055),
              rgba(255,255,255,.015)
            );
        }

        .nova-schedule-step-number-v2{
          width:30px;
          height:30px;
          min-width:30px;
          display:grid;
          place-items:center;
          border-radius:10px;
          color:#fff;
          background:
            linear-gradient(
              145deg,
              #1abaff,
              #6072ff
            );
          font-size:9px;
          font-weight:900;
          box-shadow:
            0 8px 20px rgba(50,116,255,.20);
        }

        .nova-schedule-step-copy-v2{
          min-width:0;
        }

        .nova-schedule-step-copy-v2 b,
        .nova-schedule-step-copy-v2 small{
          display:block;
        }

        .nova-schedule-step-copy-v2 b{
          font-size:9px;
          line-height:1.35;
        }

        .nova-schedule-step-copy-v2 small{
          margin-top:3px;
          color:var(--muted);
          font-size:7.5px;
          line-height:1.45;
        }

        .nova-schedule-body-v2{
          padding:22px 30px 0;
        }

        .nova-schedule-source-v2{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:10px;
        }

        .nova-schedule-source-label-v2{
          color:var(--text);
          font-size:10px;
          font-weight:850;
        }

        .nova-schedule-source-action-v2{
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:7px 9px;
          border-radius:9px;
          color:#57c8ff;
          background:rgba(24,183,255,.065);
          border:1px solid rgba(24,183,255,.10);
          font-size:7px;
          font-weight:900;
        }

        .nova-schedule-textarea-wrap-v2{
          position:relative;
        }

        .nova-schedule-textarea-wrap-v2:after{
          content:"";
          position:absolute;
          left:14px;
          right:14px;
          bottom:10px;
          height:1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.055),
              transparent
            );
          pointer-events:none;
        }

        .nova-schedule-input-v2{
          width:100%!important;
          min-height:300px!important;
          box-sizing:border-box!important;
          margin:0!important;
          resize:vertical!important;
          padding:16px!important;
          border:1px solid rgba(150,170,200,.13)!important;
          border-radius:19px!important;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.028),
              rgba(255,255,255,.012)
            )!important;
          color:var(--text)!important;
          outline:none!important;
          font:500 11px/1.65 inherit!important;
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease!important;
        }

        .nova-schedule-input-v2::placeholder{
          color:#66768a!important;
        }

        .nova-schedule-input-v2:focus{
          border-color:rgba(24,183,255,.42)!important;
          background:
            linear-gradient(
              180deg,
              rgba(24,183,255,.03),
              rgba(255,255,255,.012)
            )!important;
          box-shadow:
            0 0 0 4px rgba(24,183,255,.07),
            0 18px 50px rgba(0,0,0,.12)!important;
        }

        .nova-schedule-drop-v2{
          position:absolute;
          inset:10px;
          display:none;
          place-items:center;
          border:1px dashed rgba(24,183,255,.42);
          border-radius:14px;
          background:
            rgba(8,25,40,.82);
          color:#75d6ff;
          font-size:9px;
          font-weight:850;
          pointer-events:none;
          backdrop-filter:blur(8px);
        }

        .nova-schedule-textarea-wrap-v2.dragging
        .nova-schedule-drop-v2{
          display:grid;
        }

        .nova-schedule-hint-v2{
          display:flex;
          align-items:center;
          gap:7px;
          margin-top:8px;
          color:var(--muted-2);
          font-size:7.5px;
        }

        .nova-schedule-hint-v2 .icon{
          color:var(--accent);
        }

        .nova-schedule-error-v2{
          min-height:0;
          margin-top:9px;
          padding:0;
          color:var(--danger);
          font-size:8px;
          line-height:1.45;
        }

        .nova-schedule-error-v2:not(:empty){
          padding:9px 11px;
          border:1px solid rgba(255,102,125,.16);
          border-radius:11px;
          background:rgba(255,102,125,.055);
        }

        .nova-schedule-footer-v2{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:18px 30px 24px;
          margin-top:18px;
          border-top:1px solid var(--line);
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.006),
              rgba(255,255,255,.018)
            );
        }

        .nova-schedule-footer-copy-v2{
          display:flex;
          align-items:flex-start;
          gap:8px;
          min-width:0;
          max-width:470px;
        }

        .nova-schedule-footer-copy-v2 .icon{
          flex:0 0 auto;
          color:var(--accent);
          margin-top:1px;
        }

        .nova-schedule-footer-copy-v2 b,
        .nova-schedule-footer-copy-v2 small{
          display:block;
        }

        .nova-schedule-footer-copy-v2 b{
          font-size:8px;
        }

        .nova-schedule-footer-copy-v2 small{
          margin-top:3px;
          color:var(--muted);
          font-size:7.5px;
          line-height:1.45;
        }

        .nova-schedule-submit-v2{
          min-width:160px;
          height:46px!important;
          border-radius:14px!important;
          font-size:10px!important;
          box-shadow:
            0 13px 30px rgba(8,136,249,.23)!important;
        }

        @media(max-width:760px){
          .nova-schedule-backdrop-v2{
            padding:12px!important;
          }

          .nova-schedule-modal-v2{
            width:100%!important;
            max-height:calc(100vh - 24px)!important;
            border-radius:23px!important;
          }

          .nova-schedule-hero-v2{
            padding:20px 18px 18px;
          }

          .nova-schedule-hero-top-v2{
            gap:12px;
          }

          .nova-schedule-brand-icon-v2{
            width:44px;
            height:44px;
            min-width:44px;
            border-radius:14px;
          }

          .nova-schedule-brand-copy-v2 h2{
            font-size:21px;
          }

          .nova-schedule-steps-v2{
            grid-template-columns:1fr;
            margin-top:17px;
          }

          .nova-schedule-body-v2{
            padding:18px 18px 0;
          }

          .nova-schedule-input-v2{
            min-height:250px!important;
          }

          .nova-schedule-footer-v2{
            align-items:stretch;
            flex-direction:column;
            padding:15px 18px 19px;
          }

          .nova-schedule-submit-v2{
            width:100%;
          }
        }
      </style>

      <div
        class="modal nova-schedule-modal-v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-schedule-title"
      >

        <div class="nova-schedule-hero-v2">

          <div class="nova-schedule-hero-top-v2">

            <div class="nova-schedule-brand-v2">

              <span class="nova-schedule-brand-icon-v2">
                ${icon('calendar',22)}
              </span>

              <div class="nova-schedule-brand-copy-v2">

                <span class="eyebrow">
                  РАСПИСАНИЕ
                </span>

                <h2 id="nova-schedule-title">
                  Добавить учебную неделю
                </h2>

                <p>
                  Один раз вставляешь сообщение из Telegram,
                  Nova собирает из него аккуратное расписание.
                </p>

              </div>

            </div>

            <button
              class="icon-btn nova-schedule-close-v2"
              type="button"
              id="nova-schedule-close"
              aria-label="Закрыть"
            >
              ${icon('close',17)}
            </button>

          </div>

          <div class="nova-schedule-steps-v2">

            <div class="nova-schedule-step-v2">

              <span class="nova-schedule-step-number-v2">
                1
              </span>

              <div class="nova-schedule-step-copy-v2">

                <b>
                  Открой Telegram-бота
                </b>

                <small>
                  @finashkakrd_bot
                </small>

                <a
                  class="nova-schedule-telegram"
                  href="https://t.me/finashkakrd_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть бота ↗
                </a>

              </div>

            </div>

            <div class="nova-schedule-step-v2">

              <span class="nova-schedule-step-number-v2">
                2
              </span>

              <div class="nova-schedule-step-copy-v2">

                <b>
                  Выбери группу
                </b>

                <small>
                  Нажми «Расписание на неделю».
                </small>

              </div>

            </div>

            <div class="nova-schedule-step-v2">

              <span class="nova-schedule-step-number-v2">
                3
              </span>

              <div class="nova-schedule-step-copy-v2">

                <b>
                  Скопируй сообщение
                </b>

                <small>
                  Целиком, от заголовка до количества пар.
                </small>

              </div>

            </div>

          </div>

        </div>

        <div class="nova-schedule-body-v2">

          <div class="nova-schedule-source-v2">

            <span class="nova-schedule-source-label-v2">
              Сообщение расписания
            </span>

            <span class="nova-schedule-source-action-v2">
              ${icon('sparkle',11)}
              Nova распознает автоматически
            </span>

          </div>

          <div class="nova-schedule-textarea-wrap-v2">

            <textarea
              id="nova-schedule-text"
              class="nova-schedule-input-v2"
              rows="12"
              placeholder="Вставь сюда сообщение от @finashkakrd_bot…"
              spellcheck="false"
            ></textarea>

            <div class="nova-schedule-drop-v2">
              ${icon('upload',17)}
              Отпусти текст здесь
            </div>

          </div>

          <div class="nova-schedule-hint-v2">
            ${icon('info',11)}
            Nova распознает даты, время, предметы,
            преподавателей, аудитории и типы занятий.
          </div>

          <div
            id="nova-schedule-import-error"
            class="nova-schedule-error-v2"
          ></div>

        </div>

        <div class="nova-schedule-footer-v2">

          <div class="nova-schedule-footer-copy-v2">

            ${icon('calendar',14)}

            <div>

              <b>
                Расписание обновляется примерно раз в неделю
              </b>

              <small>
                После импорта Nova сохранит неделю на этом устройстве
                и сможет использовать её на главной странице.
              </small>

            </div>

          </div>

          <button
            class="primary nova-schedule-submit-v2"
            type="button"
            id="nova-schedule-import-submit"
          >
            ${icon('upload',15)}
            Импортировать
          </button>

        </div>

      </div>

    </div>
  `;
}
function closeScheduleImport() {
  const root =
    document.querySelector(
      '#nova-schedule-import-modal'
    );

  if(!root){
    return;
  }

  root.classList.add(
    'is-closing'
  );

  novaFrame(() =>
    root.remove()
  );
}

function openScheduleImport() {
  if(
    document.querySelector(
      '#nova-schedule-import-modal'
    )
  ){
    return;
  }

  const root =
    document.createElement('div');

  root.innerHTML =
    scheduleImportModal();

  const modal =
    root.firstElementChild;

  if(!modal){
    return;
  }

  document.body.append(
    modal
  );

  const dialog =
    modal.querySelector(
      '.nova-schedule-modal-v2'
    );

  const textarea =
    modal.querySelector(
      '#nova-schedule-text'
    );

  const submit =
    modal.querySelector(
      '#nova-schedule-import-submit'
    );

  const error =
    modal.querySelector(
      '#nova-schedule-import-error'
    );

  const drop =
    modal.querySelector(
      '.nova-schedule-drop-v2'
    );

  const textWrap =
    modal.querySelector(
      '.nova-schedule-textarea-wrap-v2'
    );

  let closed = false;

  const close = () => {
    if(closed){
      return;
    }

    closed = true;

    document.removeEventListener(
      'keydown',
      escHandler
    );

    modal.classList.add(
      'is-closing'
    );

    novaFrame(() => {
      modal.remove();
    });
  };

  const escHandler =
    event => {
      if(
        event.key === 'Escape'
      ){
        close();
      }
    };

  modal.addEventListener(
    'click',
    event => {
      if(
        event.target === modal
      ){
        close();
      }
    }
  );

  modal.querySelector(
    '#nova-schedule-close'
  )?.addEventListener(
    'click',
    close
  );

  document.addEventListener(
    'keydown',
    escHandler
  );

  textarea?.addEventListener(
    'dragenter',
    event => {
      event.preventDefault();
      textWrap?.classList.add(
        'dragging'
      );
    }
  );

  textarea?.addEventListener(
    'dragover',
    event => {
      event.preventDefault();
      textWrap?.classList.add(
        'dragging'
      );
    }
  );

  textarea?.addEventListener(
    'dragleave',
    event => {
      if(
        event.relatedTarget &&
        textWrap?.contains(
          event.relatedTarget
        )
      ){
        return;
      }

      textWrap?.classList.remove(
        'dragging'
      );
    }
  );

  textarea?.addEventListener(
    'drop',
    event => {
      event.preventDefault();

      textWrap?.classList.remove(
        'dragging'
      );

      const text =
        event.dataTransfer?.getData(
          'text/plain'
        ) || '';

      if(
        text &&
        textarea
      ){
        textarea.value = text;
        textarea.dispatchEvent(
          new Event(
            'input',
            {
              bubbles:true
            }
          )
        );

        textarea.focus();
      }
    }
  );

  textarea?.addEventListener(
    'input',
    () => {
      if(error){
        error.textContent = '';
      }

      if(
        textarea.value.trim()
      ){
        textarea.classList.add(
          'has-value'
        );
      }else{
        textarea.classList.remove(
          'has-value'
        );
      }
    }
  );

  textarea?.focus();

  submit?.addEventListener(
    'click',
    async() => {

      const source =
        textarea?.value?.trim() || '';

      if(error){
        error.textContent = '';
      }

      if(!source){

        if(error){
          error.textContent =
            'Вставь сообщение с расписанием.';
        }

        textarea?.focus();

        return;
      }

      const original =
        submit.innerHTML;

      submit.disabled = true;

      submit.innerHTML = `
        <span class="spinner small"></span>
        Распознаём…
      `;

      try{

        const response =
          await api(
            '/api/schedule/parse',
            {
              method:'POST',
              body:JSON.stringify({
                text:source
              })
            }
          );

        if(!response?.schedule){
          throw new Error(
            'Nova не получила распознанное расписание.'
          );
        }

        const saved =
          saveImportedSchedule(
            response.schedule
          );

        close();

        state.status.schedule =
          'success';

        render();

        toast(
          `Расписание добавлено · ${saved.stats.lessons} пар.`,
          'success'
        );

      }catch(errorValue){

        if(error){
          error.textContent =
            errorValue?.message ||
            'Не удалось распознать расписание.';
        }

      }finally{

        if(
          document.body.contains(
            submit
          )
        ){
          submit.disabled = false;
          submit.innerHTML =
            original;
        }

      }
    }
  );

  /*
   * Tiny entrance animation. The modal itself stays CSS-only
   * after this point.
   */
  novaFrame(() => {
    dialog?.classList.add(
      'is-visible'
    );
  });
}


function scheduleLessonMarkup(lesson, todayKey){
  const type =
    scheduleTypeClass(
      lesson?.type
    );

  const date =
    scheduleDateKey(
      lesson?.date
    );

  const isToday =
    date === todayKey;

  const next =
    novaScheduleNextLesson();

  const isNext =
    Boolean(
      next &&
      next.date === date &&
      String(
        next.start || ''
      ) === String(
        lesson?.start || ''
      ) &&
      String(
        next.subject || ''
      ) === String(
        lesson?.subject || ''
      )
    );

  const room =
    String(
      lesson?.room || ''
    ).trim();

  const teacher =
    String(
      lesson?.teacher || ''
    ).trim();

  return `
    <article
      class="
        nova-lesson-card
        lesson-${esc(type)}
        ${isToday ? 'lesson-is-today' : ''}
        ${isNext ? 'lesson-is-next' : ''}
      "
    >

      <div class="nova-lesson-time">

        <strong>
          ${esc(
            lesson?.start ||
            '--:--'
          )}
        </strong>

        <span>
          ${esc(
            lesson?.end ||
            '--:--'
          )}
        </span>

      </div>

      <div class="nova-lesson-indicator"></div>

      <div class="nova-lesson-content">

        <div class="nova-lesson-labels">

          <span class="nova-lesson-type">
            ${esc(
              scheduleTypeLabel(
                lesson?.type
              )
            )}
          </span>

          ${
            isNext
              ? `
                <span class="nova-lesson-next">
                  Следующая
                </span>
              `
              : ''
          }

        </div>

        <h3>
          ${esc(
            lesson?.subject ||
            'Занятие'
          )}
        </h3>

        <div class="nova-lesson-meta">

          ${
            room
              ? `
                <span>
                  ${icon('calendar',11)}
                  Аудитория
                  <b>${esc(room)}</b>
                </span>
              `
              : ''
          }

          ${
            teacher
              ? `
                <span>
                  ${icon('user',11)}
                  Преподаватель
                  <b>${esc(teacher)}</b>
                </span>
              `
              : ''
          }

        </div>

      </div>

      <span class="nova-lesson-arrow">
        ${icon('arrow',15)}
      </span>

    </article>
  `;
}

function schedulePage(){

  const schedule =
    state.scheduleImport;

  if(!schedule){

    return `
      <section
        class="
          page
          schedule-page
          nova-schedule-empty-page-v4
        "
      >

        <div class="nova-schedule-empty-v4-page">

          <div class="nova-schedule-empty-v4-copy">

            <span class="nova-schedule-v4-kicker">
              ПЕРСОНАЛЬНОЕ РАСПИСАНИЕ
            </span>

            <h1>
              Учебная неделя,
              <span>которая всегда под рукой.</span>
            </h1>

            <p>
              Добавь одно сообщение из университетского Telegram-бота.
              Nova превратит его в понятное расписание,
              а затем будет подсказывать ближайшие пары.
            </p>

            <div class="nova-schedule-empty-v4-actions">

              <button
                class="primary"
                type="button"
                data-schedule-action="import"
              >
                ${icon('calendar',17)}
                Добавить расписание
              </button>

              <a
                href="https://t.me/finashkakrd_bot"
                target="_blank"
                rel="noopener noreferrer"
                class="nova-schedule-telegram-v4"
              >
                ${icon('send',14)}
                Открыть Telegram
                ${icon('arrow',12)}
              </a>

            </div>

          </div>

          <div class="nova-schedule-empty-v4-preview">

            <div class="nova-preview-head-v4">

              <div>
                <span>
                  NOVA SCHEDULE
                </span>

                <b>
                  Ближайшая пара
                </b>
              </div>

              <span class="nova-preview-live-v4">
                <i></i>
                LIVE
              </span>

            </div>

            <div class="nova-preview-next-v4">

              <div class="nova-preview-time-v4">
                09:40
              </div>

              <div class="nova-preview-line-v4"></div>

              <div>
                <span>
                  ЛЕКЦИЯ
                </span>

                <b>
                  Теория игр
                </b>

                <small>
                  ауд. 84 · Коренева О.В.
                </small>
              </div>

            </div>

            <div class="nova-preview-days-v4">

              <span class="active">
                <b>ПН</b>
                <strong>21</strong>
              </span>

              <span>
                <b>ВТ</b>
                <strong>22</strong>
              </span>

              <span>
                <b>СР</b>
                <strong>23</strong>
              </span>

              <span>
                <b>ЧТ</b>
                <strong>24</strong>
              </span>

              <span>
                <b>ПТ</b>
                <strong>25</strong>
              </span>

            </div>

            <div class="nova-preview-foot-v4">

              <span>
                <b>10</b>
                пар
              </span>

              <span>
                <b>5</b>
                дней
              </span>

              <span>
                <b>1×</b>
                в неделю
              </span>

            </div>

          </div>

        </div>

      </section>
    `;
  }

  const lessons =
    Array.isArray(
      schedule.lessons
    )
      ? [...schedule.lessons]
      : [];

  const todayKey =
    scheduleTodayKey();

  const days =
    [...new Map(
      lessons.map(
        lesson => [
          scheduleDateKey(
            lesson?.date
          ),
          true
        ]
      )
    ).keys()]
      .filter(Boolean)
      .sort();

  const education =
    schedule.education || {};

  const next =
    novaScheduleNextLesson();

  const parity =
    schedule.period?.parityLabel ||
    schedule.period?.parity ||
    '';

  return `
    <section
      class="
        page
        schedule-page
        nova-schedule-week-page-v4
      "
    >

      <div class="nova-schedule-top-v4">

        <div class="nova-schedule-title-v4">

          <span class="nova-schedule-v4-kicker">
            МОЯ УЧЕБНАЯ НЕДЕЛЯ
          </span>

          <h1>
            Расписание
          </h1>

          <p>
            ${esc(
              education.program ||
              'Прикладная математика и информатика'
            )}
            ·
            ${esc(
              education.course ||
              '—'
            )} курс
            · группа
            ${esc(
              education.group ||
              '—'
            )}
          </p>

        </div>

        <div class="nova-schedule-top-actions-v4">

          ${
            next
              ? `
                <div class="nova-schedule-next-badge-v4">

                  <span>
                    ${
                      next.isTomorrow
                        ? 'ЗАВТРА'
                        : next.isToday
                          ? 'СЕГОДНЯ'
                          : 'БЛИЖАЙШАЯ'
                    }
                  </span>

                  <b>
                    ${esc(
                      next.start ||
                      '--:--'
                    )}
                  </b>

                  <small>
                    ${esc(
                      next.subject ||
                      'Занятие'
                    )}
                  </small>

                </div>
              `
              : ''
          }

          <button
            class="secondary"
            type="button"
            data-schedule-action="import"
          >
            ${icon('refresh',15)}
            Обновить
          </button>

          <button
            class="icon-btn nova-schedule-delete-v4"
            type="button"
            data-schedule-action="clear"
            aria-label="Удалить расписание"
            title="Удалить расписание"
          >
            ${icon('x',15)}
          </button>

        </div>

      </div>

      <div class="nova-schedule-info-v4">

        <div class="nova-schedule-info-main-v4">

          <span class="nova-schedule-info-icon-v4">
            ${icon('calendar',19)}
          </span>

          <div>

            <b>
              ${esc(
                schedule.period?.label ||
                'Учебная неделя'
              )}
            </b>

            <small>
              @finashkakrd_bot
              ${
                parity
                  ? ` · ${esc(
                      parity
                    )}`
                  : ''
              }
            </small>

          </div>

        </div>

        <div class="nova-schedule-info-stats-v4">

          <span>
            <b>
              ${
                schedule.stats?.lessons ||
                lessons.length
              }
            </b>
            <small>пар</small>
          </span>

          <span>
            <b>
              ${
                schedule.stats?.days ||
                days.length
              }
            </b>
            <small>дней</small>
          </span>

          <span>
            <b>
              ${
                next
                  ? next.start
                  : '—'
              }
            </b>
            <small>ближайшая</small>
          </span>

        </div>

      </div>

      <div class="nova-schedule-week-grid-v4">

        ${
          days.map(
            date => {

              const dayLessons =
                lessons
                  .filter(
                    lesson =>
                      scheduleDateKey(
                        lesson?.date
                      ) === date
                  )
                  .sort(
                    (a,b) =>
                      Number(
                        a?.startMinutes ||
                        0
                      ) -
                      Number(
                        b?.startMinutes ||
                        0
                      )
                  );

              const parsed =
                new Date(
                  `${date}T12:00:00`
                );

              const dayNumber =
                parsed.getDate();

              const month =
                parsed.toLocaleDateString(
                  'ru-RU',
                  {
                    month:'short'
                  }
                ).replace(
                  '.',
                  ''
                );

              const isToday =
                date === todayKey;

              const isNextDay =
                next &&
                next.date === date;

              return `
                <section
                  class="
                    nova-schedule-day-v4
                    ${isToday ? 'is-today' : ''}
                    ${isNextDay ? 'is-next-day' : ''}
                  "
                >

                  <header
                    class="nova-schedule-day-header-v4"
                  >

                    <div
                      class="
                        nova-schedule-date-bubble-v4
                        ${isToday ? 'today' : ''}
                      "
                    >
                      <strong>
                        ${dayNumber}
                      </strong>

                      <small>
                        ${esc(
                          month
                        )}
                      </small>
                    </div>

                    <div
                      class="nova-schedule-day-copy-v4"
                    >

                      <span>
                        ${esc(
                          scheduleDayText(
                            date
                          )
                        )}
                      </span>

                      ${
                        isToday
                          ? `
                            <b>
                              Сегодня
                            </b>
                          `
                          : ''
                      }

                      ${
                        isNextDay &&
                        !isToday
                          ? `
                            <b class="tomorrow">
                              Ближайшее
                            </b>
                          `
                          : ''
                      }

                    </div>

                    <span
                      class="nova-schedule-day-count-v4"
                    >
                      ${dayLessons.length}
                      ${
                        dayLessons.length === 1
                          ? 'пара'
                          : 'пар'
                      }
                    </span>

                  </header>

                  <div
                    class="nova-schedule-day-list-v4"
                  >

                    ${
                      dayLessons
                        .map(
                          lesson =>
                            scheduleLessonMarkup(
                              lesson,
                              todayKey
                            )
                        )
                        .join('')
                    }

                  </div>

                </section>
              `;
            }
          ).join('')
        }

      </div>

      <div class="nova-schedule-bottom-note-v4">

        ${icon('info',13)}

        <span>
          Расписание хранится на этом устройстве.
          Обновляй его примерно раз в неделю из
          <b>@finashkakrd_bot</b>.
        </span>

      </div>

    </section>
  `;
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
/* messages empty-state quality contract */
const NOVA_MESSAGES_EMPTY_TEXT = 'Новых сообщений нет.';

/* NOVA 27.0 · MESSAGE THREAD UX */

/* NOVA 27.1 · MESSAGE AUTHOR RESOLUTION */

function nova27MessageSenderId(message){
  const candidates = [
    message?.useridfrom,
    message?.userIdFrom,
    message?.userid,
    message?.user?.id,
    message?.fromid,
    message?.fromId,
    message?.senderid,
    message?.senderId,
    message?.authorid,
    message?.authorId,
    message?.from?.id,
    message?.sender?.id,
    message?.author?.id
  ];

  const found = candidates.find(
    value => value !== undefined &&
             value !== null &&
             String(value).trim() !== ''
  );

  return found == null ? '' : String(found);
}

function nova27MessageSenderName(message, fallback='Собеседник'){
  const candidates = [
    message?.userfrom?.fullname,
    message?.userfrom?.fullName,
    message?.userfrom?.name,

    message?.from?.fullname,
    message?.from?.fullName,
    message?.from?.name,

    message?.sender?.fullname,
    message?.sender?.fullName,
    message?.sender?.name,

    message?.author?.fullname,
    message?.author?.fullName,
    message?.author?.name,

    message?.user?.fullname,
    message?.user?.fullName,
    message?.user?.name
  ];

  const found = candidates.find(
    value => String(value || '').trim()
  );

  return found
    ? String(found).trim()
    : fallback;
}

function nova27LatestMessage(conversation){
  const messages = Array.isArray(conversation?.messages)
    ? conversation.messages.slice().sort(
        (a,b) => Number(a?.timecreated||0) - Number(b?.timecreated||0)
      )
    : [];

  return messages.length ? messages[messages.length - 1] : null;
}

function messagesPage(){
  if(state.status.messages==='loading'){
    return `
      <section class="page messages-page">
        ${PageHead({
          eyebrow:'КОММУНИКАЦИЯ',
          title:'Сообщения',
          sub:'Загружаем диалоги Campus…'
        })}
        ${skeletonGrid(2)}
      </section>
    `;
  }

  if(state.status.messages==='error'){
    return `
      <section class="page messages-page">
        ${PageHead({
          eyebrow:'КОММУНИКАЦИЯ',
          title:'Сообщения',
          sub:'Не удалось получить диалоги.'
        })}
        ${statePanel('error','messages')}
      </section>
    `;
  }

  const m = state.data.messages || {};
  const conv = Array.isArray(m.conversations) ? m.conversations : [];

  return `
    <section class="page messages-page">

      ${PageHead({
        eyebrow:'КОММУНИКАЦИЯ',
        title:'Сообщения',
        sub:'Переписка остаётся внутри Nova.',
        children:`
          <button
            class="secondary"
            data-retry="messages"
            type="button"
          >
            ${icon('refresh',16)}
            Обновить
          </button>
        `
      })}

      <div class="messages-shell ${state.selectedConversation ? 'conversation-open' : ''}">

        <aside class="conversation-list">

          <div class="conversation-list-head">
            <div>
              <b>Диалоги</b>
              <small>
                ${conv.length ? `${conv.length} активных` : 'Пока пусто'}
              </small>
            </div>
          </div>

          <div class="conversation-list-body">

            ${
              conv.map(c=>{
                const selected =
                  String(c.id) === String(state.selectedConversation);

                const latest = nova27LatestMessage(c);

                const preview =
                  messageText(
                    latest?.text ||
                    latest?.message ||
                    'Нет сообщений'
                  ).trim().slice(0,72) || 'Нет сообщений';

                const title =
                  c.name ||
                  c.members?.find?.(
                    m => String(m?.id) !== String(state.user?.id)
                  )?.fullname ||
                  'Диалог';

                const unread =
                  Number(c.unreadcount ?? c.unreadCount ?? 0);

                return `
                  <button
                    class="conversation-item ${selected ? 'active' : ''}"
                    data-conversation="${esc(c.id)}"
                    type="button"
                    aria-label="Открыть диалог ${esc(title)}"
                  >
                    <span class="avatar">
                      ${esc(title.slice(0,1).toUpperCase())}
                    </span>

                    <span class="conversation-item-main">

                      <span class="conversation-item-top">
                        <b>${esc(title)}</b>

                        ${
                          latest?.timecreated
                            ? `<time>${formatTime(latest.timecreated)}</time>`
                            : ''
                        }
                      </span>

                      <span class="conversation-item-bottom">
                        <small>${esc(preview)}</small>

                        ${
                          unread > 0
                            ? `<span class="conversation-unread">${unread > 99 ? '99+' : unread}</span>`
                            : ''
                        }
                      </span>

                    </span>
                  </button>
                `;
              }).join('') ||

              `
                <div class="conversation-list-empty">
                  <div class="conversation-list-empty-icon">
                    ${icon('message',20)}
                  </div>
                  <b>Диалогов пока нет</b>
                  <small>Новые сообщения появятся здесь.</small>
                </div>
              `
            }

          </div>
        </aside>

        <main class="conversation-view" id="conversation-view">

          ${
            state.selectedConversation
              ? `
                <div class="loading-center">
                  <span class="spinner"></span>
                  <p>Открываем переписку…</p>
                </div>
              `
              : `
                <div class="conversation-empty">
                  <div class="conversation-empty-icon">
                    ${icon('message',26)}
                  </div>

                  <h2>Выберите диалог</h2>

                  <p>
                    Здесь появится история переписки
                    и поле для ответа.
                  </p>
                </div>
              `
          }

        </main>
      </div>
    </section>
  `;
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

                    const visual=
                      learningFileVisual(f);

                    const fileType=
                      learningFileType(f);

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

                          <span
                            class="nova-file-icon tone-${visual.tone}"
                            data-file-type="${esc(fileType)}"
                          >
                            ${icon(visual.icon,19)}
                          </span>

                          <span class="nova-file-copy">

                            <b>
                              ${esc(filename)}
                            </b>

                            <small>
                              <span class="nova-file-type">
                                ${esc(fileType)}
                              </span>

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

  const items =
    Array.isArray(state.data.materials)
      ? state.data.materials
      : [];

  const groups =
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
                  group.items.map(a=>{
                    const material =
                      learningMaterialVisual(a);

                    return `
                      <button
                        class="
                          material-card
                          task-card
                          material-tone-${esc(
                            material.tone || 'material'
                          )}
                        "
                        data-activity="${activityRefAttr(a)}"
                      >

                        <span class="material-card-icon">

                          <span class="material-card-icon-core">
                            ${icon(
                              material.icon || 'file',
                              19
                            )}
                          </span>

                          <small class="material-card-kind">
                            ${esc(
                              material.shortLabel ||
                              material.label ||
                              'МАТЕРИАЛ'
                            )}
                          </small>

                        </span>

                        <span class="material-card-main">

                          <b>
                            ${esc(
                              a.identity?.name ||
                              'Материал'
                            )}
                          </b>

                          <small>
                            ${esc(
                              a.ref?.type ||
                              'material'
                            )}
                          </small>

                        </span>

                        <span class="material-card-arrow">
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
  if (button.dataset.novaBound === '1') return;

  button.dataset.novaBound = '1';

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

function bindQuizContinue() {
  const button = $('#quiz-continue-button');
  if (!button) return;
  if (button.dataset.novaBound === '1') return;

  button.dataset.novaBound = '1';

  button.addEventListener('click', async () => {
    if (button.disabled) return;

    const target =
      button.dataset.quizPath || '';

    if (!target) {
      toast(
        'Не удалось определить незавершённую попытку.',
        'error'
      );
      return;
    }

    button.disabled = true;
    const original = button.innerHTML;

    button.innerHTML =
      `${icon('spinner',16)} Открываем…`;

    try {
      await loadNovaQuizPage(target);
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

function normalizeLearningText(value = ''){
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function detectLearningMaterial(a = {}, result = {}, title = ''){
  const content = a?.content || {};

  const files = [
    ...(Array.isArray(content.files) ? content.files : []),
    ...(Array.isArray(result?.files) ? result.files : []),
    ...(result?.file ? [result.file] : [])
  ];

  const fileText = files
    .map(file => [
      file?.filename,
      file?.mimetype,
      file?.url,
      file?.fileurl
    ].map(normalizeLearningText).join(' '))
    .join(' ');

  const haystack = [
    title,
    a?.identity?.name,
    a?.identity?.shortName,
    a?.name,
    content?.name,
    content?.description,
    a?.ref?.type,
    a?.ref?.modname,
    fileText
  ]
    .map(normalizeLearningText)
    .join(' ');

  /*
   * Порядок важен:
   * сначала специальные учебные типы,
   * потом общий файл/материал.
   */

  if(
    /лабораторн|лабораторная|lab\b/.test(haystack)
  ){
    return {
      key:'lab',
      label:'Лабораторная',
      shortLabel:'ЛАБОРАТОРНАЯ',
      buttonLabel:'Скачать лабораторную',
      icon:'file',
      tone:'lab'
    };
  }

  if(
    /практическ|практика|практическое занятие|практическая работа/.test(haystack)
  ){
    return {
      key:'practice',
      label:'Практика',
      shortLabel:'ПРАКТИКА',
      buttonLabel:'Скачать практику',
      icon:'check-square',
      tone:'practice'
    };
  }

  if(
    /семинар|семинарск/.test(haystack)
  ){
    return {
      key:'seminar',
      label:'Семинар',
      shortLabel:'СЕМИНАР',
      buttonLabel:'Скачать материал',
      icon:'book',
      tone:'seminar'
    };
  }

  if(
    /лекц|lecture/.test(haystack)
  ){
    return {
      key:'lecture',
      label:'Лекция',
      shortLabel:'ЛЕКЦИЯ',
      buttonLabel:'Скачать лекцию',
      icon:'book',
      tone:'lecture'
    };
  }

  if(
    /презентац|презентация|presentation|слайды|slides/.test(haystack)
  ){
    return {
      key:'presentation',
      label:'Презентация',
      shortLabel:'ПРЕЗЕНТАЦИЯ',
      buttonLabel:'Скачать презентацию',
      icon:'file',
      tone:'presentation'
    };
  }

  if(
    /методич|методическое пособие|учебное пособие|manual|guide/.test(haystack)
  ){
    return {
      key:'guide',
      label:'Учебный материал',
      shortLabel:'УЧЕБНЫЙ МАТЕРИАЛ',
      buttonLabel:'Скачать материал',
      icon:'file',
      tone:'guide'
    };
  }

  if(
    /файл|file|document|документ|\.pdf\b|\.docx?\b|\.xlsx?\b|\.pptx?\b/.test(haystack)
  ){
    return {
      key:'file',
      label:'Файл',
      shortLabel:'ФАЙЛ',
      buttonLabel:'Скачать файл',
      icon:'file',
      tone:'file'
    };
  }

  return {
    key:'material',
    label:'Материал',
    shortLabel:'МАТЕРИАЛ',
    buttonLabel:'Скачать материал',
    icon:'file',
    tone:'material'
  };
}

function learningMimeFromName(name = ''){
  const lower =
    String(name || '')
      .toLowerCase();

  if(lower.endsWith('.pdf')) return 'application/pdf';
  if(lower.endsWith('.doc')) return 'application/msword';
  if(lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if(lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if(lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if(lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if(lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if(lower.endsWith('.zip')) return 'application/zip';

  return '';
}

function learningFilenameFromUrl(url = ''){
  try{
    const parsed =
      new URL(
        String(url || ''),
        campusOrigin() || window.location.origin
      );

    const parts =
      parsed.pathname
        .split('/')
        .filter(Boolean);

    return (
      decodeURIComponent(
        parts[parts.length - 1] || ''
      )
        .replace(/\?.*$/,'')
        .trim()
    ) || 'Файл';
  }catch{
    return 'Файл';
  }
}

function normalizeLearningFileUrl(value = ''){
  const raw =
    String(value || '').trim();

  if(!raw || raw === '#'){
    return null;
  }

  if(/^javascript:/i.test(raw)){
    return null;
  }

  /*
   * Сначала пробуем стандартный Nova normalizer.
   */
  const normalized =
    normalizePath(raw);

  if(normalized && isFile(normalized)){
    return normalized;
  }

  /*
   * Потом корректно разрешаем относительный Campus URL.
   */
  try{
    const base =
      new URL(
        location.href
      );

    const parsed =
      new URL(
        raw,
        base
      );

    const origin =
      campusOrigin();

    if(
      origin &&
      parsed.origin !== origin
    ){
      return null;
    }

    const path =
      parsed.pathname +
      parsed.search +
      parsed.hash;

    if(isFile(path)){
      return normalizePath(path);
    }

  }catch{
    return null;
  }

  return null;
}

function extractActivityFilesFromHtml(
  html = ''
){
  const source =
    String(html || '');

  if(!source.trim()){
    return [];
  }

  const doc =
    new DOMParser().parseFromString(
      source,
      'text/html'
    );

  const out = [];
  const seen = new Set();

  const addFile = (
    rawPath,
    filename = '',
    filesize = 0,
    mimetype = '',
    downloadViaPage = false
  ) => {

    const normalized =
      normalizePath(
        rawPath
      );

    if(
      !normalized ||
      normalized === '/' ||
      /^javascript:/i.test(
        String(rawPath || '')
      )
    ){
      return;
    }

    if(
      seen.has(normalized)
    ){
      return;
    }

    const cleanName =
      text(
        filename
      ) ||
      learningFilenameFromUrl(
        normalized
      ) ||
      'Файл';

    /*
     * Accept both:
     *
     * /pluginfile.php/...
     *
     * and indirect:
     *
     * /mod/resource/view.php?id=...
     *
     */
    const looksLikeDocument =
      isFile(normalized) ||
      /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(
        cleanName
      );

    const looksLikeResource =
      /\/mod\/resource\/view\.php(?:\?|$)/i.test(
        normalized
      ) ||
      /\/mod\/folder\/view\.php(?:\?|$)/i.test(
        normalized
      );

    if(
      !looksLikeDocument &&
      !looksLikeResource &&
      !downloadViaPage
    ){
      return;
    }

    out.push({
      fileurl:normalized,

      filename:
        cleanName,

      mimetype:
        mimetype ||
        learningMimeFromName(
          cleanName
        ),

      filesize:
        Number(
          filesize || 0
        ) || 0,

      downloadViaPage:
        Boolean(
          downloadViaPage ||
          !isFile(normalized)
        )
    });

    seen.add(normalized);
  };

  /*
   * Standard links.
   */
  for(
    const link of doc.querySelectorAll(
      'a[href], area[href]'
    )
  ){

    const raw =
      link.getAttribute(
        'href'
      ) || '';

    const filename =
      text(
        link.textContent || ''
      ) ||
      learningFilenameFromUrl(
        raw
      );

    addFile(
      raw,
      filename,
      link.getAttribute(
        'data-filesize'
      ),
      link.getAttribute(
        'data-mimetype'
      ),
      false
    );
  }

  /*
   * Moodle data-* links.
   */
  for(
    const element of doc.querySelectorAll(
      '[data-fileurl],[data-url],[data-href]'
    )
  ){

    const raw =
      element.getAttribute(
        'data-fileurl'
      ) ||
      element.getAttribute(
        'data-url'
      ) ||
      element.getAttribute(
        'data-href'
      ) ||
      '';

    const filename =
      text(
        element.textContent || ''
      ) ||
      learningFilenameFromUrl(
        raw
      );

    addFile(
      raw,
      filename,
      element.getAttribute(
        'data-filesize'
      ),
      element.getAttribute(
        'data-mimetype'
      ),
      true
    );
  }

  return out;
}

function collectActivityFiles(
  a = {},
  result = {}
){
  const activityKind =
    String(
      result?.kind ||
      a?.ref?.type ||
      ''
    ).toLowerCase();

  const graphFiles = [
    ...(Array.isArray(
      a?.content?.files
    )
      ? a.content.files
      : [])
  ];

  const pageFiles = [
    ...(Array.isArray(
      result?.files
    )
      ? result.files
      : [])
  ];

  /*
   * RESOURCE ISOLATION:
   *
   * Once a resource has been opened, result.files came
   * directly from that resource's own Campus page.
   *
   * NEVER merge course graph files into it.
   */
  let primary;

  if (
    activityKind === 'resource'
  ) {
    primary =
      pageFiles;
  } else if (
    activityKind === 'file'
  ) {
    primary =
      pageFiles.length
        ? pageFiles
        : graphFiles.slice(
            0,
            1
          );
  } else {
    primary = [
      ...pageFiles,
      ...graphFiles
    ];
  }

  /*
   * HTML is a last-resort fallback only.
   */
  const all =
    primary.length > 0
      ? primary
      : (
          result?.html
            ? extractActivityFilesFromHtml(
                result.html
              )
            : []
        );

  const out = [];
  const seen = new Set();

  for (
    const file of all
  ) {
    const fileurl =
      normalizePath(
        file?.fileurl ||
        file?.url ||
        ''
      );

    if (
      !fileurl ||
      seen.has(fileurl)
    ) {
      continue;
    }

    const filename =
      text(
        file?.filename ||
        file?.name ||
        ''
      ) ||
      learningFilenameFromUrl(
        fileurl
      ) ||
      'Файл';

    out.push({
      ...file,

      fileurl,

      filename,

      mimetype:
        file?.mimetype ||
        learningMimeFromName(
          filename
        ),

      downloadViaPage:
        Boolean(
          file?.downloadViaPage
        )
    });

    seen.add(
      fileurl
    );
  }

  return out;
}

function learningFileLabel(file = {}){
  const raw =
    String(
      file?.filename ||
      file?.name ||
      'Файл'
    ).trim();

  return raw || 'Файл';
}



function learningMaterialVisual(a = {}) {
  const material =
    detectLearningMaterial(
      a,
      {},
      a?.identity?.name || ''
    );

  return {
    ...material,
    icon:
      material?.icon ||
      (
        a?.ref?.type === 'folder'
          ? 'folder'
          : 'file'
      ),
    tone:
      material?.tone ||
      (
        a?.ref?.type === 'folder'
          ? 'folder'
          : 'material'
      )
  };
}

function learningMaterialDescription(
  material,
  files = []
){
  if(files.length){
    if(files.length === 1){
      return (
        `${material.label} готова к скачиванию через защищённую Campus-сессию.`
      );
    }

    return (
      `${material.label} содержит ${files.length} файла. Все файлы доступны через защищённую Campus-сессию.`
    );
  }

  return (
    `${material.label} доступен через защищённую Campus-сессию.`
  );
}

function learningFileType(
  file = {}
){
  const filename =
    String(
      file?.filename ||
      file?.name ||
      ''
    ).toLowerCase();

  const mime =
    String(
      file?.mimetype ||
      ''
    ).toLowerCase();

  if(
    filename.endsWith('.pdf') ||
    mime.includes('pdf')
  ){
    return 'PDF';
  }

  if(
    filename.endsWith('.docx') ||
    mime.includes('wordprocessingml')
  ){
    return 'DOCX';
  }

  if(
    filename.endsWith('.doc') ||
    mime.includes('msword')
  ){
    return 'DOC';
  }

  if(
    filename.endsWith('.xlsx') ||
    mime.includes('spreadsheetml')
  ){
    return 'XLSX';
  }

  if(
    filename.endsWith('.xls') ||
    mime.includes('ms-excel')
  ){
    return 'XLS';
  }

  if(
    filename.endsWith('.pptx') ||
    mime.includes('presentationml')
  ){
    return 'PPTX';
  }

  if(
    filename.endsWith('.ppt') ||
    mime.includes('ms-powerpoint')
  ){
    return 'PPT';
  }

  if(
    filename.endsWith('.zip') ||
    mime.includes('zip')
  ){
    return 'ZIP';
  }

  if(
    filename.endsWith('.rar') ||
    mime.includes('rar')
  ){
    return 'RAR';
  }

  return 'ФАЙЛ';
}


function learningFileVisual(file = {}) {
  const type =
    learningFileType(file);

  const map = {
    PDF: {
      tone: 'pdf',
      icon: 'file'
    },
    DOCX: {
      tone: 'word',
      icon: 'file'
    },
    DOC: {
      tone: 'word',
      icon: 'file'
    },
    XLSX: {
      tone: 'excel',
      icon: 'chart'
    },
    XLS: {
      tone: 'excel',
      icon: 'chart'
    },
    PPTX: {
      tone: 'powerpoint',
      icon: 'file'
    },
    PPT: {
      tone: 'powerpoint',
      icon: 'file'
    },
    ZIP: {
      tone: 'archive',
      icon: 'folder'
    },
    RAR: {
      tone: 'archive',
      icon: 'folder'
    }
  };

  return (
    map[type] || {
      tone: 'file',
      icon: 'file'
    }
  );
}

function learningFileMeta(file = {}){
  const values = [];

  const type =
    learningFileType(file);

  if(type){
    values.push(type);
  }

  if(file?.filesize){
    values.push(
      formatFileSize(
        file.filesize
      )
    );
  }

  return (
    values.join(' · ') ||
    'Файл Campus'
  );
}

function learningDownloadButton(
  file,
  material,
  multiple = false
){
  if(!file?.fileurl){
    return '';
  }

  const filename =
    learningFileLabel(
      file
    );

  const label =
    multiple
      ? 'Скачать'
      : material.buttonLabel;

  const attribute =
    file?.downloadViaPage
      ? 'data-download-smart'
      : 'data-download';

  return `
    <button
      class="nova-learning-download"
      type="button"
      ${attribute}="${esc(file.fileurl)}"
      data-download-filename="${esc(filename)}"
      title="${esc(
        multiple
          ? `Скачать ${filename}`
          : label
      )}"
    >
      ${icon('download',17)}
      <span>
        ${esc(label)}
      </span>
    </button>
  `;
}

function learningFilesMarkup(
  files,
  material
){
  if(!files.length){
    return '';
  }

  if(files.length === 1){

    const file =
      files[0];

    return `
      <div
        class="nova-learning-files
               nova-learning-files-single"
      >

        <div
          class="nova-learning-file-single"
        >

          <div
            class="nova-learning-file-info"
          >

            <span
              class="nova-learning-file-icon"
            >
              ${icon(
                material.icon,
                19
              )}
            </span>

            <span
              class="nova-learning-file-details"
            >

              <b>
                ${esc(
                  learningFileLabel(
                    file
                  )
                )}
              </b>

              <small>
                ${esc(
                  learningFileMeta(
                    file
                  )
                )}
              </small>

            </span>

          </div>

          ${learningDownloadButton(
            file,
            material
          )}

        </div>

      </div>
    `;
  }

  return `
    <div
      class="nova-learning-files"
    >

      <div
        class="nova-learning-files-head"
      >
        <span>
          ФАЙЛЫ МАТЕРИАЛА
        </span>

        <b>
          ${files.length}
        </b>
      </div>

      <div
        class="nova-learning-file-list"
      >

        ${
          files.map(file=>`
            <div
              class="nova-learning-file"
            >

              <div
                class="nova-learning-file-info"
              >

                <span
                  class="nova-learning-file-icon"
                >
                  ${icon(
                    material.icon,
                    18
                  )}
                </span>

                <span
                  class="nova-learning-file-details"
                >

                  <b>
                    ${esc(
                      learningFileLabel(
                        file
                      )
                    )}
                  </b>

                  <small>
                    ${esc(
                      learningFileMeta(
                        file
                      )
                    )}
                  </small>

                </span>

              </div>

              ${learningDownloadButton(
                file,
                material,
                true
              )}

            </div>
          `).join('')
        }

      </div>

    </div>
  `;
}

function activityTypeLabel(a){
  const type =
    detectLearningMaterial(
      a,
      {},
      a?.identity?.name ||
      ''
    );

  const labels={
    resource:type.label,
    file:type.label,
    assign:'Задание',
    quiz:'Тест',
    page:'Страница',
    folder:'Папка',
    url:'Ссылка',
    forum:'Форум',
    glossary:'Глоссарий',
    lanebs:'Campus-активность',
    znaniumcombook:'Campus-активность'
  };

  return (
    labels[a?.ref?.type] ||
    a?.ref?.type ||
    'Активность'
  );
}
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
  [...root.querySelectorAll('p,div,span')].forEach(el => {
    const value =
      normalize(
        el.textContent
      );

    if(
      /^нажмите на ссылку(?:\s|$)/i.test(
        value
      ) &&
      value.length < 500
    ){
      el.remove();
      return;
    }

    if(
      /^(назад|далее)(?:\s|[а-яёa-z0-9])/i.test(
        value
      ) &&
      value.length < 500
    ){
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
    const linkText =
      normalize(
        a.textContent
      );

    if(
      /^(назад|далее)(?:\s|[а-яёa-z0-9])/i.test(
        linkText
      )
    ){
      const holder =
        a.closest('p,li');

      if(holder){
        holder.remove();
      }else{
        a.remove();
      }

      return;
    }

    /*
     * Файл уже представлен Nova отдельной кнопкой.
     * Убираем старую Moodle-ссылку, чтобы не было
     * двух разных способов скачать один и тот же файл.
     */
    const href =
      a.getAttribute('href') || '';

    const normalizedHref =
      normalizeLearningFileUrl(
        href
      );

    if(normalizedHref){
      const holder =
        a.closest('p,li');

      if(holder){
        holder.remove();
      }else{
        a.remove();
      }
    }
  });

  const output =
    String(root.tagName || '').toLowerCase() === 'form'
      ? root.outerHTML
      : root.innerHTML;

  return output.trim();
}



function practiceDescriptionFragment(result = {}) {
  const raw = String(result?.html || '');

  if (!raw) {
    return '';
  }

  const doc =
    new DOMParser().parseFromString(
      raw,
      'text/html'
    );

  let root =
    doc.querySelector('#intro');

  if (!root) {
    root =
      doc.querySelector(
        '.activity-description, .assign-intro, .assignment-description'
      );
  }

  if (!root) {
    return '';
  }

  const clone =
    root.cloneNode(true);

  clone.querySelectorAll(
    'script,style,noscript,nav,header,footer,' +
    '.navbar,.breadcrumb,.breadcrumbs,' +
    '#page-header,#page-footer,#nav-drawer,' +
    '.block_navigation,.block_settings,' +
    '.activity-navigation,.navfooter,.paging-bar'
  ).forEach(
    el => el.remove()
  );

  clone.querySelectorAll('table').forEach(
    table => {
      const value =
        String(
          table.textContent || ''
        );

      if (
        /Состояние ответа|Состояние оценивания|Submission status|Grading status/i.test(
          value
        )
      ) {
        table.remove();
      }
    }
  );

  clone.querySelectorAll('a').forEach(
    link => {
      const href =
        link.getAttribute('href') || '';

      if (
        /pluginfile|webservice\/pluginfile|tokenpluginfile|draftfile/i.test(
          href
        )
      ) {
        const holder =
          link.closest('p,li');

        if (holder) {
          holder.remove();
        } else {
          link.remove();
        }
      }
    }
  );

  return String(
    clone.innerHTML || ''
  )
    .replace(
      /<p>\s*<\/p>/gi,
      ''
    )
    .replace(
      /<div>\s*<\/div>/gi,
      ''
    )
    .trim();
}

function assignmentSourceMarkup(activity, result) {
  const content = activity?.content || {};

  const description =
    String(
      result?.description ||
      content.description ||
      ''
    ).trim();

  const descriptionHtml =
    practiceDescriptionFragment(result) ||
    String(
      result?.description ||
      content.description ||
      ''
    ).trim();

  const sourceFiles =
    Array.isArray(result?.files)
      ? result.files.filter(
          file => file?.fileurl
        )
      : [];

  const submission =
    result?.submission || {};

  const status =
    String(
      submission.status ||
      'unknown'
    ).toLowerCase();

  const statusMap = {
    'not-submitted': {
      label: 'Не отправлено',
      className: 'is-pending',
      iconName: 'clock'
    },
    draft: {
      label: 'Черновик',
      className: 'is-draft',
      iconName: 'edit'
    },
    submitted: {
      label: 'Отправлено',
      className: 'is-submitted',
      iconName: 'check'
    }
  };

  const statusUi =
    statusMap[status] ||
    {
      label: 'Состояние неизвестно',
      className: 'is-unknown',
      iconName: 'info'
    };

  const dates =
    Array.isArray(content.dates)
      ? content.dates
      : [];

  const due =
    dates.find(item =>
      /срок|deadline|due/i.test(
        String(item?.label || '')
      )
    );

  const deadlineText =
    String(
      result?.deadline?.text ||
      ''
    ).trim();

  const deadlineRemaining =
    String(
      result?.deadline?.remaining ||
      ''
    ).trim();

  const hasDeadline =
    Boolean(
      deadlineText ||
      due?.timestamp ||
      deadlineRemaining
    );

  const submissionFiles =
    Array.isArray(submission.files)
      ? submission.files.filter(
          file => file?.fileurl
        )
      : [];

  const submissionText =
    String(
      submission.text ||
      ''
    ).trim();

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


      <div class="nova-practice-status-grid">

        <div class="nova-practice-status-card ${statusUi.className}">
          <span class="nova-practice-status-icon">
            ${icon(statusUi.iconName,17)}
          </span>

          <div>
            <span class="eyebrow">СТАТУС</span>
            <b>${esc(statusUi.label)}</b>
          </div>
        </div>


        ${
          hasDeadline
            ? `
              <div class="nova-practice-status-card is-deadline">
                <span class="nova-practice-status-icon">
                  ${icon('calendar',17)}
                </span>

                <div>
                  <span class="eyebrow">СРОК СДАЧИ</span>

                  <b>
                    ${
                      deadlineText
                        ? esc(deadlineText)
                        : due?.timestamp
                          ? esc(formatLong(due.timestamp))
                          : 'Срок указан в Campus'
                    }
                  </b>

                  ${
                    deadlineRemaining
                      ? `<small>${esc(deadlineRemaining)}</small>`
                      : ''
                  }
                </div>
              </div>
            `
            : ''
        }

      </div>


      ${
        description
          ? `
            <div class="nova-practice-description">
              ${descriptionHtml || esc(description)}
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
        submissionFiles.length ||
        submissionText ||
        status === 'draft' ||
        status === 'submitted'
          ? `
            <div class="nova-practice-files nova-practice-my-answer">

              <div class="nova-practice-files-head">
                <div>
                  <span class="eyebrow">МОЙ ОТВЕТ</span>
                  <h3>
                    ${
                      status === 'submitted'
                        ? 'Отправленная работа'
                        : 'Сохранённый ответ'
                    }
                  </h3>
                </div>

                <span class="nova-practice-count">
                  ${
                    submissionFiles.length ||
                    (submissionText ? 1 : 0)
                  }
                </span>
              </div>


              ${
                submissionText
                  ? `
                    <div class="nova-practice-submission-text">
                      ${esc(submissionText)}
                    </div>
                  `
                  : ''
              }


              ${
                submissionFiles.length
                  ? `
                    <div class="nova-practice-file-list">

                      ${submissionFiles.map(file => `
                        <div class="nova-practice-file">

                          <span class="nova-practice-file-icon">
                            ${icon('file',19)}
                          </span>

                          <span class="nova-practice-file-copy">
                            <b>
                              ${esc(
                                file.filename ||
                                'Файл ответа'
                              )}
                            </b>

                            <small>
                              ${
                                file.mimetype
                                  ? esc(file.mimetype)
                                  : 'Файл ответа'
                              }

                              ${
                                file.filesize
                                  ? ` · ${formatFileSize(file.filesize)}`
                                  : ''
                              }
                            </small>
                          </span>

                          <button
                            class="nova-learning-download nova-practice-download"
                            type="button"
                            data-download="${esc(file.fileurl)}"
                          >
                            ${icon('download',16)}
                            Скачать
                          </button>

                        </div>
                      `).join('')}

                    </div>
                  `
                  : ''
              }

            </div>
          `
          : ''
      }


      ${
        sourceFiles.length
          ? `
            <div class="nova-practice-files">

              <div class="nova-practice-files-head">
                <div>
                  <span class="eyebrow">МАТЕРИАЛЫ</span>
                  <h3>Исходные файлы</h3>
                </div>

                <span class="nova-practice-count">
                  ${sourceFiles.length}
                </span>
              </div>

              <div class="nova-practice-file-list">

                ${sourceFiles.map(file => `
                  <div class="nova-practice-file">

                    <span class="nova-practice-file-icon">
                      ${icon('file',19)}
                    </span>

                    <span class="nova-practice-file-copy">
                      <b>
                        ${esc(
                          file.filename ||
                          'Файл'
                        )}
                      </b>

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

                    <button
                      class="nova-learning-download nova-practice-download"
                      type="button"
                      data-download="${esc(file.fileurl)}"
                    >
                      ${icon('download',16)}
                      Скачать
                    </button>

                  </div>
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

/* NOVA_QUIZ_WORKSPACE_20260920 */

function extractQuizNavigation(html = '', currentPath = '') {
  const doc = new DOMParser().parseFromString(
    String(html || ''),
    'text/html'
  );

  const seen = new Map();

  const links = [
    ...doc.querySelectorAll(
      'a[href*="/mod/quiz/attempt.php"], a[href*="attempt.php"]'
    )
  ];

  for (const link of links) {
    const href = link.getAttribute('href') || '';

    if (!/[?&]page=\d+/i.test(href)) continue;

    let url;

    try {
      url = new URL(
        href,
        campusOrigin() || window.location.origin
      );
    } catch {
      continue;
    }

    const page = Number(
      url.searchParams.get('page')
    );

    if (!Number.isInteger(page)) continue;

    const rawLabel =
      text(link.textContent || '') ||
      String(page + 1);

    const labelMatch =
      rawLabel.match(/\d+/);

    const label =
      labelMatch
        ? Number(labelMatch[0])
        : page + 1;

    const path = normalizePath(
      url.pathname +
      url.search +
      url.hash
    );

    if (!path || seen.has(page)) continue;

    const holder =
      link.closest(
        '.qnbutton,.navitem,.columnbutton,li,td'
      ) ||
      link;

    seen.set(
      page,
      {
        page,
        label,
        path,
        current:
          holder.classList.contains('thispage') ||
          holder.classList.contains('current') ||
          /\bthispage\b|\bcurrent\b/i.test(
            holder.className || ''
          )
      }
    );
  }

  let items =
    [...seen.values()]
      .sort((a,b)=>a.page-b.page);

  if (!items.length) {
    const match =
      String(currentPath || '')
        .match(/[?&]page=(\d+)/i);

    const page =
      Number(match?.[1] || 0);

    if (Number.isInteger(page)) {
      items = [{
        page,
        label:page + 1,
        path:normalizePath(currentPath),
        current:true
      }];
    }
  }

  const currentPage =
    Number(
      String(currentPath || '')
        .match(/[?&]page=(\d+)/i)?.[1] || 0
    );

  items.forEach(item=>{
    if (item.page === currentPage) {
      item.current = true;
    }
  });

  return items;
}

function mergeQuizNavigation(
  existing = [],
  html = '',
  currentPath = ''
) {
  const merged = new Map();

  for (const item of Array.isArray(existing) ? existing : []) {
    const page = Number(item?.page);
    const itemPath = normalizePath(item?.path || '');

    if (!Number.isInteger(page) || !itemPath) {
      continue;
    }

    merged.set(page, {
      ...item,
      page,
      path: itemPath,
      label:
        Number(item?.label) ||
        page + 1
    });
  }

  const discovered =
    extractQuizNavigation(
      html,
      currentPath
    );

  for (const item of discovered) {
    const page = Number(item?.page);
    const itemPath = normalizePath(item?.path || '');

    if (!Number.isInteger(page) || !itemPath) {
      continue;
    }

    merged.set(page, {
      ...item,
      page,
      path: itemPath,
      label:
        Number(item?.label) ||
        page + 1
    });
  }

  const currentPage =
    Number(
      String(currentPath || '')
        .match(/[?&]page=(\d+)/i)?.[1] || 0
    );

  return [...merged.values()]
    .sort((a,b)=>a.page-b.page)
    .map(item=>({
      ...item,
      current:
        item.page === currentPage ||
        normalizePath(item.path) === normalizePath(currentPath)
    }));
}

function quizQuestionNumbers(html = '') {
  const doc = new DOMParser().parseFromString(
    String(html || ''),
    'text/html'
  );

  const numbers = [];

  doc.querySelectorAll(
    '.que .qno,.que .qnum,.que .qno-text'
  ).forEach(el=>{
    const match =
      text(el.textContent || '')
        .match(/\d+/);

    if (!match) return;

    const value =
      Number(match[0]);

    if (
      Number.isInteger(value) &&
      !numbers.includes(value)
    ) {
      numbers.push(value);
    }
  });

  if (!numbers.length) {
    doc.querySelectorAll(
      '.que,.que.multichoice,.que.shortanswer,.que.truefalse'
    ).forEach((el,index)=>{
      const match =
        text(el.textContent || '')
          .match(/(?:вопрос|question)\s*(\d+)/i);

      if (match) {
        const value = Number(match[1]);

        if (!numbers.includes(value)) {
          numbers.push(value);
        }
      } else {
        numbers.push(index + 1);
      }
    });
  }

  return numbers.sort(
    (a,b)=>a-b
  );
}

function prepareQuizAttemptHtml(html = '', title = '') {
  const source =
    String(html || '');

  if(!source.trim()){
    return `
      <div class="inline-empty">
        Campus не передал содержимое попытки.
      </div>
    `;
  }

  const doc =
    new DOMParser().parseFromString(
      source,
      'text/html'
    );

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
    '#block-region-side-post',
    '.block_navigation',
    '.block_settings',
    '.usermenu',
    '.logininfo',
    '.activity-navigation',
    '.activity-navigation .navbutton',
    '.navfooter',
    '.paging-bar',
    '.quiznavigation',
    '.quiz-nav',
    '.quizaccessnotices',
    '.qnbutton'
  ];

  doc.querySelectorAll(
    removeSelectors.join(',')
  ).forEach(el=>el.remove());

  const titleNorm =
    text(title).toLowerCase();

  /*
   * Сначала пытаемся сохранить настоящую Moodle response form.
   * Это важно, потому что наши Nova-кнопки отправляют именно
   * эту форму напрямую.
   */
  const preferred = [
    'form#responseform',
    '#region-main',
    '#region-main-box',
    '[role="main"]',
    '#page-content',
    '.region-main',
    '#quizcontent',
    '.quizattempt',
    'main'
  ];

  let root = null;

  for(const selector of preferred){
    const candidate =
      doc.querySelector(selector);

    if(
      candidate &&
      candidate.textContent.trim().length > 40
    ){
      root = candidate;
      break;
    }
  }

  if(!root){
    const question =
      doc.querySelector('.que');

    root =
      question?.closest('form') ||
      question?.parentElement ||
      doc.body;
  }

  /*
   * Убираем нативные Moodle-кнопки. Nova управляет
   * переходом сама, поэтому две системы навигации
   * одновременно больше не конфликтуют.
   */
  root.querySelectorAll(
    [
      '.navbar',
      '.breadcrumb',
      '.breadcrumbs',
      '.block_navigation',
      '.block_settings',
      '#page-header',
      '#page-footer',
      '.navfooter',
      '.activity-navigation',
      '.paging-bar',
      '.quiznavigation',
      '.quiz-nav',
      '.submitbtns'
    ].join(',')
  ).forEach(el=>el.remove());

  [...root.querySelectorAll('h1,h2,h3')].forEach(el=>{
    const value =
      text(el.textContent || '')
        .toLowerCase();

    if(
      titleNorm &&
      (
        value === titleNorm ||
        value.includes(titleNorm)
      )
    ){
      el.remove();
    }
  });

  root.querySelectorAll('[style]').forEach(el=>{
    el.removeAttribute('style');
  });

  root.querySelectorAll('font,center').forEach(el=>{
    el.replaceWith(
      ...el.childNodes
    );
  });

  root.querySelectorAll(
    [
      '.quizsummary',
      '.quizreviewsummary',
      '.quizattemptnavigation'
    ].join(',')
  ).forEach(el=>el.remove());

  /*
   * Если корень это сама response form, нельзя возвращать
   * только innerHTML, иначе <form> исчезнет.
   */
  return (
    root.tagName === 'FORM'
      ? root.outerHTML
      : root.innerHTML
  ).trim();
}

function quizActionAvailable(html = '', action = '') {
  const doc =
    new DOMParser().parseFromString(
      String(html || ''),
      'text/html'
    );

  const controls = [
    ...doc.querySelectorAll(
      'button,input[type="submit"],input[type="image"]'
    )
  ];

  const patterns = {
    previous:/previous|prev|назад|предыдущ|back/i,
    next:/next|далее|следующ|вперёд|вперед/i,
    finish:/finish|submitallandfinish|заверш|законч|сдать|отправ/i
  };

  const matcher = patterns[action];

  if(!matcher){
    return false;
  }

  return controls.some(control=>{
    if(
      control.disabled ||
      (
        control.getAttribute('type') &&
        /^(button|reset)$/i.test(
          control.getAttribute('type')
        )
      )
    ){
      return false;
    }

    const name =
      control.getAttribute('name') || '';

    const value =
      control.getAttribute('value') || '';

    const content =
      control.textContent || '';

    if(
      action === 'previous' &&
      /^(previous|prev)$/i.test(name)
    ){
      return true;
    }

    if(
      action === 'next' &&
      /^(next|nextpage)$/i.test(name)
    ){
      return true;
    }

    if(
      action === 'finish' &&
      /^(finish|submitallandfinish)$/i.test(name)
    ){
      return true;
    }

    return matcher.test(
      `${name} ${value} ${content}`
    );
  });
}


function quizNavigationKey(result = {}) {
  const path =
    result.attemptPath ||
    result.redirectedPath ||
    '';

  if(path){
    const normalized = normalizePath(path);

    const match =
      normalized.match(
        /[?&]attempt=(\d+)/i
      );

    if(match?.[1]){
      return `attempt:${match[1]}`;
    }
  }

  const ref =
    result.activityRef ||
    result.activity?.identity?.reference ||
    '';

  return ref
    ? `activity:${ref}`
    : 'quiz:current';
}

function rememberQuizNavigation(result = {}) {
  const key =
    quizNavigationKey(result);

  const merged =
    mergeQuizNavigation(
      state.quizNavigationCache.get(key) || [],
      result.quizNavigation || [],
      result.html || '',
      result.attemptPath ||
        result.redirectedPath ||
        ''
    );

  if(merged.length){
    state.quizNavigationCache.set(
      key,
      merged
    );
  }

  return merged;
}

function quizAttemptMeta(result = {}) {
  const path =
    result.attemptPath ||
    result.redirectedPath ||
    '';

  const nav =
    mergeQuizNavigation(
      result.quizNavigation || [],
      result.html || '',
      path
    );

  const numbers =
    quizQuestionNumbers(
      result.html || ''
    );

  const total =
    Math.max(
      nav.length,
      numbers.length,
      1
    );

  let start =
    numbers.length
      ? numbers[0]
      : Number(
          String(path)
            .match(/[?&]page=(\d+)/i)?.[1] || 0
        ) + 1;

  let end =
    numbers.length
      ? numbers[numbers.length - 1]
      : start;

  const currentPage =
    Number(
      String(path)
        .match(/[?&]page=(\d+)/i)?.[1] || 0
    );

  const selected =
    nav.find(
      item=>item.page===currentPage
    );

  if (
    !numbers.length &&
    selected?.label
  ) {
    start = selected.label;
    end = selected.label;
  }

  start =
    Math.max(
      1,
      Math.min(
        total,
        Number(start) || 1
      )
    );

  end =
    Math.max(
      start,
      Math.min(
        total,
        Number(end) || start
      )
    );

  const label =
    start === end
      ? `Вопрос ${start} из ${total}`
      : `Вопросы ${start}–${end} из ${total}`;

  const progress =
    Math.round(
      (end / total) * 100
    );

  const nativePrevious =
    quizActionAvailable(
      result.html || '',
      'previous'
    );

  const nativeNext =
    quizActionAvailable(
      result.html || '',
      'next'
    );

  const canPrevious =
    nativePrevious ||
    start > 1;

  const canNext =
    nativeNext ||
    end < total;

  return {
    nav,
    total,
    start,
    end,
    label,
    progress,
    canPrevious,
    canNext
  };
}

function quizAttemptMarkup(
  result = {},
  title = ''
) {
  const meta =
    quizAttemptMeta(result);

  const current =
    result.attemptPath ||
    result.redirectedPath ||
    '';

  const html =
    prepareQuizAttemptHtml(
      result.html || '',
      title
    );

  return `
    <section class="nova-quiz-workspace">

      <header class="nova-quiz-head">

        <div class="nova-quiz-head-copy">

          <span class="nova-quiz-kicker">
            ${icon('quiz',13)}
            ТЕСТ · ПОПЫТКА
          </span>

          <h2>
            ${esc(title)}
          </h2>

          <p>
            Ответы отправляются в реальный Campus.
            Интерфейс Nova меняет только представление.
          </p>

        </div>

        <div class="nova-quiz-head-state">

          <span>
            ${meta.label}
          </span>

          <strong>
            ${meta.progress}%
          </strong>

        </div>

        <div class="nova-quiz-progress">
          <i style="width:${meta.progress}%"></i>
        </div>

      </header>

      <div class="nova-quiz-layout">

        <aside class="nova-quiz-nav">

          <div class="nova-quiz-nav-head">

            <div>
              <span>НАВИГАЦИЯ</span>
              <b>Вопросы</b>
            </div>

            <span class="nova-quiz-total">
              ${meta.total}
            </span>

          </div>

          <div class="nova-quiz-nav-grid">

            ${
              meta.nav.length
                ? meta.nav.map(item=>`
                    <button
                      type="button"
                      class="nova-quiz-nav-button ${item.current?'current':''}"
                      data-quiz-path="${esc(item.path || current)}"
                      aria-label="Вопрос ${item.label}"
                    >
                      ${esc(item.label)}
                    </button>
                  `).join('')
                : `
                    <button
                      type="button"
                      class="nova-quiz-nav-button current"
                      disabled
                    >
                      1
                    </button>
                `
            }

          </div>

          <div class="nova-quiz-nav-note">
            ${icon('info',13)}
            Навигация использует настоящую попытку Campus.
          </div>

        </aside>

        <section class="nova-quiz-content">

          <div class="nova-quiz-html">
            ${
              html ||
              '<div class="inline-empty">Вопросы теста не переданы Campus.</div>'
            }
          </div>

          <div class="nova-quiz-controls">

            <button
              type="button"
              class="secondary nova-quiz-control"
              data-quiz-control="previous"
              ${meta.canPrevious ? '' : 'disabled'}
            >
              ${icon('back',16)}
              Назад
            </button>

            <div class="nova-quiz-control-spacer"></div>

            <button
              type="button"
              class="secondary nova-quiz-control"
              data-quiz-control="next"
              ${meta.canNext ? '' : 'disabled'}
            >
              Далее
              ${icon('next',16)}
            </button>

            <button
              type="button"
              class="primary nova-quiz-control"
              data-quiz-control="finish"
            >
              ${icon('check',16)}
              Завершить тест
            </button>

          </div>

        </section>

      </div>

    </section>
  `;
}

async function loadNovaQuizPage(path) {
  const normalized =
    normalizePath(path);

  if(!normalized){
    toast(
      'Не удалось открыть вопрос.',
      'error'
    );
    return;
  }

  const quizContent =
    document.querySelector(
      '.nova-quiz-content'
    );

  const nextButton =
    document.querySelector(
      '[data-quiz-control="next"]'
    );

  if(quizContent){
    quizContent.classList.add(
      'nova-quiz-loading'
    );
  }

  if(nextButton){
    nextButton.disabled = true;
    nextButton.classList.add(
      'is-loading'
    );
    nextButton.innerHTML =
      `${icon('spinner',16)} Загружаем…`;
  }

  try {
    const d =
      await api(
        `/api/page?path=${encodeURIComponent(normalized)}`
      );

    if(
      !d?.page ||
      state.route !== 'activity' ||
      !state.data.activity
    ){
      return;
    }

    const previous =
      state.data.activity.result || {};

    const nextResult =
      updateQuizResultFromPage(
        d.page,
        previous,
        normalized
      );

    state.data.activity.result =
      nextResult;

    rememberQuizNavigation(
      nextResult
    );

    state.status.activity =
      'success';

    state.errors.activity =
      null;

    render();

    bindCampusContent();

    toast(
      'Вопрос открыт.',
      'success'
    );

  } catch(error) {

    toast(
      error?.message ||
        'Не удалось открыть вопрос.',
      'error'
    );

  } finally {

    const loadingContent =
      document.querySelector(
        '.nova-quiz-content'
      );

    if(loadingContent){
      loadingContent.classList.remove(
        'nova-quiz-loading'
      );
    }

    const next =
      document.querySelector(
        '[data-quiz-control="next"]'
      );

    if(next){
      next.classList.remove(
        'is-loading'
      );

      next.disabled = false;
    }
  }
}


async function submitNovaQuizControl(action) {
  const current =
    state.data.activity;

  if(!current?.activity?.ref){
    return;
  }

  const root =
    $('#campus-content');

  const result =
    current.result || {};

  const form =
    root?.querySelector(
      'form#responseform, form[action*="processattempt.php"], form'
    );

  if(!form){
    console.error(
      '[Nova][Quiz] response form not found',
      {
        action,
        attemptPath:
          result.attemptPath ||
          result.redirectedPath ||
          null
      }
    );

    toast(
      'Не удалось найти форму попытки Campus.',
      'error'
    );
    return;
  }

  const formAction =
    normalizePath(
      form.getAttribute('action') ||
      result.attemptPath ||
      result.redirectedPath ||
      ''
    );

  if(!formAction){
    toast(
      'Не удалось определить адрес отправки ответа.',
      'error'
    );
    return;
  }

  const submitter =
    quizSubmitter(
      form,
      action
    );

  let body;

  try{
    body =
      quizFormPayload(
        form,
        submitter,
        action
      );
  }catch(error){
    toast(
      error?.message ||
      'Не удалось собрать ответы теста.',
      'error'
    );
    return;
  }

  const controls =
    [...root.querySelectorAll(
      '[data-quiz-control]'
    )];

  controls.forEach(el=>{
    el.disabled = true;
  });

  console.info(
    '[Nova][Quiz] submit',
    {
      action,
      formAction,
      submitter:
        submitter
          ? {
              tag:submitter.tagName,
              type:
                submitter.getAttribute('type'),
              name:
                submitter.getAttribute('name'),
              value:
                submitter.getAttribute('value'),
              text:
                submitter.textContent?.trim()
            }
          : null
    }
  );

  try{
    /*
     * Больше НЕ используем requestSubmit().
     *
     * Это ключевой фикс:
     * - нет browser constraint validation;
     * - не теряются hidden inputs;
     * - не конфликтуют два набора кнопок;
     * - Campus получает настоящий form payload;
     * - sesskey добавляется сервером при необходимости.
     */
    const response =
      await api(
        `/api/campus/action?path=${encodeURIComponent(formAction)}`,
        {
          method:'POST',
          headers:{
            'content-type':
              'application/x-www-form-urlencoded'
          },
          body
        }
      );

    if(!response?.page){
      throw new Error(
        response?.error ||
        'Campus не вернул следующий шаг теста.'
      );
    }

    /*
     * После Finish возвращаемся к карточке теста.
     * Это одновременно обновляет статус Continue/Start.
     */
    if(action === 'finish'){
      await loadActivity(true, state.routeEpoch, true);

      toast(
        'Тест завершён.',
        'success'
      );

      return;
    }

    const previous =
      state.data.activity?.result || {};

    state.data.activity.result =
      updateQuizResultFromPage(
        response.page,
        previous,
        formAction
      );

    state.status.activity='success';
    state.errors.activity=null;

    render();
    bindCampusContent();

    toast(
      action === 'next'
        ? 'Следующий вопрос открыт.'
        : 'Предыдущий вопрос открыт.',
      'success'
    );

  }catch(error){
    controls.forEach(el=>{
      el.disabled = false;
    });

    toast(
      error?.message ||
      'Не удалось отправить ответ в Campus.',
      'error'
    );
  }
}

function injectNovaQuizInlineStyles() {
  if (
    typeof document === 'undefined' ||
    !document.head
  ) return;

  if (
    document.getElementById &&
    document.getElementById(
      'nova-quiz-inline-styles'
    )
  ) return;

  const style =
    document.createElement('style');

  style.id =
    'nova-quiz-inline-styles';

  style.textContent = `
    .nova-quiz-workspace{
      display:grid;
      gap:16px;
      width:100%;
    }

    .nova-quiz-head{
      position:relative;
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:12px 18px;
      padding:20px;
      border:1px solid var(--line);
      border-radius:22px;
      background:var(--surface);
      box-shadow:0 16px 48px rgba(0,0,0,.10);
      overflow:hidden;
    }

    .nova-quiz-head::after{
      content:"";
      position:absolute;
      width:180px;
      height:180px;
      right:-50px;
      top:-90px;
      border-radius:50%;
      background:rgba(24,183,255,.10);
      filter:blur(8px);
      pointer-events:none;
    }

    .nova-quiz-head-copy,
    .nova-quiz-head-state{
      position:relative;
      z-index:1;
    }

    .nova-quiz-kicker{
      display:inline-flex;
      align-items:center;
      gap:6px;
      color:var(--accent);
      font-size:9px;
      font-weight:900;
      letter-spacing:.14em;
    }

    .nova-quiz-head h2{
      margin:7px 0 0;
      color:var(--text);
      font-size:21px;
      font-weight:900;
      letter-spacing:-.045em;
      line-height:1.1;
    }

    .nova-quiz-head p{
      max-width:720px;
      margin:7px 0 0;
      color:var(--muted);
      font-size:10px;
      line-height:1.55;
    }

    .nova-quiz-head-state{
      display:flex;
      flex-direction:column;
      align-items:flex-end;
      justify-content:center;
      gap:3px;
      min-width:110px;
    }

    .nova-quiz-head-state span{
      color:var(--muted-2);
      font-size:8px;
      font-weight:800;
    }

    .nova-quiz-head-state strong{
      color:var(--text);
      font-size:18px;
      font-weight:900;
      letter-spacing:-.04em;
    }

    .nova-quiz-progress{
      grid-column:1 / -1;
      position:relative;
      height:6px;
      overflow:hidden;
      border-radius:999px;
      background:var(--surface-2);
      border:1px solid var(--line);
    }

    .nova-quiz-progress i{
      display:block;
      height:100%;
      min-width:3px;
      border-radius:999px;
      background:var(--accent);
      box-shadow:0 4px 14px rgba(24,183,255,.25);
      transition:width .35s ease;
    }

    .nova-quiz-layout{
      display:grid;
      grid-template-columns:220px minmax(0,1fr);
      gap:16px;
      align-items:start;
    }

    .nova-quiz-nav,
    .nova-quiz-content{
      min-width:0;
      border:1px solid var(--line);
      border-radius:20px;
      background:var(--surface);
      box-shadow:0 12px 36px rgba(0,0,0,.08);
    }

    .nova-quiz-nav{
      position:sticky;
      top:92px;
      padding:14px;
    }

    .nova-quiz-nav-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:4px 2px 12px;
      border-bottom:1px solid var(--line);
    }

    .nova-quiz-nav-head > div{
      min-width:0;
    }

    .nova-quiz-nav-head span:first-child{
      display:block;
      color:var(--muted-2);
      font-size:7px;
      font-weight:900;
      letter-spacing:.13em;
    }

    .nova-quiz-nav-head b{
      display:block;
      margin-top:4px;
      color:var(--text);
      font-size:13px;
      font-weight:900;
    }

    .nova-quiz-total{
      display:grid;
      place-items:center;
      width:32px;
      height:32px;
      border-radius:11px;
      color:var(--accent);
      background:rgba(24,183,255,.08);
      border:1px solid rgba(24,183,255,.14);
      font-size:12px;
      font-weight:900;
    }

    .nova-quiz-nav-grid{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:6px;
      padding-top:12px;
      max-height:420px;
      overflow:auto;
    }

    .nova-quiz-nav-button{
      appearance:none;
      width:100%;
      aspect-ratio:1;
      display:grid;
      place-items:center;
      border:1px solid var(--line);
      border-radius:10px;
      background:var(--surface-2);
      color:var(--muted);
      font:inherit;
      font-size:10px;
      font-weight:850;
      cursor:pointer;
      transition:transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
    }

    .nova-quiz-nav-button:hover{
      transform:translateY(-1px);
      color:var(--text);
      border-color:var(--accent);
    }

    .nova-quiz-nav-button.current{
      color:#fff;
      background:var(--accent);
      border-color:var(--accent);
      box-shadow:0 8px 20px rgba(24,183,255,.22);
    }

    .nova-quiz-nav-note{
      display:flex;
      align-items:flex-start;
      gap:7px;
      margin-top:12px;
      padding:10px;
      border:1px solid var(--line);
      border-radius:11px;
      background:var(--surface-2);
      color:var(--muted);
      font-size:7.5px;
      line-height:1.45;
    }

    .nova-quiz-nav-note .icon{
      flex:0 0 auto;
      color:var(--accent);
    }

    .nova-quiz-content{
      overflow:hidden;
    }

    .nova-quiz-html{
      padding:16px;
      min-width:0;
    }

    .nova-quiz-html,
    .nova-quiz-html *{
      box-sizing:border-box;
    }

    .nova-quiz-html form{
      width:100%;
      margin:0;
    }

    .nova-quiz-html .que{
      margin:0 0 13px;
      padding:17px;
      border:1px solid var(--line);
      border-radius:17px;
      background:var(--surface-2);
      box-shadow:0 8px 24px rgba(0,0,0,.05);
    }

    .nova-quiz-html .que:last-child{
      margin-bottom:0;
    }

    .nova-quiz-html .que .info{
      display:flex;
      align-items:center;
      gap:8px;
      margin:0 0 12px;
      padding:0;
      border:0;
      background:transparent;
    }

    .nova-quiz-html .que .qno{
      color:var(--accent);
      font-size:9px;
      font-weight:900;
    }

    .nova-quiz-html .que .qtype{
      margin-left:auto;
      color:var(--muted-2);
      font-size:7px;
      font-weight:800;
    }

    .nova-quiz-html .qtext{
      color:var(--text);
      font-size:15px;
      font-weight:750;
      line-height:1.5;
    }

    .nova-quiz-html .answer{
      display:grid;
      gap:8px;
      margin-top:14px;
    }

    .nova-quiz-html .answer > div,
    .nova-quiz-html .answer > label,
    .nova-quiz-html .answer .r0,
    .nova-quiz-html .answer .r1{
      padding:11px 12px;
      border:1px solid var(--line);
      border-radius:12px;
      background:var(--surface);
      transition:border-color .18s ease, background .18s ease, transform .18s ease;
    }

    .nova-quiz-html .answer > div:hover,
    .nova-quiz-html .answer > label:hover{
      border-color:var(--accent);
      transform:translateY(-1px);
    }

    .nova-quiz-html .answer input[type="radio"],
    .nova-quiz-html .answer input[type="checkbox"]{
      width:18px;
      height:18px;
      margin:0 9px 0 0;
      vertical-align:middle;
      accent-color:var(--accent);
    }

    .nova-quiz-html .answer label{
      color:var(--text);
      font-size:10px;
      line-height:1.45;
      cursor:pointer;
    }

    .nova-quiz-html textarea,
    .nova-quiz-html input[type="text"],
    .nova-quiz-html input[type="number"],
    .nova-quiz-html select{
      width:100%;
      min-height:42px;
      margin-top:8px;
      padding:10px 11px;
      border:1px solid var(--line);
      border-radius:11px;
      background:var(--surface);
      color:var(--text);
      outline:none;
      font:inherit;
    }

    .nova-quiz-html textarea:focus,
    .nova-quiz-html input[type="text"]:focus,
    .nova-quiz-html input[type="number"]:focus,
    .nova-quiz-html select:focus{
      border-color:var(--accent);
      box-shadow:0 0 0 3px rgba(24,183,255,.10);
    }

    .nova-quiz-html .submitbtns,
    .nova-quiz-html .mod_quiz-next-nav,
    .nova-quiz-html .quizattemptnavigation,
    .nova-quiz-html .quiznavigation{
      display:none !important;
    }

    .nova-quiz-controls{
      display:flex;
      align-items:center;
      gap:8px;
      padding:12px 16px 16px;
      border-top:1px solid var(--line);
      background:var(--surface);
    }

    .nova-quiz-control-spacer{
      flex:1;
    }

    .nova-quiz-controls .primary,
    .nova-quiz-controls .secondary{
      min-height:42px;
    }

    @media(max-width:980px){
      .nova-quiz-layout{
        grid-template-columns:1fr;
      }

      .nova-quiz-nav{
        position:static;
      }

      .nova-quiz-nav-grid{
        grid-template-columns:repeat(8,minmax(0,1fr));
        max-height:none;
      }
    }

    @media(max-width:680px){
      .nova-quiz-head{
        grid-template-columns:1fr;
        padding:16px;
        border-radius:17px;
      }

      .nova-quiz-head-state{
        align-items:flex-start;
      }

      .nova-quiz-layout{
        gap:10px;
      }

      .nova-quiz-nav,
      .nova-quiz-content{
        border-radius:16px;
      }

      .nova-quiz-nav{
        padding:11px;
      }

      .nova-quiz-nav-grid{
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:5px;
      }

      .nova-quiz-html{
        padding:10px;
      }

      .nova-quiz-html .que{
        padding:13px;
        border-radius:13px;
      }

      .nova-quiz-html .qtext{
        font-size:13px;
      }

      .nova-quiz-controls{
        flex-wrap:wrap;
        padding:10px;
      }

      .nova-quiz-control{
        flex:1 1 130px;
        justify-content:center;
      }

      .nova-quiz-control-spacer{
        display:none;
      }

      .nova-quiz-head h2{
        font-size:18px;
      }
    }

    body[data-theme="light"] .nova-quiz-head,
    body[data-theme="light"] .nova-quiz-nav,
    body[data-theme="light"] .nova-quiz-content{
      box-shadow:0 14px 38px rgba(38,65,95,.07);
    }

    body[data-theme="light"] .nova-quiz-html .que{
      background:#f8fafc;
    }

    body[data-theme="light"] .nova-quiz-html .answer > div,
    body[data-theme="light"] .nova-quiz-html .answer > label{
      background:#fff;
    }
  `;

  document.head.appendChild(style);
}


/* NOVA 22.0 · STUDY MODE FOUNDATION */

function novaStudyReadSession(){
  const fallback = {
    running:false,
    startedAt:0,
    accumulated:0,
    durationSec:NOVA_STUDY_DURATION_SEC,
    currentKey:'',
    completed:[]
  };

  try{
    const raw =
      localStorage.getItem(
        NOVA_STUDY_STORAGE_KEY
      );

    if(!raw){
      return fallback;
    }

    const parsed =
      JSON.parse(raw);

    return {
      running:Boolean(parsed?.running),
      startedAt:Number(parsed?.startedAt||0),
      accumulated:Math.max(
        0,
        Number(parsed?.accumulated||0)
      ),
      durationSec:
        Number(parsed?.durationSec) > 0
          ? Number(parsed.durationSec)
          : NOVA_STUDY_DURATION_SEC,
      currentKey:String(
        parsed?.currentKey||''
      ),
      completed:
        Array.isArray(parsed?.completed)
          ? parsed.completed
              .filter(Boolean)
              .slice(-50)
          : []
    };
  }catch{
    return fallback;
  }
}

function novaStudyWriteSession(session){
  const safe = {
    running:Boolean(session?.running),
    startedAt:Number(session?.startedAt||0),
    accumulated:Math.max(
      0,
      Number(session?.accumulated||0)
    ),
    durationSec:
      Number(session?.durationSec) > 0
        ? Number(session.durationSec)
        : NOVA_STUDY_DURATION_SEC,
    currentKey:String(
      session?.currentKey||''
    ),
    completed:
      Array.isArray(session?.completed)
        ? session.completed
            .filter(Boolean)
            .slice(-50)
        : []
  };

  localStorage.setItem(
    NOVA_STUDY_STORAGE_KEY,
    JSON.stringify(safe)
  );

  return safe;
}

function novaStudyElapsed(
  session=novaStudyReadSession()
){
  let elapsed =
    Number(session?.accumulated||0);

  if(
    session?.running &&
    Number(session?.startedAt||0)
  ){
    elapsed +=
      Math.max(
        0,
        (
          Date.now() -
          Number(session.startedAt)
        ) / 1000
      );
  }

  return Math.max(
    0,
    Math.min(
      Number(
        session?.durationSec ||
        NOVA_STUDY_DURATION_SEC
      ),
      elapsed
    )
  );
}

function novaStudyFormatTime(seconds){
  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds||0)
      )
    );

  const hours =
    Math.floor(total/3600);

  const minutes =
    Math.floor(
      (total%3600)/60
    );

  const secs =
    total%60;

  return [
    hours
      ? String(hours).padStart(2,'0')
      : String(minutes).padStart(2,'0'),
    String(hours ? minutes : secs).padStart(2,'0'),
    ...(hours
      ? [String(secs).padStart(2,'0')]
      : [])
  ].join(':');
}

function novaStudyNormalizeArray(value){
  if(Array.isArray(value)){
    return value;
  }

  if(Array.isArray(value?.items)){
    return value.items;
  }

  if(Array.isArray(value?.activities)){
    return value.activities;
  }

  if(Array.isArray(value?.results)){
    return value.results;
  }

  return [];
}

function novaStudyRef(item){
  const ref =
    item?.ref ||
    item?.activity?.ref ||
    item?.content?.ref ||
    null;

  if(
    !ref ||
    typeof ref !== 'object'
  ){
    return null;
  }

  if(
    !ref.courseId &&
    !ref.cmid &&
    !ref.instance &&
    !ref.contextId
  ){
    return null;
  }

  return {
    ...ref,
    courseId:
      Number(ref.courseId||0) || null,
    cmid:
      Number(ref.cmid||0) || null,
    instance:
      Number(ref.instance||0) || null,
    contextId:
      Number(ref.contextId||0) || null,
    type:
      ref.type ||
      ref.modname ||
      null
  };
}

function novaStudyTitle(item){
  return String(
    item?.identity?.name ||
    item?.identity?.shortName ||
    item?.name ||
    item?.title ||
    item?.activity?.identity?.name ||
    item?.content?.name ||
    'Учебная активность'
  ).trim();
}

function novaStudyKindLabel(kind){
  return (
    {
      task:'Задание',
      test:'Тест',
      material:'Материал'
    }[kind] ||
    'Активность'
  );
}

function novaStudyCompleted(item){
  const stateValue =
    String(
      item?.state ||
      item?.status ||
      item?.submission?.status ||
      ''
    ).toLowerCase();

  if(
    [
      'completed',
      'complete',
      'submitted',
      'done',
      'finished'
    ].includes(stateValue)
  ){
    return true;
  }

  const completion =
    Number(
      item?.completionstate ??
      item?.completion?.state ??
      0
    );

  return (
    Number.isFinite(completion) &&
    completion > 0
  );
}

function novaStudyCandidatePriority(
  item,
  kind,
  due
){
  let score =
    kind === 'task'
      ? 700
      : kind === 'test'
        ? 650
        : 400;

  if(due){
    const delta =
      Number(due)*1000 -
      Date.now();

    if(delta < 0){
      score += 5000;
    }else if(delta <= 60*60*1000){
      score += 4300;
    }else if(delta <= 24*60*60*1000){
      score += 3300;
    }else if(delta <= 3*24*60*60*1000){
      score += 2200;
    }else{
      score += 700;
    }
  }

  if(
    novaStudyCompleted(item)
  ){
    score -= 1200;
  }

  return score;
}

function novaStudyCandidates(){
  const rows = [];

  const add = (
    kind,
    item,
    index
  )=>{
    const ref =
      novaStudyRef(item);

    if(!ref){
      return;
    }

    const title =
      novaStudyTitle(item);

    const due =
      Number(
        novaDashboardTaskDue(item) ||
        activityDue(item) ||
        0
      );

    const key = [
      kind,
      ref.courseId||0,
      ref.cmid||0,
      ref.instance||0,
      ref.type||'activity',
      item?.id ??
      item?.itemid ??
      index
    ].join(':');

    rows.push({
      key,
      kind,
      title,
      course:
        activityCourseName(item),
      due,
      ref,
      item,
      completed:
        novaStudyCompleted(item),
      priority:
        novaStudyCandidatePriority(
          item,
          kind,
          due
        )
    });
  };

  novaStudyNormalizeArray(
    state.data.tasks
  ).forEach(
    (item,index)=>
      add('task',item,index)
  );

  novaStudyNormalizeArray(
    state.data.tests
  ).forEach(
    (item,index)=>
      add('test',item,index)
  );

  novaStudyNormalizeArray(
    state.data.materials
  ).forEach(
    (item,index)=>
      add('material',item,index)
  );

  const seen = new Set();

  return rows
    .filter(item=>{
      if(seen.has(item.key)){
        return false;
      }

      seen.add(item.key);
      return true;
    })
    .sort((a,b)=>{
      const score =
        Number(b.priority||0) -
        Number(a.priority||0);

      if(score){
        return score;
      }

      if(a.due && b.due){
        return a.due-b.due;
      }

      return a.title.localeCompare(
        b.title,
        'ru'
      );
    })
    .slice(0,30);
}

function novaStudyCurrentCandidate(
  candidates,
  session
){
  if(
    session.currentKey
  ){
    const current =
      candidates.find(
        item =>
          item.key ===
          session.currentKey
      );

    if(current){
      return current;
    }
  }

  const next =
    candidates.find(
      item =>
        !session.completed.includes(
          item.key
        )
    ) ||
    candidates[0] ||
    null;

  if(next){
    session.currentKey =
      next.key;

    novaStudyWriteSession(
      session
    );
  }

  return next;
}

function novaStudyOpenByKey(key){
  const candidate =
    novaStudyCandidates()
      .find(
        item =>
          item.key === key
      );

  if(!candidate){
    toast(
      'Учебная активность больше недоступна.',
      'error'
    );
    return;
  }

  openActivity(
    candidate.ref
  );
}

function novaStudySelect(key){
  const candidate =
    novaStudyCandidates()
      .find(
        item =>
          item.key === key
      );

  if(!candidate){
    return;
  }

  const session =
    novaStudyReadSession();

  session.currentKey =
    candidate.key;

  novaStudyWriteSession(
    session
  );

  render();
  novaStudyEnsureTimer();
}

function novaStudyStart(key=''){
  const candidates =
    novaStudyCandidates();

  const session =
    novaStudyReadSession();

  const candidate =
    candidates.find(
      item =>
        item.key === key
    ) ||
    candidates.find(
      item =>
        !session.completed.includes(
          item.key
        )
    ) ||
    candidates[0];

  if(!candidate){
    toast(
      'Нет доступных учебных активностей.',
      'error'
    );
    return;
  }

  session.currentKey =
    candidate.key;

  if(!session.running){
    session.running = true;
    session.startedAt =
      Date.now();
  }

  novaStudyWriteSession(
    session
  );

  render();
  novaStudyEnsureTimer();
}

function novaStudyPause(){
  const session =
    novaStudyReadSession();

  if(!session.running){
    return;
  }

  session.accumulated =
    novaStudyElapsed(
      session
    );

  session.running = false;
  session.startedAt = 0;

  novaStudyWriteSession(
    session
  );

  novaStudyStopTimer();
  render();

  toast(
    'Учебная сессия поставлена на паузу.',
    'success'
  );
}

function novaStudyCompleteCurrent(){
  const session =
    novaStudyReadSession();

  if(!session.currentKey){
    return;
  }

  if(
    !session.completed.includes(
      session.currentKey
    )
  ){
    session.completed.push(
      session.currentKey
    );
  }

  const next =
    novaStudyCandidates()
      .find(
        item =>
          item.key !==
          session.currentKey &&
          !session.completed.includes(
            item.key
          )
      );

  if(next){
    session.currentKey =
      next.key;
  }

  novaStudyWriteSession(
    session
  );

  render();
  novaStudyEnsureTimer();

  toast(
    'Шаг отмечен как выполненный в Nova.',
    'success'
  );
}

function novaStudyNext(){
  const candidates =
    novaStudyCandidates();

  if(!candidates.length){
    return;
  }

  const session =
    novaStudyReadSession();

  const open =
    candidates.filter(
      item =>
        !session.completed.includes(
          item.key
        )
    );

  const pool =
    open.length
      ? open
      : candidates;

  const currentIndex =
    pool.findIndex(
      item =>
        item.key ===
        session.currentKey
    );

  const next =
    pool[
      (currentIndex+1+pool.length) %
      pool.length
    ];

  if(!next){
    return;
  }

  session.currentKey =
    next.key;

  novaStudyWriteSession(
    session
  );

  render();
  novaStudyEnsureTimer();
}

function novaStudyStopTimer(){
  if(novaStudyTimerHandle){
    clearInterval(
      novaStudyTimerHandle
    );

    novaStudyTimerHandle = null;
  }
}

function novaStudyTick(){
  const session =
    novaStudyReadSession();

  const elapsed =
    novaStudyElapsed(
      session
    );

  const duration =
    Number(
      session.durationSec ||
      NOVA_STUDY_DURATION_SEC
    );

  const remaining =
    Math.max(
      0,
      duration-elapsed
    );

  const timer =
    document.querySelector(
      '#nova-study-timer-value'
    );

  if(timer){
    timer.textContent =
      novaStudyFormatTime(
        remaining
      );
  }

  const bar =
    document.querySelector(
      '#nova-study-progress-bar'
    );

  if(bar){
    bar.style.width =
      `${Math.min(
        100,
        elapsed/duration*100
      )}%`;
  }

  const stateEl =
    document.querySelector(
      '#nova-study-session-state'
    );

  if(stateEl){
    stateEl.textContent =
      session.running
        ? 'ФОКУС ИДЁТ'
        : elapsed > 0
          ? 'ПАУЗА'
          : 'ГОТОВ К СЕССИИ';
  }

  if(
    session.running &&
    elapsed >= duration
  ){
    session.accumulated =
      duration;

    session.running = false;
    session.startedAt = 0;

    novaStudyWriteSession(
      session
    );

    novaStudyStopTimer();

    if(state.route === 'study'){
      render();
    }

    toast(
      '60 минут фокуса завершены.',
      'success'
    );
  }
}

function novaStudyEnsureTimer(){
  const session =
    novaStudyReadSession();

  if(!session.running){
    novaStudyStopTimer();
    return;
  }

  if(!novaStudyTimerHandle){
    novaStudyTimerHandle =
      setInterval(
        novaStudyTick,
        1000
      );
  }

  novaStudyTick();
}


function novaStudyFilterLabel(filter){
  return (
    {
      open:'Незакрытые',
      all:'Все',
      urgent:'Срочные'
    }[filter] ||
    'Незакрытые'
  );
}

function novaStudyFilteredCandidates(
  candidates=novaStudyCandidates()
){
  const filter =
    state.studyFilter || 'open';

  if(filter==='all'){
    return candidates;
  }

  if(filter==='urgent'){
    const now =
      Date.now()/1000;

    return candidates.filter(
      item=>{
        if(item.completed){
          return false;
        }

        if(!item.due){
          return false;
        }

        const distance =
          item.due-now;

        return (
          distance < 0 ||
          distance <=
            3*24*60*60
        );
      }
    );
  }

  return candidates.filter(
    item=>!item.completed
  );
}

function novaStudyDeadlineContext(
  candidate
){

  if(!candidate){
    return null;
  }

  const deadlines =
    typeof novaDeadlineItems === 'function'
      ? novaDeadlineItems()
      : [];

  const ref =
    candidate.ref || {};

  const current =
    deadlines.find(
      item => {

        const activity =
          item.ref || {};

        if(
          Number(activity.courseId || 0) !==
          Number(ref.courseId || 0)
        ){
          return false;
        }

        if(
          Number(activity.cmid || 0) !==
          Number(ref.cmid || 0)
        ){
          return false;
        }

        if(
          Number(activity.instance || 0) !==
          Number(ref.instance || 0)
        ){
          return false;
        }

        return String(
          activity.type || ''
        ) === String(
          ref.type || ''
        );
      }
    );

  if(!current){
    return null;
  }

  return {
    due:current.due,
    bucket:current.bucket,
    bucketLabel:current.bucketLabel,
    why:current.why,
    priority:current.priority,
    completed:current.completed
  };
}

function novaStudyWhy(candidate){
  if(!candidate){
    return 'Nova пока не может определить следующий шаг.';
  }

  if(candidate.completed){
    return 'Campus уже отмечает эту активность завершённой.';
  }

  const due =
    Number(candidate.due||0);

  if(due){
    const now =
      Date.now()/1000;

    const distance =
      due-now;

    if(distance < 0){
      return 'Nova подняла это выше остальных, потому что дедлайн уже прошёл.';
    }

    if(distance <= 60*60){
      return 'Это срочно: до дедлайна меньше часа.';
    }

    if(distance <= 24*60*60){
      return 'Это срочно: дедлайн сегодня.';
    }

    if(distance <= 3*24*60*60){
      return 'Срок близко: Nova поставила активность выше обычных материалов.';
    }
  }

  if(candidate.kind==='test'){
    return 'Nova учитывает тест как приоритетную учебную активность.';
  }

  if(candidate.kind==='task'){
    return 'Nova выбрала незакрытое задание как следующий практический шаг.';
  }

  return 'Это ближайший доступный учебный материал в очереди.';
}

function novaStudySetFilter(filter){
  const value =
    ['open','all','urgent'].includes(
      filter
    )
      ? filter
      : 'open';

  state.studyFilter =
    value;

  localStorage.setItem(
    'nova-study-filter',
    value
  );

  render();
  novaStudyEnsureTimer();
}

function novaStudyReset(){
  const confirmed =
    window.confirm(
      'Сбросить текущую учебную сессию? Это удалит только личный прогресс Study Mode и не изменит данные Campus.'
    );

  if(!confirmed){
    return;
  }

  novaStudyStopTimer();

  localStorage.removeItem(
    NOVA_STUDY_STORAGE_KEY
  );

  render();
  novaStudyEnsureTimer();

  toast(
    'Учебная сессия сброшена.',
    'success'
  );
}

function novaStudyBegin(key=''){
  const candidates =
    novaStudyCandidates();

  const session =
    novaStudyReadSession();

  const candidate =
    candidates.find(
      item=>item.key===key
    ) ||
    candidates.find(
      item=>
        !session.completed.includes(
          item.key
        )
    ) ||
    candidates[0];

  if(!candidate){
    toast(
      'Нет доступной активности для занятия.',
      'error'
    );
    return;
  }

  session.currentKey =
    candidate.key;

  if(!session.running){
    session.running = true;
    session.startedAt =
      Date.now();
  }

  novaStudyWriteSession(
    session
  );

  novaStudyEnsureTimer();

  openActivity(
    candidate.ref
  );
}

function novaStudyQuickStart(ref){
  if(
    !ref ||
    typeof ref !== 'object'
  ){
    toast(
      'Не удалось определить учебную активность.',
      'error'
    );
    return;
  }

  const candidates =
    novaStudyCandidates();

  const candidate =
    candidates.find(
      item=>{
        const a =
          item.ref || {};

        return (
          Number(a.courseId||0) ===
            Number(ref.courseId||0) &&
          Number(a.cmid||0) ===
            Number(ref.cmid||0) &&
          Number(a.instance||0) ===
            Number(ref.instance||0) &&
          String(a.type||'') ===
            String(ref.type||'')
        );
      }
    );

  if(candidate){
    const session =
      novaStudyReadSession();

    session.currentKey =
      candidate.key;

    if(!session.running){
      session.running = true;
      session.startedAt =
        Date.now();
    }

    novaStudyWriteSession(
      session
    );
  }

  openActivity(
    candidate?.ref || ref
  );
}

function bindStudyMode(){

  $$('[data-study-select]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaStudySelect(
            decodeURIComponent(
              el.dataset.studySelect || ''
            )
          );
        }
      );
    }
  );

  $$('[data-study-filter]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaStudySetFilter(
            el.dataset.studyFilter || 'open'
          );
        }
      );
    }
  );

  $$('[data-study-start]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaStudyStart(
            decodeURIComponent(
              el.dataset.studyStart || ''
            )
          );
        }
      );
    }
  );

  $$('[data-study-begin]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaStudyBegin(
            decodeURIComponent(
              el.dataset.studyBegin || ''
            )
          );
        }
      );
    }
  );

  $$('[data-study-quickstart]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          try{
            const raw =
              decodeURIComponent(
                el.dataset.studyQuickstart || ''
              );

            novaStudyQuickStart(
              JSON.parse(raw)
            );
          }catch{
            toast(
              'Не удалось запустить учебную сессию.',
              'error'
            );
          }
        }
      );
    }
  );

  $$('[data-study-open]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaStudyOpenByKey(
            decodeURIComponent(
              el.dataset.studyOpen || ''
            )
          );
        }
      );
    }
  );

  $$('[data-study-complete]').forEach(
    el=>{
      el.addEventListener(
        'click',
        novaStudyCompleteCurrent
      );
    }
  );

  $$('[data-study-next]').forEach(
    el=>{
      el.addEventListener(
        'click',
        novaStudyNext
      );
    }
  );

  $$('[data-study-pause]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          const session =
            novaStudyReadSession();

          if(session.running){
            novaStudyPause();
          }else{
            novaStudyStart(
              session.currentKey
            );
          }
        }
      );
    }
  );

  $$('[data-study-reset]').forEach(
    el=>{
      el.addEventListener(
        'click',
        novaStudyReset
      );
    }
  );

  novaStudyEnsureTimer();
}

function studyPage(){

  if(
    state.status.study ===
    'loading'
  ){
    return `
      <section class="page nova-study-page">

        ${PageHead({
          eyebrow:'УЧЁБА',
          title:'Учебный режим',
          sub:
            'Собираем реальные задания, тесты и материалы из Campus…'
        })}

        ${skeletonGrid(4)}

      </section>
    `;
  }

  if(
    state.status.study ===
    'error'
  ){
    return `
      <section class="page nova-study-page">

        ${PageHead({
          eyebrow:'УЧЁБА',
          title:'Учебный режим',
          sub:
            'Не удалось собрать учебную очередь.'
        })}

        ${statePanel(
          'error',
          'study'
        )}

      </section>
    `;
  }

  const candidates =
    novaStudyCandidates();

  const session =
    novaStudyReadSession();

  const current =
    novaStudyCurrentCandidate(
      candidates,
      session
    );

  const elapsed =
    novaStudyElapsed(
      session
    );

  const duration =
    Number(
      session.durationSec ||
      NOVA_STUDY_DURATION_SEC
    );

  const remaining =
    Math.max(
      0,
      duration-elapsed
    );

  const progress =
    duration
      ? Math.min(
          100,
          elapsed/duration*100
        )
      : 0;

  const currentDue =
    current?.due || 0;

  const currentDueInfo =
    currentDue
      ? novaDashboardDeadlineInfo(
          currentDue
        )
      : {
          tone:'later',
          label:'Срок не указан'
        };

  const currentDeadlineContext =
    novaStudyDeadlineContext(
      current
    );

  const currentType =
    novaStudyKindLabel(
      current?.kind
    );

  const sessionState =
    session.running
      ? 'ФОКУС ИДЁТ'
      : elapsed > 0
        ? 'ПАУЗА'
        : 'ГОТОВ К СТАРТУ';

  const totalOpen =
    candidates.filter(
      item=>!item.completed
    ).length;

  const completedCount =
    candidates.length -
    totalOpen;

  const queue =
    novaStudyFilteredCandidates(
      candidates
    )
      .filter(
        item =>
          item.key !==
          current?.key
      )
      .slice(0,10);

  if(!candidates.length){
    return `
      <section class="page nova-study-page">

        <header class="nova-study-hero">

          <div class="nova-study-hero-copy">

            <span class="nova-study-kicker">
              ${icon('book',13)}
              УЧЁБА · FOCUS
            </span>

            <h1>
              Учебный режим
            </h1>

            <p>
              Nova собирает реальные учебные активности
              и превращает их в понятный следующий шаг.
            </p>

          </div>

          <div class="nova-study-empty-visual">
            ${icon('book',32)}
          </div>

        </header>

        <section class="nova-study-empty">

          <div class="nova-study-empty-icon">
            ${icon('sparkle',22)}
          </div>

          <div>

            <span class="eyebrow">
              ОЧЕРЕДЬ ПУСТА
            </span>

            <h2>
              Сейчас нечего запускать
            </h2>

            <p>
              Когда Nova получит задания, тесты или материалы
              из Campus, они появятся здесь автоматически.
            </p>

          </div>

          <button
            class="primary"
            type="button"
            data-retry="study"
          >
            ${icon('refresh',16)}
            Обновить
          </button>

        </section>

      </section>
    `;
  }

  const mainAction =
    session.running
      ? 'Продолжить работу'
      : elapsed > 0
        ? 'Продолжить занятие'
        : 'Начать занятие';

  return `
    <section class="page nova-study-page">

      <header class="nova-study-hero">

        <div class="nova-study-hero-copy">

          <span class="nova-study-kicker">
            ${icon('book',13)}
            УЧЁБА · FOCUS
          </span>

          <h1>
            Учебный режим
          </h1>

          <p>
            Один экран для одного учебного шага.
            Nova показывает, что делать сейчас,
            почему именно это и что будет дальше.
          </p>

          <div class="nova-study-hero-pills">

            <span>
              ${icon('check-square',13)}
              ${totalOpen} незакрытых
            </span>

            <span>
              ${icon('check',13)}
              ${completedCount} закрыто
            </span>

            <span>
              ${icon('clock',13)}
              Сессия 60 минут
            </span>

          </div>

        </div>

        <div class="nova-study-timer-card">

          <div class="nova-study-timer-head">

            <span id="nova-study-session-state">
              ${sessionState}
            </span>

            <span>
              FOCUS
            </span>

          </div>

          <strong id="nova-study-timer-value">
            ${novaStudyFormatTime(
              remaining
            )}
          </strong>

          <div class="nova-study-progress">
            <i
              id="nova-study-progress-bar"
              style="width:${progress}%"
            ></i>
          </div>

          <small>
            ${
              session.running
                ? 'Таймер продолжает считать во время работы с активностью.'
                : elapsed > 0
                  ? 'Сессия на паузе. Продолжить можно в любой момент.'
                  : 'Таймер пока не запущен.'
            }
          </small>

        </div>

      </header>


      <section class="nova-study-how">

        <div class="nova-study-how-head">

          <span class="eyebrow">
            КАК ЭТО РАБОТАЕТ
          </span>

          <b>
            Три шага
          </b>

        </div>

        <div class="nova-study-how-steps">

          <div class="nova-study-how-step active">

            <span>01</span>

            <div>
              <b>Выбери</b>

              <small>
                Nova уже показала лучший следующий шаг.
              </small>
            </div>

          </div>

          <div class="nova-study-how-arrow">
            ${icon('arrow',15)}
          </div>

          <div class="nova-study-how-step">

            <span>02</span>

            <div>
              <b>Начни занятие</b>

              <small>
                Запустится личный таймер на 60 минут.
              </small>
            </div>

          </div>

          <div class="nova-study-how-arrow">
            ${icon('arrow',15)}
          </div>

          <div class="nova-study-how-step">

            <span>03</span>

            <div>
              <b>Работай</b>

              <small>
                Откроется настоящая активность Campus.
              </small>
            </div>

          </div>

        </div>

      </section>


      <div class="nova-study-layout">

        <section class="nova-study-focus-card">

          <div class="nova-study-focus-step">
            ШАГ 1 · ЧТО ДЕЛАТЬ СЕЙЧАС
          </div>

          <div class="nova-study-section-head">

            <div>

              <span>
                ТЕКУЩАЯ АКТИВНОСТЬ
              </span>

              <h2>
                ${esc(
                  current?.title ||
                  'Учебная активность'
                )}
              </h2>

            </div>

            <span class="nova-study-type-badge">

              ${icon(
                current?.kind === 'test'
                  ? 'quiz'
                  : current?.kind === 'task'
                    ? 'check-square'
                    : 'book',
                14
              )}

              ${esc(
                currentType
              )}

            </span>

          </div>


          <div class="nova-study-focus-meta">

            <span>
              ${icon('grid',14)}
              ${esc(
                current?.course ||
                'Без курса'
              )}
            </span>

            <span
              class="tone-${esc(
                currentDueInfo.tone
              )}"
            >
              ${icon('clock',14)}
              ${esc(
                currentDueInfo.label
              )}
            </span>

            ${
              current?.completed
                ? `
                  <span class="is-complete">
                    ${icon('check',14)}
                    Уже закрыто в Campus
                  </span>
                `
                : ''
            }

          </div>


          <div class="nova-study-why">

            <span class="nova-study-why-icon">
              ${icon('sparkle',15)}
            </span>

            <div>

              <b>
                Почему Nova выбрала это?
              </b>

              <p>
                ${esc(
                  novaStudyWhy(current)
                )}
              </p>

            </div>

          </div>

          ${
            currentDeadlineContext
              ? `
                <div
                  class="
                    nova-study-deadline-intel
                    tone-${esc(
                      currentDeadlineContext.bucket
                    )}
                  "
                >

                  <span
                    class="nova-study-deadline-intel-icon"
                  >
                    ${icon('clock',15)}
                  </span>

                  <div>

                    <b>
                      Дедлайн
                    </b>

                    <strong>
                      ${esc(
                        currentDeadlineContext.bucketLabel
                      )}
                    </strong>

                    <small>
                      ${esc(
                        currentDeadlineContext.why
                      )}
                    </small>

                  </div>

                </div>
              `
              : ''
          }


          <div class="nova-study-focus-actions">

            <button
              class="primary nova-study-main-action"
              type="button"
              data-study-begin="${esc(
                encodeURIComponent(
                  current?.key || ''
                )
              )}"
            >
              ${icon(
                session.running
                  ? 'arrow'
                  : 'play',
                17
              )}

              ${mainAction}

            </button>

            <button
              class="secondary"
              type="button"
              data-study-open="${esc(
                encodeURIComponent(
                  current?.key || ''
                )
              )}"
            >
              ${icon('arrow',16)}
              Открыть без таймера
            </button>

            <button
              class="secondary"
              type="button"
              data-study-pause
            >
              ${icon(
                session.running
                  ? 'pause'
                  : 'play',
                16
              )}

              ${
                session.running
                  ? 'Пауза'
                  : elapsed > 0
                    ? 'Продолжить'
                    : 'Таймер'
              }

            </button>

          </div>


          <div class="nova-study-campus-note">

            <span>
              ${icon('info',14)}
            </span>

            <div>

              <b>
                Что меняет Study Mode?
              </b>

              <p>
                Только твою личную учебную сессию.
                Оценки, дедлайны и статусы Campus
                меняются только настоящими действиями
                внутри самого Campus.
              </p>

            </div>

          </div>

        </section>


        <aside class="nova-study-session-card">

          <div class="nova-study-section-head compact">

            <div>

              <span>
                ШАГ 2 · ТВОЯ СЕССИЯ
              </span>

              <h3>
                ${sessionState}
              </h3>

            </div>

            <span
              class="nova-study-session-dot ${
                session.running
                  ? 'running'
                  : ''
              }"
            ></span>

          </div>


          <div class="nova-study-session-explain">

            ${
              session.running
                ? `
                  <b>Фокус уже идёт.</b>

                  <span>
                    Открой текущую активность слева
                    и работай. Таймер продолжит считать.
                  </span>
                `
                : elapsed > 0
                  ? `
                    <b>Сессия на паузе.</b>

                    <span>
                      Вернись к работе кнопкой «Продолжить».
                    </span>
                  `
                  : `
                    <b>Сессия ещё не началась.</b>

                    <span>
                      Нажми «Начать занятие», чтобы запустить
                      60-минутный таймер.
                    </span>
                  `
            }

          </div>


          <div class="nova-study-session-numbers">

            <div>

              <strong>
                ${session.completed.length}
              </strong>

              <small>
                шагов отмечено
              </small>

            </div>

            <div>

              <strong>
                ${Math.round(progress)}%
              </strong>

              <small>
                сессии прошло
              </small>

            </div>

          </div>


          <button
            class="secondary nova-study-full-button"
            type="button"
            data-study-complete
          >
            ${icon('check',16)}
            Завершил этот шаг
          </button>


          <button
            class="secondary nova-study-full-button"
            type="button"
            data-study-next
          >
            ${icon('next',16)}
            Следующий шаг
          </button>


          <button
            class="ghost nova-study-full-button"
            type="button"
            data-study-reset
          >
            ${icon('refresh',15)}
            Сбросить мою сессию
          </button>

        </aside>

      </div>


      <section class="nova-study-queue">

        <div class="nova-study-section-head">

          <div>

            <span>
              ШАГ 3 · ЧТО ДАЛЬШЕ
            </span>

            <h2>
              Учебная очередь
            </h2>

          </div>

          <small>
            Nova сортирует по срокам и статусам
          </small>

        </div>


        <div class="nova-study-filters">

          ${
            ['open','urgent','all']
              .map(
                filter=>`
                  <button
                    type="button"
                    class="nova-study-filter ${
                      (state.studyFilter||'open')===
                        filter
                        ? 'active'
                        : ''
                    }"
                    data-study-filter="${filter}"
                  >

                    ${esc(
                      novaStudyFilterLabel(
                        filter
                      )
                    )}

                    <span>
                      ${
                        filter==='open'
                          ? totalOpen
                          : filter==='all'
                            ? candidates.length
                            : candidates.filter(
                                item=>{
                                  if(
                                    item.completed ||
                                    !item.due
                                  ){
                                    return false;
                                  }

                                  const d =
                                    item.due -
                                    Date.now()/1000;

                                  return (
                                    d < 0 ||
                                    d <=
                                      3*24*60*60
                                  );
                                }
                              ).length
                      }
                    </span>

                  </button>
                `
              )
              .join('')
          }

        </div>


        <div class="nova-study-queue-list">

          ${
            queue.length
              ? queue.map(
                  (item,index)=>`
                    <article
                      class="
                        nova-study-queue-item
                        ${
                          item.completed
                            ? 'completed'
                            : ''
                        }
                      "
                    >

                      <button
                        class="nova-study-queue-main"
                        type="button"
                        data-study-select="${esc(
                          encodeURIComponent(
                            item.key
                          )
                        )}"
                      >

                        <span class="nova-study-queue-index">
                          ${String(
                            index+1
                          ).padStart(2,'0')}
                        </span>


                        <span class="nova-study-queue-copy">

                          <span class="nova-study-queue-status">

                            ${
                              item.completed
                                ? 'ЗАКРЫТО'
                                : item.due
                                  ? novaDashboardDeadlineInfo(
                                      item.due
                                    ).label.toUpperCase()
                                  : 'БЕЗ СРОКА'
                            }

                          </span>

                          <b>
                            ${esc(
                              item.title
                            )}
                          </b>

                          <small>
                            ${esc(
                              item.course
                            )}
                            ·
                            ${esc(
                              novaStudyKindLabel(
                                item.kind
                              )
                            )}
                          </small>

                        </span>

                      </button>


                      <button
                        class="nova-study-queue-open"
                        type="button"
                        data-study-open="${esc(
                          encodeURIComponent(
                            item.key
                          )
                        )}"
                        title="Открыть без запуска таймера"
                      >
                        ${icon('arrow',15)}
                      </button>

                    </article>
                  `
                ).join('')
              : `
                <div class="nova-study-queue-empty">

                  <span>
                    ${icon('check',17)}
                  </span>

                  <div>

                    <b>
                      ${
                        state.studyFilter === 'urgent'
                          ? 'Срочных активностей нет'
                          : state.studyFilter === 'open'
                            ? 'Все незакрытые активности закончились'
                            : 'В очереди больше ничего нет'
                      }
                    </b>

                    <small>
                      ${
                        state.studyFilter === 'urgent'
                          ? 'Переключись на «Все» или продолжи текущую активность.'
                          : state.studyFilter === 'open'
                            ? 'Переключись на «Все», чтобы увидеть закрытые шаги.'
                            : 'Campus пока не передал дополнительные активности.'
                      }
                    </small>

                  </div>

                </div>
              `
          }

        </div>

      </section>

    </section>
  `;
}

async function loadStudyData(
  force=false,
  epoch=state.routeEpoch
){
  if(
    !state.connected ||
    state.demo ||
    state.route !== 'study'
  ){
    return;
  }

  const seq =
    (state.requests.study||0)+1;

  state.requests.study =
    seq;

  state.status.study =
    'loading';

  state.errors.study =
    null;

  render();

  await Promise.allSettled([
    loadData(
      'courses',
      force,
      epoch
    ),
    loadData(
      'tasks',
      force,
      epoch
    ),
    loadData(
      'tests',
      force,
      epoch
    ),
    loadData(
      'materials',
      force,
      epoch
    )
  ]);

  if(
    epoch!==state.routeEpoch ||
    state.requests.study!==seq ||
    state.route!=='study'
  ){
    return;
  }

  state.status.study =
    'success';

  render();
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

    const assignmentStatus =
      String(
        result?.submission?.status ||
        'unknown'
      ).toLowerCase();

    const assignmentCanEdit =
      result?.submission?.canEdit === true;

    let assignmentAction = 'edit';
    let assignmentButton = 'Добавить ответ';
    let assignmentTitle = 'Готовы отправить работу?';
    let assignmentText =
      'Добавьте свои файлы и отправьте их преподавателю прямо из Nova.';

    if(assignmentStatus === 'draft'){
      assignmentButton = 'Продолжить редактирование';
      assignmentTitle = 'Продолжить работу?';
      assignmentText =
        'В Campus уже сохранён черновик. Можно продолжить редактирование и отправить его.';
    }

    if(
      assignmentStatus === 'submitted' &&
      assignmentCanEdit
    ){
      assignmentButton = 'Изменить ответ';
      assignmentTitle = 'Ответ уже отправлен';
      assignmentText =
        'Работа отправлена в Campus. При необходимости можно открыть её и внести изменения.';
    }

    const canShowAssignmentAction =
      assignmentStatus !== 'submitted' ||
      assignmentCanEdit;

    body = `
      ${assignmentSourceMarkup(a, result)}

      ${
        canShowAssignmentAction
          ? `
            <section class="nova-bottom-cta">

              <div>
                <span class="eyebrow">СДАЧА</span>

                <h2>
                  ${assignmentTitle}
                </h2>

                <p>
                  ${assignmentText}
                </p>
              </div>

              <button
                class="primary"
                type="button"
                data-activity-action="${assignmentAction}"
              >
                ${icon(
                  assignmentStatus === 'submitted'
                    ? 'edit'
                    : 'upload',
                  17
                )}
                ${assignmentButton}
              </button>

            </section>
          `
          : ''
      }
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


  else if(
    kind === 'resource' ||
    kind === 'file'
  ){

    const material =
      detectLearningMaterial(
        a,
        result,
        title
      );

    const files =
      collectActivityFiles(
        a,
        result
      );

    const primaryFile =
      files[0] || null;

    body = `
      <section
        class="nova-learning-material nova-learning-${esc(material.tone)}"
      >

        <div class="nova-learning-top">

          <div class="nova-learning-type">

            <span class="nova-learning-type-icon">
              ${icon(material.icon,22)}
            </span>

            <span>
              <b>
                ${esc(material.shortLabel)}
              </b>

              <small>
                Учебный материал
              </small>
            </span>

          </div>

          ${
            files.length
              ? `
                <span class="nova-learning-count">
                  ${files.length}
                  ${files.length === 1 ? 'файл' : 'файлов'}
                </span>
              `
              : ''
          }

        </div>

        <div class="nova-learning-copy">

          <h2>
            ${esc(title)}
          </h2>

          <p>
            ${esc(
              learningMaterialDescription(
                material,
                files
              )
            )}
          </p>

        </div>

        ${
          primaryFile
            ? learningFilesMarkup(
                files,
                material
              )
            : `
              <div class="nova-learning-empty">
                <span>
                  ${icon('info',16)}
                </span>
                <p>
                  У этой активности пока нет
                  доступного файла для скачивания.
                </p>
              </div>
            `
        }

      </section>

      ${
        /*
         * Когда у материала уже есть реальный Campus-файл,
         * не показываем ниже сырой Moodle HTML с дублями
         * названия, "Назад", "Далее" и ссылкой на тот же файл.
         *
         * Если файла нет, HTML остаётся видимым, потому что
         * в таком ресурсе контент может быть самой лекцией.
         */
        !files.length && result.html
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

    const startForm =
      result?.access?.startForm ||
      null;

    const continueAttempt =
      result?.access?.continueAttempt ||
      null;

    const canContinue =
      Boolean(
        continueAttempt?.path
      );

    const canStart =
      Boolean(
        startForm?.action &&
        /startattempt\.php/i.test(
          String(startForm.action)
        )
      ) &&
      !canContinue;

    body = `
      <section class="nova-quiz-intro nova-quiz-launch-card">

        <div class="nova-quiz-launch-icon">
          ${icon('quiz',26)}
        </div>

        <div class="nova-quiz-launch-copy">

          <span class="eyebrow">
            ТЕСТ
          </span>

          <h2>
            ${esc(title)}
          </h2>

          <p>
            ${
              canContinue
                ? 'У тебя есть незавершённая попытка. Можно продолжить её с сохранёнными ответами.'
                : canStart
                ? 'Тест готов к прохождению. После запуска откроется настоящая попытка Campus.'
                : 'Campus сейчас не разрешает открыть попытку этого теста.'
            }
          </p>

          <div class="nova-quiz-meta">

            <span>
              ${icon('quiz',13)}
              <b>Формат</b>
              Тест
            </span>

            <span class="${
              canContinue || canStart
                ? 'available'
                : 'unavailable'
            }">

              ${icon(
                canContinue || canStart
                  ? 'check'
                  : 'close',
                13
              )}

              <b>Статус</b>

              ${
                canContinue
                  ? 'Есть незавершённая попытка'
                  : canStart
                  ? 'Доступен'
                  : 'Недоступен'
              }

            </span>

          </div>

        </div>

        ${
          canContinue
            ? `
              <button
                class="primary nova-quiz-start"
                id="quiz-continue-button"
                data-quiz-path="${esc(continueAttempt.path)}"
                type="button"
              >
                ${icon('play',16)}
                Продолжить тест
              </button>
            `
            : canStart
            ? `
              <button
                class="primary nova-quiz-start"
                id="quiz-start-button"
                type="button"
              >
                ${icon('play',16)}
                Начать тест
              </button>
            `
            : `
              <div class="nova-quiz-unavailable">

                <span class="nova-quiz-unavailable-icon">
                  ${icon('close',15)}
                </span>

                <div>
                  <b>Тест пока недоступен</b>
                  <small>
                    Доступ определяется Campus.
                  </small>
                </div>

              </div>
            `
        }

      </section>
    `;
  }


  else if(kind === 'quiz-action'){

    body = quizAttemptMarkup(
      result,
      title
    );
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
    case 'search':body=searchPage();break;
    case 'study':body=studyPage();break;
    case 'notifications':body=notificationsPage();break;
    case 'deadlines':body=deadlinePage();break;
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

function novaBindAnchorNavigation(){
  if(
    document.documentElement.dataset.novaAnchorNavigation === '1'
  ){
    return;
  }

  document.documentElement.dataset.novaAnchorNavigation = '1';

  document.addEventListener('click', event=>{
    const anchor =
      event.target?.closest?.('a[data-go]');

    if(!anchor) return;

    if(event.defaultPrevented) return;

    if(
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ){
      return;
    }

    const route =
      anchor.dataset.go || '';

    const param =
      anchor.dataset.param || '';

    const href =
      anchor.getAttribute('href') || '/';

    if(!route) return;

    event.preventDefault();

    try{
      navigate(
        route === 'course'
          ? 'course'
          : route,
        param
      );
    }catch(error){
      console.error(
        '[Nova][Navigation]',
        {
          route,
          param,
          error
        }
      );

      window.location.assign(href);
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
  $$('[data-retry]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.retry==='course'||el.dataset.retry==='notifications'||el.dataset.retry==='deadlines')return loadRouteData(true); if(el.dataset.retry==='activity')return loadActivity(true); loadData(el.dataset.retry,true)}));

  $$('[data-deadline-open]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaDeadlineOpen(
            el.dataset.deadlineOpen || ''
          );
        }
      );
    }
  );

  $$('[data-deadline-filter]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaDeadlineSetFilter(
            el.dataset.deadlineFilter ||
            'active'
          );
        }
      );
    }
  );

  $$('[data-deadline-open]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaDeadlineOpen(
            el.dataset.deadlineOpen ||
            ''
          );
        }
      );
    }
  );

  $$('[data-notification-filter]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaNotificationSetFilter(
            el.dataset.notificationFilter || 'all'
          );
        }
      );
    }
  );

  $$('[data-notification-read]').forEach(
    el=>{
      el.addEventListener(
        'click',
        event=>{
          event.stopPropagation();

          novaNotificationMarkRead(
            el.dataset.notificationRead || ''
          );
        }
      );
    }
  );

  $$('[data-notification-open]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          const item =
            novaNotificationItems()
              .find(
                row =>
                  row.id ===
                  el.dataset.notificationOpen
              );

          novaNotificationOpen(item);
        }
      );
    }
  );

  $('#notifications-mark-all')?.addEventListener(
    'click',
    novaNotificationMarkAllRead
  );

  $$('[data-activity]').forEach(el=>el.addEventListener('click',e=>{ if(e.target.closest('[data-download]')) return; const raw=el.dataset.activity; if(raw) { try { openActivity(JSON.parse(decodeURIComponent(raw))); } catch {} } }));
  $$('[data-study-quickstart]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          try{
            const raw =
              decodeURIComponent(
                el.dataset.studyQuickstart || ''
              );

            novaStudyQuickStart(
              JSON.parse(raw)
            );
          }catch{
            toast(
              'Не удалось запустить учебную сессию.',
              'error'
            );
          }
        }
      );
    }
  );
  $$('[data-activity-action]').forEach(el=>el.addEventListener('click',()=>executeActivityAction(el.dataset.activityAction)));

  /*
   * Schedule import / clear actions.
   *
   * These buttons are rendered dynamically by schedulePage(),
   * therefore bind() must explicitly attach handlers after render.
   */
  $$('[data-schedule-action="import"]').forEach(el=>{
    if(el.dataset.novaScheduleBound === '1'){
      return;
    }

    el.dataset.novaScheduleBound = '1';

    el.addEventListener(
      'click',
      ()=>{
        if(el.disabled) return;
        openScheduleImport();
      }
    );
  });

  $$('[data-schedule-action="clear"]').forEach(el=>{
    if(el.dataset.novaScheduleBound === '1'){
      return;
    }

    el.dataset.novaScheduleBound = '1';

    el.addEventListener(
      'click',
      ()=>{
        if(el.disabled) return;

        const confirmed = window.confirm(
          'Удалить сохранённое расписание?'
        );

        if(!confirmed){
          return;
        }

        clearImportedSchedule();

        state.status.schedule =
          'success';

        render();

        toast(
          'Расписание удалено.',
          'success'
        );
      }
    );
  });

  bindStudyMode();
  bindQuizStart();
  bindQuizContinue();
  $$('[data-view]').forEach(el=>el.addEventListener('click',e=>{if(el.hasAttribute('data-activity'))return;if(e.target.closest('[data-download]'))return;const p=el.dataset.view;if(p)openCampusPath(p)}));
  $$('[data-download-smart]').forEach(el=>{
    if(el.dataset.novaDownloadBound === '1'){
      return;
    }

    el.dataset.novaDownloadBound = '1';

    el.addEventListener(
      'click',
      async()=>{
        const path =
          el.dataset.downloadSmart ||
          '';

        const filename =
          el.dataset.downloadFilename ||
          '';

        if(
          !path ||
          el.disabled
        ){
          return;
        }

        const original =
          el.innerHTML;

        el.disabled = true;
        el.classList.add(
          'is-loading'
        );

        el.innerHTML =
          `${icon('download',15)}
           <span>Скачиваем…</span>`;

        try{
          await downloadCampusSmart(
            path,
            filename
          );
        }finally{
          if(
            document.body.contains(
              el
            )
          ){
            el.disabled = false;
            el.classList.remove(
              'is-loading'
            );
            el.innerHTML =
              original;
          }
        }
      }
    );
  });

  $$('[data-download]').forEach(el=>{
    if(el.dataset.novaDownloadBound === '1'){
      return;
    }

    el.dataset.novaDownloadBound = '1';

    el.addEventListener(
      'click',
      async()=>{
        const path =
          el.dataset.download ||
          '';

        const filename =
          el.dataset.downloadFilename ||
          '';

        if(
          !path ||
          el.disabled
        ){
          return;
        }

        const original =
          el.innerHTML;

        el.disabled = true;
        el.classList.add(
          'is-loading'
        );

        el.innerHTML =
          `${icon('download',15)}
           <span>Скачиваем…</span>`;

        try{
          await downloadCampus(
            path,
            filename
          );
        }finally{
          if(
            document.body.contains(
              el
            )
          ){
            el.disabled = false;
            el.classList.remove(
              'is-loading'
            );
            el.innerHTML =
              original;
          }
        }
      }
    );
  });
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
  $('#expand-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=true));$('#collapse-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=false));$$('[data-course-action="expand"]').forEach(el=>el.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=true)));

  $$('[data-course-filter]').forEach(el=>{
    el.addEventListener(
      'click',
      ()=>{
        const filter=
          el.dataset.courseFilter||
          'all';

        state.courseFilter=
          filter;

        const buttons=
          $$('[data-course-filter]');

        buttons.forEach(button=>{
          const active=
            button.dataset.courseFilter===
            filter;

          button.classList.toggle(
            'active',
            active
          );

          button.setAttribute(
            'aria-selected',
            active
              ? 'true'
              : 'false'
          );
        });

        $$('.nova-course-section').forEach(section=>{
          const activities=
            $$('[data-course-activity]',section);

          let visible=0;

          activities.forEach(item=>{
            const show=
              filter==='all'||
              item.dataset.courseKind===
                filter;

            item.hidden=!show;

            if(show){
              visible++;
            }
          });

          section.hidden=
            filter!=='all' &&
            visible===0;
        });
      }
    );
  });
  $('#cards-mode')?.addEventListener('click',()=>{state.courseView='cards';localStorage.setItem('nova-course-view','cards');render()});$('#list-mode')?.addEventListener('click',()=>{state.courseView='list';localStorage.setItem('nova-course-view','list');render()});
  $('#logout')?.addEventListener('click',confirmNovaLogout);$('#notifications')?.addEventListener('click',()=>navigate('notifications'));
  const s=$('#global-search');

  if(s){

    s.addEventListener(
      'focus',
      ()=>{
        updateNovaSearchPopover();
        novaEnsureGlobalSearchData();
      }
    );

    s.addEventListener(
      'input',
      ()=>{
        state.search=
          s.value;

        updateNovaSearchPopover();

        if(
          state.search.trim()
        ){
          novaEnsureGlobalSearchData();
        }
      }
    );

    s.addEventListener(
      'keydown',
      e=>{

        if(
          e.key==='Escape'
        ){

          const popover=
            document.querySelector(
              '#nova-search-popover'
            );

          state.search='';
          s.value='';

          popover?.classList.remove(
            'open'
          );

          s.blur();

          return;
        }

        if(
          e.key==='Enter' &&
          state.search.trim()
        ){

          state.search=
            s.value.trim();

          novaSearchRemember(
            state.search
          );

          navigate(
            'search'
          );

        }

      }
    );

  }

  if(
    !window.__novaSearchShortcutBound
  ){

    window.__novaSearchShortcutBound=
      true;

    document.addEventListener(
      'keydown',
      event=>{

        if(
          (event.ctrlKey||event.metaKey) &&
          String(event.key).toLowerCase()==='k'
        ){

          event.preventDefault();

          const input=
            document.querySelector(
              '#global-search'
            );

          if(input){

            input.focus();
            input.select();

            updateNovaSearchPopover();

            novaEnsureGlobalSearchData();
          }

        }

      }
    );

  }

  if(
    !window.__novaSearchOutsideBound
  ){

    window.__novaSearchOutsideBound=
      true;

    document.addEventListener(
      'click',
      event=>{

        if(
          event.target.closest(
            '.nova-global-search-wrap'
          )
        ){
          return;
        }

        document
          .querySelector(
            '#nova-search-popover'
          )
          ?.classList.remove('open');

      }
    );

  }



  $$('[data-search-recent]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          const query =
            el.dataset.searchRecent || '';

          if(!query){
            return;
          }

          state.search = query;

          const input =
            $('#global-search');

          if(input){
            input.value = query;
          }

          navigate('search');
        }
      );
    }
  );

$$('[data-search-filter]').forEach(
    el=>{
      el.addEventListener(
        'click',
        ()=>{
          novaSearchSetFilter(
            el.dataset.searchFilter || 'all'
          );
        }
      );
    }
  );

  $('#nova-search-clear-recent')?.addEventListener(
    'click',
    novaSearchClearRecent
  );

  $('#global-search-submit')?.addEventListener(
    'click',
    ()=>{
      const input=
        $('#global-search');

      const query=
        input?.value?.trim()||
        '';

      if(!query){
        input?.focus();
        return;
      }

      state.search=query;

      novaSearchRemember(
        query
      );

      navigate(
        'search'
      );
    }
  );

  $('#nova-search-clear')?.addEventListener(
    'click',
    novaSearchReset
  );

  /*
   * Nova 24 canonical reset binding.
   *
   * The selector is intentionally optional so older
   * layouts using #nova-search-clear remain valid.
   */
  $('#nova-search-reset')?.addEventListener(
    'click',
    novaSearchReset
  );

  $$('[data-search-reset-filter]').forEach(
    el=>{

      if(
        el.id ===
        'nova-search-clear'
      ){
        return;
      }

      if(
        el.dataset.novaSearchResetBound ===
        '1'
      ){
        return;
      }

      el.dataset.novaSearchResetBound =
        '1';

      el.addEventListener(
        'click',
        novaSearchReset
      );

    }
  );

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

  state.status.dashboard='success';
  state.errors.dashboard=null;

  render();

  await Promise.allSettled([
    loadData('courses',false,epoch),
    loadData('calendar',false,epoch),
    loadData('grades',false,epoch),
    loadData('tasks',false,epoch),
    loadData('messages',false,epoch),
    loadData('files',false,epoch),
    loadData('tests',false,epoch),
    loadData('materials',false,epoch)
  ]);

  if(
    epoch!==state.routeEpoch||
    state.route!=='dashboard'
  ){
    return;
  }

  /*
   * Commit only after the complete dashboard sync.
   * This prevents intermediate renders from being
   * mistaken for a full Campus snapshot.
   */
  novaGlobalUpdateCommit();

  render();
}
async function loadRouteData(force=false,epoch=state.routeEpoch){
  const r=state.route;if(!state.connected||state.demo)return;
  if(r==='dashboard')return loadDashboard(epoch);
  if(r==='study')return loadStudyData(force,epoch);
  if(r==='notifications')return loadNotificationsData(force,epoch);
  if(r==='deadlines')return loadDeadlinesData(force,epoch);
  if(r==='search')return loadSearchData(epoch);
  if(r==='courses')return loadData('courses',force,epoch);
  if(r==='course')return loadCourse(force,epoch);
  if(r==='grades')return loadData('grades',force,epoch);
  if(r==='tasks')return loadData('tasks',force,epoch);
  if(r==='calendar')return loadData('calendar',force,epoch);
  if(r==='schedule'){
    state.status.schedule='success';
    return;
  }
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
async function loadActivity(
  force=false,
  epoch=state.routeEpoch,
  throwOnError=false
){
  const seq=(state.requests.activity||0)+1;state.requests.activity=seq;state.status.activity='loading';state.errors.activity=null;state.data.activity=null;render();
  try{const ref=decodeActivityRef(state.param);const q=new URLSearchParams(ref);q.set('action','open');if(force)q.set('refresh','1');const d=await api(`/api/activity?${q}`);if(epoch!==state.routeEpoch||state.requests.activity!==seq||state.route!=='activity')return;if(d.fallback){state.data.activity=d;state.status.activity='success';render();$('#open-activity-fallback')?.addEventListener('click',()=>openCampusPath(d.fallback.url));return;}state.data.activity=d;state.status.activity='success';render();bindCampusContent();}
  catch(e){
    if(state.requests.activity!==seq||!state.connected){
      if(throwOnError) throw e;
      return;
    }

    if(epoch!==state.routeEpoch||state.route!=='activity'){
      if(throwOnError) throw e;
      return;
    }

    state.errors.activity=e.message;
    state.status.activity='error';
    render();

    if(throwOnError){
      throw e;
    }
  }
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
    const d=await api('/api/activity/action',{
      method:'POST',
      body:JSON.stringify({
        ref:current.ref,
        action,
        payload:{values}
      })
    });

    const confirmed=d.result?.confirmed;

    if(confirmed===false){
      toast(
        action==='submit'
          ? 'Campus не подтвердил отправку ответа.'
          : action==='start'
            ? 'Campus не подтвердил запуск попытки.'
            : 'Campus не подтвердил изменение.',
        'error'
      );
      return;
    }

    /*
     * Save/submit must be followed by a fresh assignment.view.
     * Campus is the source of truth for status, deadline and
     * submitted files.
     */
    if(action==='save' || action==='submit'){
      await loadActivity(
        true,
        state.routeEpoch,
        true
      );

      if(action==='submit'){
        toast('Ответ отправлен.','success');
      }else{
        toast('Ответ сохранён.','success');
      }

      return;
    }

    state.data.activity={
      activity:d.activity,
      result:d.result
    };
    state.status.activity='success';
    state.errors.activity=null;

    render();
    bindCampusContent();

    if(action==='start'){
      toast('Попытка теста запущена.','success');
    }else if(action==='download'){
      toast('Файл скачан.','success');
    }else{
      toast('Действие выполнено.','success');
    }

  }catch(e){
    toast(
      e.message || 'Не удалось выполнить действие.',
      'error'
    );
  }
}
function selectDay(value){const [y,m,d]=value.split('-').map(Number);state.year=y;state.month=m;state.selectedDay=d;render();loadData('calendar',true)}
function changeMonth(delta){let m=state.month+delta,y=state.year;if(m<1){m=12;y--}if(m>12){m=1;y++}state.year=y;state.month=m;const days=new Date(y,m,0).getDate();state.selectedDay=Math.min(state.selectedDay,days);render();loadData('calendar',true)}
function normalizePath(p){let x=String(p||'');if(/^https?:\/\//i.test(x)){try{const u=new URL(x);if(!campusOrigin()||u.origin!==campusOrigin())return null;x=u.pathname+u.search+u.hash}catch{return null}}if(x.startsWith('/campus/'))x=x.slice(7);if(!x.startsWith('/'))x='/'+x;return x}
function isFile(p){return /\/(?:pluginfile|tokenpluginfile|webservice\/pluginfile|draftfile)\.php(?:\/|$)/i.test(p)||/\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(p)}
function openCampusPath(p){const x=normalizePath(p);if(!x){window.open(p,'_blank','noopener,noreferrer');return}if(isFile(x)){downloadCampus(x);return}if(x.startsWith('/course/view.php')){const id=new URL(x,campusOrigin()||location.origin).searchParams.get('id');if(id)return navigate('course',id)}if(x.startsWith('/login/index.php')){toast('Сессия Campus закончилась','error');return navigate('profile')}navigate('view',x)}
async function downloadCampusSmart(
  path,
  filename = ''
){
  const normalized =
    normalizePath(
      path
    );

  if(!normalized){
    toast(
      'Файл недоступен.',
      'error'
    );
    return;
  }

  /*
   * Direct pluginfile/document URL.
   */
  if(isFile(normalized)){
    return downloadCampus(
      normalized,
      filename
    );
  }

  try{

    const response =
      await api(
        `/api/page?path=${encodeURIComponent(normalized)}`
      );

    const page =
      response?.page || null;

    if(!page){
      throw new Error(
        'Campus не вернул страницу материала.'
      );
    }

    /*
     * API already resolved it as a binary file.
     */
    if(
      page.kind === 'file' &&
      page.path
    ){
      return downloadCampus(
        page.path,
        filename ||
        page.filename ||
        ''
      );
    }

    /*
     * Search the resource page for the real
     * pluginfile/document URL.
     */
    const nested =
      extractActivityFilesFromHtml(
        page.html || ''
      );

    const direct =
      nested.find(
        file =>
          file?.fileurl &&
          isFile(
            file.fileurl
          )
      );

    if(direct){
      return downloadCampus(
        direct.fileurl,
        filename ||
        direct.filename ||
        ''
      );
    }

    /*
     * Last chance: a raw href whose anchor text
     * itself contains a known document name.
     */
    const doc =
      new DOMParser()
        .parseFromString(
          String(
            page.html || ''
          ),
          'text/html'
        );

    for(
      const link of doc.querySelectorAll(
        'a[href]'
      )
    ){

      const href =
        normalizePath(
          link.getAttribute(
            'href'
          ) || ''
        );

      const anchorName =
        text(
          link.textContent || ''
        );

      if(
        href &&
        isFile(href)
      ){
        return downloadCampus(
          href,
          filename ||
          anchorName ||
          ''
        );
      }
    }

    throw new Error(
      'Campus не показал прямую ссылку на файл.'
    );

  }catch(error){

    toast(
      error?.message ||
      'Не удалось скачать файл.',
      'error'
    );
  }
}

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
    state.data.activity?.result?.kind==='quiz-action'
  ){
    const quizRoot=$('#campus-content');

    if(quizRoot){
      $$('[data-quiz-path]',quizRoot).forEach(el=>{
        if(el.dataset.novaBound) return;
        el.dataset.novaBound='1';

        el.addEventListener(
          'click',
          ()=>{
            if(el.disabled) return;
            loadNovaQuizPage(
              el.dataset.quizPath || ''
            );
          }
        );
      });

      $$('[data-quiz-control]',quizRoot).forEach(el=>{
        if(el.dataset.novaBound) return;
        el.dataset.novaBound='1';

        el.addEventListener(
          'click',
          ()=>{
            if(el.disabled) return;
            submitNovaQuizControl(
              el.dataset.quizControl
            );
          }
        );
      });
    }
  }

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
  if(!id) return;

  state.selectedConversation = id;
  render();

  const view = $('#conversation-view');
  if(!view) return;

  const seq = (state.requests.conversation || 0) + 1;
  state.requests.conversation = seq;

  try{
    const d = await api(
      `/api/messages/conversation?id=${encodeURIComponent(id)}`
    );

    if(
      state.requests.conversation !== seq ||
      state.route !== 'messages' ||
      String(state.selectedConversation) !== String(id)
    ){
      return;
    }

    view.innerHTML = conversationMarkup(d.conversation);
    bindMessageForm();

    const body = $('#conversation-body');
    if(body){
      body.scrollTop = body.scrollHeight;
    }

    void api(
      '/api/messages/mark-read',
      {
        method:'POST',
        body:JSON.stringify({
          conversationId:id
        })
      }
    ).catch(()=>{});

  }catch(e){
    if(state.requests.conversation !== seq) return;

    view.innerHTML =
      statePanel('error','messages',false);
  }
}

function conversationMarkup(c){
  const msgs = Array.isArray(c?.messages)
    ? c.messages.slice().sort(
        (a,b) =>
          Number(a?.timecreated||0) -
          Number(b?.timecreated||0)
      )
    : [];

  const title =
    c?.name ||
    c?.members?.find?.(
      m =>
        String(m?.id) !==
        String(state.user?.id)
    )?.fullname ||
    'Диалог';

  const avatar =
    title.trim().slice(0,1).toUpperCase() || 'Д';

  const currentUserId =
    String(state.user?.id ?? '');

  return `
    <div class="conversation conversation-nova27">

      <header class="conversation-head">

        <button
          class="message-back"
          data-message-back
          type="button"
          aria-label="Вернуться к диалогам"
        >
          ${icon('back',18)}
        </button>

        <span class="avatar large">
          ${esc(avatar)}
        </span>

        <div class="conversation-head-main">
          <h2>${esc(title)}</h2>

          <p>
            ${
              msgs.length
                ? `${msgs.length} ${msgs.length===1 ? 'сообщение' : 'сообщений'}`
                : 'Новая переписка'
            }
          </p>
        </div>

      </header>

      <div
        class="conversation-body"
        id="conversation-body"
      >

        ${
          msgs.map((m,index)=>{
            const senderId =
              nova27MessageSenderId(m);

            const mine =
              senderId !== '' &&
              senderId === currentUserId;

            const previous =
              index > 0
                ? msgs[index - 1]
                : null;

            const previousSenderId =
              previous
                ? nova27MessageSenderId(previous)
                : '';

            const senderName =
              mine
                ? 'Вы'
                : nova27MessageSenderName(
                    m,
                    title
                  );

            const isNewGroup =
              index === 0 ||
              previousSenderId !== senderId;

            const text =
              messageText(
                m?.text ||
                m?.message ||
                ''
              ).trim();

            return `
              <div
                class="nova27-message-row ${mine ? 'mine' : 'incoming'} ${isNewGroup ? 'group-start' : 'group-continued'}"
                data-message-author="${esc(senderId)}"
              >

                ${
                  isNewGroup
                    ? `
                      <div class="nova27-message-author">
                        <span>${esc(senderName)}</span>
                      </div>
                    `
                    : ''
                }

                <div class="nova27-bubble">
                  <p>${esc(text)}</p>

                  ${
                    m?.timecreated
                      ? `
                        <time datetime="${esc(String(m.timecreated))}">
                          ${formatTime(m.timecreated)}
                        </time>
                      `
                      : ''
                  }
                </div>

              </div>
            `;
          }).join('') ||

          `
            <div class="conversation-inline-empty">
              <div class="conversation-inline-empty-icon">
                ${icon('message',20)}
              </div>
              <b>Пока нет сообщений</b>
              <span>Начните переписку с первого сообщения.</span>
            </div>
          `
        }

      </div>

      <form
        id="message-form"
        class="message-form nova27-message-form"
      >

        <div class="message-compose-shell">

          <div class="message-input-wrap">
            <textarea
              name="text"
              rows="1"
              required
              maxlength="4000"
              autocomplete="off"
              spellcheck="true"
              placeholder="Написать сообщение…"
              aria-label="Текст сообщения"
            ></textarea>
          </div>

          <button
            class="primary message-send"
            type="submit"
            title="Отправить"
            aria-label="Отправить сообщение"
          >
            ${icon('send',18)}
          </button>

        </div>

        <div class="message-form-hint">
          <span>Enter</span> отправить
          <i>·</i>
          <span>Shift+Enter</span> новая строка
        </div>

      </form>

    </div>
  `;
}
function bindMessageForm(){
  const form = $('#message-form');
  if(!form) return;

  const tx = form.querySelector('textarea');
  const btn = form.querySelector('button');

  if(!tx || !btn) return;

  const autoGrow = ()=>{
    tx.style.height = 'auto';
    tx.style.height = Math.min(tx.scrollHeight,160) + 'px';
  };

  tx.addEventListener('input', autoGrow);

  tx.addEventListener('keydown', event=>{
    if(
      event.key === 'Enter' &&
      !event.shiftKey
    ){
      event.preventDefault();

      if(
        !btn.disabled &&
        tx.value.trim()
      ){
        form.requestSubmit();
      }
    }
  });

  autoGrow();

  form.addEventListener('submit', async event=>{
    event.preventDefault();

    const value = tx.value.trim();

    if(!value || btn.disabled){
      return;
    }

    const original = btn.innerHTML;

    btn.disabled = true;
    tx.disabled = true;
    btn.classList.add('is-loading');
    btn.innerHTML = '<span>Отправляем…</span>';

    try{
      await api(
        '/api/messages/send',
        {
          method:'POST',
          body:JSON.stringify({
            conversationId:state.selectedConversation,
            text:value
          })
        }
      );

      tx.value = '';
      autoGrow();

      await loadData('messages',true);

      toast(
        'Сообщение отправлено',
        'success'
      );

    }catch(ex){
      toast(
        ex?.message ||
        'Не удалось отправить сообщение.',
        'error'
      );

    }finally{
      tx.disabled = false;
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.innerHTML = original;

      if(document.body.contains(tx)){
        tx.focus();
      }
    }
  });
}


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

(async function boot(){injectDashboardHomeOverrides();injectNovaAccountInlineStyles();injectNovaCalendarInlineStyles();injectNovaQuizInlineStyles();setTheme();parseRoute();try{const st=await api('/api/auth/status');state.connected=Boolean(st.connected);state.user=st.user||null;state.campusUrl=st.campusUrl||state.campusUrl;if(state.campusUrl)localStorage.setItem('nova-campus-url',state.campusUrl)}catch(e){console.warn(e)}const params=new URLSearchParams(location.search);if(!state.connected&&params.get('demo')==='1'){return loadDemo()}render();if(state.connected)loadRouteData(state.route==='course')})();
