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
  render(); loadRouteData(); }
function back(fallback='dashboard'){ if(history.state?.nova){history.back();return} navigate(fallback); }
function formatDate(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}
function formatLong(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}
function formatTime(ts){if(!ts)return '—';return new Date(Number(ts)*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
function firstName(){return (state.user?.fullname||'Студент').split(/\s+/)[0]||'Студент'}
function campusOrigin(){try{return new URL(state.campusUrl||'').origin}catch{return ''}}
function campusHost(){try{return new URL(state.campusUrl||'').host}catch{return 'вашего Campus'}}
function avatar(){return firstName().slice(0,1).toUpperCase()}
function flattenCalendar(c){const a=[];for(const w of c?.weeks||[])for(const d of w.days||[])for(const e of d.events||[])a.push({...e,timestart:e.timestart??d.timestamp});return a}
function dateKey(ts){const d=new Date(Number(ts)*1000);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function selectedKey(){return `${state.year}-${state.month}-${state.selectedDay}`}
function monthLabel(){return new Date(state.year,state.month-1,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}
function themeToggle(){state.theme=state.theme==='dark'?'light':'dark';setTheme();localStorage.setItem('nova-theme',state.theme);render()}
function setTheme(){document.body.dataset.theme=state.theme;const root=document.documentElement;if(root){root.dataset.theme=state.theme;root.style.colorScheme=state.theme}}
function brand(){return `<div class="brand"><span class="brand-mark">${icon('university',22)}</span><span><b>Campus <em>FA</em></b><small>Nova</small></span></div>`}
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
  return `<div class="app-shell"><aside class="sidebar"><div class="sidebar-top">${brand()}<div class="uni"><b>Финансовый университет</b><span>Краснодарский филиал</span></div></div><div class="nav-caption">УЧЕБНАЯ СРЕДА</div><nav class="nav">${nav}</nav><div class="sidebar-bottom"><button class="nav-item ${active==='profile'?'active':''}" data-go="profile">${icon('user',18)}<span>Профиль</span></button><button class="theme-row" id="theme-sidebar">${icon(state.theme==='dark'?'sun':'moon',17)}<span>${state.theme==='dark'?'Светлая тема':'Тёмная тема'}</span></button><span class="connection"><i></i>${state.demo?'Демо-режим':'Campus подключён'}</span></div></aside><main class="main"><header class="topbar"><div class="crumb"><button class="mobile-menu" id="mobile-menu">${icon('grid',18)}</button><span>Campus Nova</span><b>›</b><strong>${esc(routeLabel(state.route))}</strong></div><div class="top-actions"><label class="search"><span>${icon('search',17)}</span><input id="global-search" value="${esc(state.search)}" placeholder="Поиск по курсам, материалам, преподавателям…"><kbd>Ctrl K</kbd></label><button class="icon-btn" id="theme-top" title="Сменить тему">${icon(state.theme==='dark'?'sun':'moon',17)}</button><button class="icon-btn ${notificationsBadge()?'has-dot':''}" id="notifications" title="Уведомления">${icon('bell',17)}${notificationsBadge()}</button><button class="profile-chip" data-go="profile"><span class="avatar">${avatar()}</span><span><b>${esc(state.user?.fullname||'Студент')}</b><small>Студент</small></span>${icon('chevron',14)}</button></div></header><div id="page">${content}</div></main></div>`;
}
function skeletonGrid(n=6){return `<div class="skeleton-grid">${Array.from({length:n},()=>'<div class="skeleton-card"><span></span><span></span><span></span></div>').join('')}</div>`}
function statePanel(kind,service,retry=true){
  const errorTitles={course:'Не удалось загрузить курс.',activity:'Не удалось открыть активность.',grades:'Не удалось загрузить оценки.',tasks:'Не удалось загрузить задания.',files:'Не удалось загрузить файлы.',tests:'Не удалось загрузить тесты.',materials:'Не удалось загрузить материалы.',messages:'Не удалось загрузить сообщения.',profile:'Не удалось загрузить профиль.',calendar:'Не удалось загрузить календарь.',schedule:'Не удалось загрузить расписание.',courses:'Не удалось загрузить курсы.',view:'Не удалось открыть материал.',dashboard:'Не удалось загрузить главную страницу.'};
  const cfg={loading:['Загружаем данные…','Секунду, получаем актуальную информацию из Campus.'],error:[errorTitles[service]||'Не удалось загрузить данные Campus.',state.errors?.[service]||'Проверьте соединение и попробуйте ещё раз.'],empty:['Пока ничего нет','Campus успешно ответил, но для этого раздела данных сейчас нет.']}[kind];
  return `<div class="state-card ${kind}"><div class="state-icon">${kind==='loading'?'<span class="spinner"></span>':icon(kind==='error'?'info':'sparkle',22)}</div><h3>${cfg[0]}</h3><p>${esc(cfg[1])}</p>${retry&&kind==='error'?`<button class="primary" data-retry="${service}">${icon('refresh',16)} Повторить</button>`:''}</div>`;
}
function hero(){return `<section class="hero"><img class="hero-photo" src="https://images.unsplash.com/photo-1635496294742-ec5811d2f7fc?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=2400" srcset="https://images.unsplash.com/photo-1635496294742-ec5811d2f7fc?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=2400 1x, https://images.unsplash.com/photo-1635496294742-ec5811d2f7fc?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=3840 2x" sizes="(min-width: 1600px) 1180px, (min-width: 1200px) 82vw, 100vw" alt="Кампус университета" width="2400" height="1200" fetchpriority="high" decoding="async"><div class="hero-overlay"></div><div class="hero-brand">${icon('university',23)}<span><b>Финансовый университет</b><small>Краснодарский филиал</small></span></div><div class="hero-copy"><div class="eyebrow">ЛИЧНЫЙ КАБИНЕТ</div><h2>Доброе утро, ${esc(firstName())}!</h2><p>Успехов в учёбе сегодня <span>🚀</span></p></div><div class="hero-quote">Знания сегодня<br><strong>возможности завтра.</strong></div></section>`}
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
    </div><aside class="dash-side">${CalendarWidget()}<section class="side-card"><div class="panel-title"><span>${icon('sparkle',16)} Быстрые действия</span></div><div class="quick-actions"><button data-go="files">${icon('download',19)}<b>Файлы</b><small>Скачать</small></button><button data-go="messages">${icon('message',19)}<b>Сообщения</b><small>Открыть</small></button><button data-go="tasks">${icon('check-square',19)}<b>Задания</b><small>Открыть</small></button><button data-go="tests">${icon('quiz',19)}<b>Тесты</b><small>Открыть</small></button></div></section><section class="quote-card"><div><b>Всё необходимое<br>для учёбы. В одном месте.</b><small>Campus Nova сохраняет данные Campus и меняет только опыт.</small></div>${icon('arrow',20)}</section></aside></div></section>`;
}

function Panel({title,iconName='grid',action='',go='',wide=false,children}){return `<section class="panel ${wide?'wide':''}"><div class="panel-head"><div><h2>${icon(iconName,16)} ${esc(title)}</h2><small>Актуальные данные</small></div>${action?`<button class="panel-action" data-go="${go}">${esc(action)} ${icon('arrow',13)}</button>`:''}</div>${children}</section>`}
function miniCourse(c){const p=Number.isFinite(Number(c.progress))?Math.max(0,Math.min(100,Number(c.progress))):null;return `<button class="mini-course" data-go="course" data-param="${esc(c.id)}"><span class="course-thumb" style="${c.courseimage?`background-image:url('${String(c.courseimage).replace(/'/g,'%27')}')`:''}">${c.courseimage?'':icon('grid',20)}</span><span><b>${esc(c.fullnamedisplay||c.fullname||'Курс')}</b><small>${esc(c.shortname||'')}</small>${p!==null?`<i><em style="width:${p}%"></em></i>`:''}</span>${p!==null?`<strong>${p}%</strong>`:''}</button>`}
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
function activityCourseName(a){return a?.relations?.course?.name||'Курс'}
function tasksPage(){
  if(state.status.tasks==='loading') return `<section class="page">${PageHead({eyebrow:'ПЛАН',title:'Задания',sub:'Собираем задания из Activity Index…'})}${skeletonGrid(6)}</section>`;
  if(state.status.tasks==='error') return `<section class="page">${PageHead({eyebrow:'ПЛАН',title:'Задания',sub:'Не удалось собрать задания.'})}${statePanel('error','tasks')}</section>`;
  const tasks=state.data.tasks||[]; return `<section class="page">${PageHead({eyebrow:'ПЛАН',title:'Мои задания',sub:'Единые Assignment activities из всех курсов',children:`<button class="secondary" data-retry="tasks">${icon('refresh',16)} Обновить</button>`})}<div class="task-list">${tasks.map(a=>{const due=activityDue(a);return `<button class="task-card" data-activity="${activityRefAttr(a)}"><span class="task-kind assign">${icon('check-square',18)}</span><span><b>${esc(a.identity?.name||'Задание')}</b><small>${esc(activityCourseName(a))}</small></span><time>${due?esc(formatLong(due)):'Срок не указан'}</time>${icon('arrow',16)}</button>`}).join('')||'<div class="inline-empty">Заданий сейчас нет.</div>'}</div></section>`;
}
function testsPage(){
  if(state.status.tests==='loading') return `<section class="page">${PageHead({eyebrow:'КОНТРОЛЬ',title:'Тесты',sub:'Загружаем доступные тесты из Activity Index…'})}${skeletonGrid(5)}</section>`;
  if(state.status.tests==='error') return `<section class="page">${PageHead({eyebrow:'КОНТРОЛЬ',title:'Тесты',sub:'Не удалось получить список тестов.'})}${statePanel('error','tests')}</section>`;
  const tests=state.data.tests||[]; return `<section class="page">${PageHead({eyebrow:'КОНТРОЛЬ',title:'Тесты',sub:'Единые Quiz activities из всех курсов.',children:`<button class="secondary" data-retry="tests">${icon('refresh',16)} Обновить</button>`})}<div class="test-grid">${tests.map(a=>{const due=activityDue(a);return `<button class="test-card" data-activity="${activityRefAttr(a)}"><span class="test-icon">${icon('quiz',22)}</span><span><b>${esc(a.identity?.name||'Тест')}</b><small>${esc(activityCourseName(a))}${due?` · ${esc(formatLong(due))}`:''}</small></span>${icon('arrow',16)}</button>`}).join('')||'<div class="inline-empty">Тестов сейчас нет.</div>'}</div></section>`;
}
function schedulePage(){
  if(state.status.schedule==='loading') return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:'События выбранного дня.'})}${skeletonGrid(4)}</section>`;
  if(state.status.schedule==='error') return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:'Не удалось загрузить расписание.'})}${statePanel('error','schedule')}</section>`;
  const events=flattenCalendar(state.data.schedule||{}).filter(e=>dateKey(e.timestart)===selectedKey()).sort((a,b)=>Number(a.timestart)-Number(b.timestart));
  return `<section class="page">${PageHead({eyebrow:'РАСПИСАНИЕ',title:'Расписание',sub:formatLong(new Date(state.year,state.month-1,state.selectedDay).getTime()/1000),children:`<button class="secondary" data-go="calendar">${icon('calendar',16)} Открыть календарь</button>`})}<div class="schedule-list">${events.map(e=>`<button class="schedule-card" data-view="${esc(e.url||'')}" data-route-url><time>${formatTime(e.timestart)}</time><span class="schedule-dot"></span><div><b>${esc(e.name||'Событие')}</b><small>${esc(e.location||e.course?.fullname||'')}</small></div>${icon('arrow',16)}</button>`).join('')||'<div class="inline-empty">На выбранную дату занятий нет.</div>'}</div></section>`;
}
function calendarPage(){
  if(state.status.calendar==='loading') return `<section class="page">${PageHead({eyebrow:'КАЛЕНДАРЬ',title:'Календарь',sub:'Загружаем календарь Campus…'})}${skeletonGrid(3)}</section>`;
  if(state.status.calendar==='error') return `<section class="page">${PageHead({eyebrow:'КАЛЕНДАРЬ',title:'Календарь',sub:'Не удалось получить календарь.'})}${statePanel('error','calendar')}</section>`;
  return `<section class="page">${PageHead({eyebrow:'КАЛЕНДАРЬ',title:monthLabel(),sub:'Выбери день, чтобы увидеть события.',children:`<div class="calendar-actions"><button class="icon-btn" data-month="-1">${icon('back',17)}</button><button class="secondary" id="calendar-today">Сегодня</button><button class="icon-btn" data-month="1">${icon('next',17)}</button></div>`})}<div class="calendar-layout"><div class="calendar-card"><div class="weekday">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<span>${x}</span>`).join('')}</div>${calendarGrid()}</div><aside class="events-card"><div class="panel-head"><div><h2>${icon('calendar',16)} События</h2><small>${esc(formatLong(new Date(state.year,state.month-1,state.selectedDay).getTime()/1000))}</small></div></div><div class="events-list">${eventsForSelected().map(e=>`<button class="event-card" data-view="${esc(e.url||'')}" data-route-url><span class="event-time">${formatTime(e.timestart)}</span><span><b>${esc(e.name||'Событие')}</b><small>${esc(e.location||e.course?.fullname||'')}</small></span>${icon('arrow',14)}</button>`).join('')||'<div class="inline-empty">Событий на выбранную дату нет.</div>'}</div></aside></div></section>`;
}
function CalendarWidget(){return `<section class="side-card calendar-mini"><div class="panel-title"><span>${icon('calendar',16)} Календарь</span><button data-go="calendar">Все</button></div><div class="mini-month-head"><button class="icon-btn tiny" data-month="-1">${icon('back',14)}</button><b>${esc(monthLabel())}</b><button class="icon-btn tiny" data-month="1">${icon('next',14)}</button></div><div class="mini-grid">${calendarGrid(true)}</div></section>`}
function calendarGrid(mini=false){const first=new Date(state.year,state.month-1,1);let offset=(first.getDay()+6)%7;const days=new Date(state.year,state.month,0).getDate();const prevDays=new Date(state.year,state.month-1,0).getDate();const events=flattenCalendar(state.data.calendar||{});let html='';for(let i=0;i<42;i++){const n=i-offset+1;let day=n,month=state.month,year=state.year,other=false;if(n<1){day=prevDays+n;month--;if(month===0){month=12;year--}other=true}else if(n>days){day=n-days;month++;if(month===13){month=1;year++}other=true}const key=`${year}-${month}-${day}`;const has=events.some(e=>dateKey(e.timestart)===key);const selected=year===state.year&&month===state.month&&day===state.selectedDay&&!other;const today=new Date();const istoday=year===today.getFullYear()&&month===today.getMonth()+1&&day===today.getDate();if(mini&&i>=35&&!other)continue;html+=`<button class="day ${other?'other':''} ${selected?'selected':''} ${istoday?'today':''} ${has?'has-event':''}" data-day="${year}-${month}-${day}"><span>${day}</span>${has?'<i></i>':''}</button>`}return html}
function eventsForSelected(){const events=flattenCalendar(state.data.calendar||{}).filter(e=>dateKey(e.timestart)===selectedKey()).sort((a,b)=>Number(a.timestart)-Number(b.timestart));return events}
function messagesPage(){
  if(state.status.messages==='loading') return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Загружаем диалоги Campus…'})}${skeletonGrid(2)}</section>`;
  if(state.status.messages==='error') return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Не удалось получить диалоги.'})}${statePanel('error','messages')}</section>`;
  const m=state.data.messages||{}; const conv=m.conversations||[];
  return `<section class="page messages-page">${PageHead({eyebrow:'КОММУНИКАЦИЯ',title:'Сообщения',sub:'Переписка остаётся внутри Nova.',children:`<button class="secondary" data-retry="messages">${icon('refresh',16)} Обновить</button>`})}<div class="messages-shell"><div class="conversation-list">${conv.map(c=>`<button class="conversation-item ${String(c.id)===String(state.selectedConversation)?'active':''}" data-conversation="${esc(c.id)}"><span class="avatar">${esc((c.name||'Д').slice(0,1))}</span><span><b>${esc(c.name||'Диалог')}</b><small>${esc(text(c.messages?.[0]?.text||'Нет сообщений').slice(0,70))}</small></span></button>`).join('')||'<div class="inline-empty">Новых сообщений нет.</div>'}</div><div class="conversation-view" id="conversation-view">${state.selectedConversation?'<div class="loading-center"><span class="spinner"></span><p>Открываем переписку…</p></div>':'<div class="conversation-empty">'+icon('message',28)+'<h2>Выберите диалог</h2><p>История переписки и отправка сообщений доступны внутри Nova.</p></div>'}</div></div></section>`;
}
function filesPage(){
  if(state.status.files==='loading') return `<section class="page">${PageHead({eyebrow:'ХРАНИЛИЩЕ',title:'Файлы',sub:'Собираем файлы через Activity Index…'})}${skeletonGrid(5)}</section>`;
  if(state.status.files==='error') return `<section class="page">${PageHead({eyebrow:'ХРАНИЛИЩЕ',title:'Файлы',sub:'Не удалось получить файлы.'})}${statePanel('error','files')}</section>`;
  const files=state.data.files||[]; return `<section class="page">${PageHead({eyebrow:'ХРАНИЛИЩЕ',title:'Мои файлы',sub:'Файлы, связанные с реальными Campus activities',children:`<button class="secondary" data-retry="files">${icon('refresh',16)} Обновить</button>`})}<div class="files-card">${files.map(item=>{const a=item.activity||{};const f=item.file||{};const ref=activityRefAttr(a);return `<div class="file-row"><button class="file-row-main" data-activity="${ref}"><span class="file-name"><span class="file-type">${icon('download',17)}</span><span><b>${esc(f.filename||a.identity?.name||'Файл')}</b><small>${esc(activityCourseName(a))} · ${esc(f.mimetype||'Файл')}${f.filesize?` · ${esc(formatBytes(f.filesize))}`:''}</small></span></span>${icon('arrow',15)}</button><button class="icon-btn tiny" data-download="${esc(f.fileurl||'')}" aria-label="Скачать">${icon('download',16)}</button></div>`}).join('')||'<div class="inline-empty">Файлов сейчас нет.</div>'}</div></section>`;
}
function formatBytes(n){const x=Number(n)||0;if(x<1024)return `${x} Б`;if(x<1024*1024)return `${(x/1024).toFixed(1)} КБ`;if(x<1024*1024*1024)return `${(x/1024/1024).toFixed(1)} МБ`;return `${(x/1024/1024/1024).toFixed(1)} ГБ`}

function materialsPage(){
  if(state.status.materials==='loading') return `<section class="page">${PageHead({eyebrow:'МАТЕРИАЛЫ',title:'Материалы',sub:'Собираем материалы из Activity Index…'})}${skeletonGrid(5)}</section>`;
  if(state.status.materials==='error') return `<section class="page">${PageHead({eyebrow:'МАТЕРИАЛЫ',title:'Не удалось получить материалы',sub:state.errors?.materials||'Campus не вернул материалы.'})}${statePanel('error','materials')}</section>`;
  const items=state.data.materials||[];
  return `<section class="page">${PageHead({eyebrow:'МАТЕРИАЛЫ',title:'Материалы',sub:'Единые resource/page/folder и plugin activities',children:`<button class="secondary" data-retry="materials">${icon('refresh',16)} Обновить</button>`})}<div class="task-list">${items.map(a=>`<button class="task-card" data-activity="${activityRefAttr(a)}"><span class="task-kind resource">${icon(a.ref?.type==='folder'?'folder':'grid',18)}</span><span><b>${esc(a.identity?.name||'Материал')}</b><small>${esc(activityCourseName(a))} · ${esc(a.ref?.type||'activity')}</small></span>${icon('arrow',16)}</button>`).join('')||'<div class="inline-empty">Материалов сейчас нет.</div>'}</div></section>`;
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

  return root.innerHTML.trim();
}

function activityPage(){
  if(state.status.activity==='loading')
    return `<section class="page">
      <div class="content-card">
        <div class="content-toolbar">
          <button class="back-button" data-back="${state.routeBeforeActivity||'courses'}">
            ${icon('back',17)} Назад
          </button>
        </div>
        ${statePanel('loading','activity',false)}
      </div>
    </section>`;

  if(state.status.activity==='error')
    return `<section class="page">
      <div class="content-card">
        <div class="content-toolbar">
          <button class="back-button" data-back="${state.routeBeforeActivity||'courses'}">
            ${icon('back',17)} Назад
          </button>
        </div>
        ${statePanel('error','activity')}
      </div>
    </section>`;

  const data = state.data.activity || {};
  const a = data.activity || {};
  const result = data.result || {};
  const kind = result.kind || 'activity';
  const title = result.title || a.identity?.name || 'Активность';
  const cleanHtml = activityHtml(result, title);

  if(data.fallback){
    return `<section class="page">
      <div class="content-card">
        <div class="content-toolbar">
          <button class="back-button" data-back="${state.routeBeforeActivity||'courses'}">
            ${icon('back',17)} Назад
          </button>
        </div>
        <div class="eyebrow">${esc(activityTypeLabel(a))}</div>
        <h1>${esc(a.identity?.name||'Активность')}</h1>

        <div class="state-card">
          <div class="state-icon">${icon('arrow',22)}</div>
          <h3>Эту активность нужно открыть в Campus</h3>
          <p>${esc(data.message||'Для этого типа пока нет подтверждённого native workflow Nova.')}</p>
          <button class="primary" id="open-activity-fallback">
            Открыть в Campus ${icon('arrow',16)}
          </button>
        </div>
      </div>
    </section>`;
  }

  const firstFile =
    result.file ||
    (Array.isArray(result.files) ? result.files[0] : null) ||
    firstCampusFile(result.html);

  let body = '';
  let topAction = '';

  if(kind === 'file'){
    const file = result.file || firstFile || {};

    body = `
      <div class="nova-file-card">
        <div class="nova-file-icon">
          ${icon('download',28)}
        </div>

        <div class="nova-file-info">
          <span class="eyebrow">ФАЙЛ</span>
          <h2>${esc(file.filename || title || 'Файл')}</h2>
          <p>${esc(file.mimetype || 'Документ Campus')}</p>
        </div>

        ${file.fileurl
          ? `<button class="primary nova-file-download"
               data-download="${esc(file.fileurl)}">
               ${icon('download',17)} Скачать
             </button>`
          : ''
        }
      </div>`;

  } else if(kind === 'resource') {
    body = `
      ${firstFile?.fileurl ? `
        <div class="nova-download-card">
          <div class="nova-download-icon">
            ${icon('download',22)}
          </div>

          <div class="nova-download-copy">
            <span class="eyebrow">ЛЕКЦИЯ</span>
            <h2>${esc(firstFile.filename || 'Материал лекции')}</h2>
            <p>Файл хранится в Campus и открывается через защищённую сессию.</p>
          </div>

          <button class="primary"
                  data-download="${esc(firstFile.fileurl)}">
            ${icon('download',17)} Скачать лекцию
          </button>
        </div>
      ` : ''}

      ${cleanHtml
        ? `<div class="nova-activity-html">${cleanHtml}</div>`
        : `<div class="inline-empty">Содержимое материала отсутствует.</div>`
      }`;

  } else if(kind === 'quiz') {
    topAction = `
      <button class="primary" id="quiz-start-button">
        ${icon('arrow',17)} Начать тест
      </button>`;

    body = `
      <div class="nova-quiz-intro">
        <div class="nova-quiz-icon">${icon('quiz',25)}</div>
        <div>
          <span class="eyebrow">ТЕСТ</span>
          <h2>${esc(title)}</h2>
          <p>
            Запуск выполняется через настоящую форму Campus.
            Ответы и попытка останутся синхронизированы с Moodle.
          </p>
        </div>
      </div>

      <div class="nova-activity-html nova-quiz-html">
        ${cleanHtml || '<div class="inline-empty">Campus не передал содержимое теста.</div>'}
      </div>`;

  } else if(kind === 'quiz-action') {
    body = `
      <div class="nova-quiz-status">
        <span class="nova-quiz-status-icon">${icon('check',20)}</span>
        <div>
          <span class="eyebrow">ТЕСТ</span>
          <h3>Попытка теста запущена</h3>
          <p>Отвечай на вопросы ниже. Форма отправляет ответы прямо в Campus.</p>
        </div>
      </div>

      <div class="nova-activity-html nova-quiz-html">
        ${cleanHtml || '<div class="inline-empty">Campus не передал вопросы теста.</div>'}
      </div>`;

  } else if(kind === 'assignment'){
    body = `
      <div class="nova-assignment-head">
        <div class="nova-assignment-icon">${icon('check-square',24)}</div>
        <div>
          <span class="eyebrow">ЗАДАНИЕ</span>
          <h2>${esc(title)}</h2>
          <p>Ответ будет отправлен через реальную форму Campus.</p>
        </div>
      </div>

      <div class="nova-activity-html">
        ${cleanHtml || '<div class="inline-empty">Содержимое задания отсутствует.</div>'}
      </div>`;

  } else if(kind === 'assignment-form'){
    body = `
      <div class="nova-assignment-head">
        <div class="nova-assignment-icon">${icon('edit',24)}</div>
        <div>
          <span class="eyebrow">ОТВЕТ</span>
          <h2>${esc(title)}</h2>
          <p>Заполни форму и отправь ответ в Campus.</p>
        </div>
      </div>

      <div class="nova-activity-html">
        ${cleanHtml || '<div class="inline-empty">Форма задания отсутствует.</div>'}
      </div>`;

  } else {
    body = `
      <div class="nova-activity-html">
        ${cleanHtml || '<div class="inline-empty">У этой активности пока нет отображаемого содержимого.</div>'}
      </div>`;
  }

  return `<section class="page activity-page">
    <div class="content-card">
      <div class="content-toolbar">
        <button class="back-button" data-back="${state.routeBeforeActivity||'courses'}">
          ${icon('back',17)} Назад
        </button>

        <div class="activity-actions">
          ${topAction}

          ${kind==='assignment'
            ? `<button class="secondary"
                       data-activity-action="edit">
                 ${icon('edit',16)} Добавить ответ
               </button>`
            : ''
          }

          ${kind==='assignment-form'
            ? `<button class="secondary"
                       data-activity-action="save">
                 ${icon('save',16)} Сохранить
               </button>
               <button class="primary"
                       data-activity-action="submit">
                 ${icon('send',16)} Отправить
               </button>`
            : ''
          }
        </div>
      </div>

      <div class="eyebrow">
        ${esc(activityTypeLabel(a))} · ${esc(a?.relations?.course?.name || 'Курс')}
      </div>

      <h1>${esc(title)}</h1>

      <div id="campus-content">
        ${body}
      </div>
    </div>
  </section>`;
}

function profilePage(){
  if(state.status.profile==='loading') return `<section class="page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Загружаем профиль…'})}${skeletonGrid(2)}</section>`;
  if(state.status.profile==='error') return `<section class="page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Не удалось загрузить профиль.'})}${statePanel('error','profile')}</section>`;
  const p=state.data.profile||state.user||{}; return `<section class="page profile-page">${PageHead({eyebrow:'АККАУНТ',title:'Профиль',sub:'Твой Campus в Nova.',children:`<button class="secondary" id="logout">Выйти</button>`})}<div class="profile-grid"><section class="profile-card main-profile"><div class="profile-avatar">${esc(avatar())}</div><div><h2>${esc(p.fullname||state.user?.fullname||'Студент')}</h2><p>Студент · Финансовый университет</p><div class="status-pill"><i></i> Campus подключён</div></div></section><section class="profile-card"><div class="panel-title">Подключение</div><div class="profile-info"><span>Статус</span><b>Активно</b><span>Сайт Campus</span><b>${esc(campusHost())}</b><span>Интерфейс</span><b>Campus Nova</b></div></section><section class="profile-card"><div class="panel-title">Тема</div><p class="profile-muted">Сохраняется на этом устройстве.</p><button class="secondary wide" id="theme-profile">${icon(state.theme==='dark'?'sun':'moon',16)} ${state.theme==='dark'?'Переключить на светлую':'Переключить на тёмную'}</button></section></div></section>`;
}
function viewPage(){
  const title=state.data.view?.title||'Материал';
  let body=skeletonGrid(2);
  if(state.status.view==='error') body=statePanel('error','view');
  return `<section class="page content-page"><div class="content-card"><div class="content-toolbar"><button class="back-button" data-back="dashboard">${icon('back',17)} Назад</button><button class="secondary" id="content-refresh">${icon('refresh',16)} Обновить</button></div><h1 id="view-title">${esc(title)}</h1><div id="campus-content">${body}</div></div></section>`;
}
function login(){const remembered=state.campusUrl||'https://campus.fa.ru';return `<div class="auth"><div class="auth-left"><div class="auth-inner"><div class="auth-wordmark"><span class="auth-wordmark-mark">${icon('university',22)}</span><span class="auth-wordmark-copy"><small>Новый интерфейс Campus</small><b><span>Ваш</span> <strong>Campus Nova</strong></b></span></div><div class="eyebrow">ПОДКЛЮЧЕНИЕ УЧЕБНОГО КАБИНЕТА</div><h1>Всё для учёбы.<br><span>В одном месте.</span></h1><p>Укажи адрес своего Campus. Nova возьмёт реальные курсы, задания, оценки, файлы и расписание из него и покажет их в новом интерфейсе.</p><form id="login-form"><label>Ссылка на Campus<input name="campusUrl" value="${esc(remembered)}" inputmode="url" autocomplete="url" required placeholder="https://campus.example.ru"></label><label>Логин<input name="username" autocomplete="username" required placeholder="Логин"></label><label>Пароль<div class="password"><input id="login-password" name="password" type="password" autocomplete="current-password" required placeholder="Пароль"><button type="button" id="toggle-pass" aria-label="Показать пароль">${icon('eye',15)}</button></div></label><button class="primary wide" type="submit">Подключить Campus ${icon('arrow',17)}</button><button class="secondary wide" type="button" id="demo-mode">Посмотреть демо</button><div class="security">${icon('check',16)} Nova не сохраняет пароль Campus в профиле.</div><div class="connect-note">Можно указать адрес любого доступного Campus на базе Moodle. После подключения все данные привязаны к этой Campus-сессии.</div><div id="login-error"></div></form></div></div><div class="auth-visual"><img class="auth-photo" src="https://images.unsplash.com/photo-1777651860852-89059b3f0901?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=2400" srcset="https://images.unsplash.com/photo-1777651860852-89059b3f0901?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=2400 1x, https://images.unsplash.com/photo-1777651860852-89059b3f0901?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=92&w=3840 2x" sizes="50vw" alt="Университетский кампус" width="2400" height="1600" fetchpriority="high" decoding="async"><div class="auth-visual-overlay"></div><div class="auth-copy"><span>Campus Nova</span><b>Учёба без лишнего шума.</b><small>Твой Campus. Новый интерфейс.</small></div></div></div>`}

function render(){setTheme();const app=$('#app');if(!state.connected){app.innerHTML=login();bind();return}let body='';switch(state.route){case 'courses':body=coursesPage();break;case 'course':body=coursePage();break;case 'schedule':body=schedulePage();break;case 'grades':body=gradePage();break;case 'tasks':body=tasksPage();break;case 'calendar':body=calendarPage();break;case 'messages':body=messagesPage();break;case 'files':body=filesPage();break;case 'tests':body=testsPage();break;case 'materials':body=materialsPage();break;case 'activity':body=activityPage();break;case 'profile':body=profilePage();break;case 'view':body=viewPage();break;default:body=dashboard()}app.innerHTML=shell(body);bind()}
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
  $('#calendar-today')?.addEventListener('click',()=>{const d=new Date();state.year=d.getFullYear();state.month=d.getMonth()+1;state.selectedDay=d.getDate();render();loadData('calendar',true)});
  $('#expand-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=true));$('#collapse-all')?.addEventListener('click',()=>$$('.course-section').forEach(x=>x.open=false));
  $('#cards-mode')?.addEventListener('click',()=>{state.courseView='cards';localStorage.setItem('nova-course-view','cards');render()});$('#list-mode')?.addEventListener('click',()=>{state.courseView='list';localStorage.setItem('nova-course-view','list');render()});
  $('#logout')?.addEventListener('click',logout);$('#notifications')?.addEventListener('click',()=>showNotifications());
  const s=$('#global-search');if(s){s.addEventListener('input',()=>{state.search=s.value; if(state.route==='courses')render()});s.addEventListener('keydown',e=>{if(e.key==='Enter'&&state.search.trim())navigate('courses')});}
  $('#mobile-menu')?.addEventListener('click',()=>$('.sidebar')?.classList.toggle('mobile-open'));
  $('#login-form')?.addEventListener('submit',doLogin);$('#toggle-pass')?.addEventListener('click',()=>{const p=$('#login-password');if(p)p.type=p.type==='password'?'text':'password'});$('#demo-mode')?.addEventListener('click',loadDemo);
  $('#content-refresh')?.addEventListener('click',()=>loadView(true));
}
async function doLogin(e){e.preventDefault();const form=e.currentTarget;const btn=form.querySelector('button[type=submit]');const err=$('#login-error');btn.disabled=true;btn.innerHTML=`<span class="spinner small"></span> Подключаем…`;err.innerHTML='';try{const b=Object.fromEntries(new FormData(form).entries());const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify(b)});state.connected=true;state.user=d.user;state.campusUrl=d.campusUrl||b.campusUrl;localStorage.setItem('nova-campus-url',state.campusUrl);state.demo=false;state.data={dashboard:null,courses:null,tasks:null,grades:null,schedule:null,calendar:null,messages:null,files:null,tests:null,materials:null,profile:null,view:null,activity:null};toast(`Campus подключён · ${campusHost()}`,'success');navigate('dashboard','',true)}catch(ex){err.innerHTML=`<div class="login-error">${esc(ex.message)}</div>`}finally{btn.disabled=false;btn.innerHTML=`Подключить Campus ${icon('arrow',17)}`}}
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
  if(form){const fd=new FormData(form); for(const [k,v] of fd.entries()){ if(typeof v!=='string') continue; if(Object.prototype.hasOwnProperty.call(values,k)) values[k]=Array.isArray(values[k])?[...values[k],v]:[values[k],v]; else values[k]=v; }}
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
window.addEventListener('popstate',()=>{state.routeEpoch++;parseRoute();render();loadRouteData(false,state.routeEpoch)});window.addEventListener('error',e=>console.error('[Nova]',e.error||e.message));window.addEventListener('unhandledrejection',e=>console.error('[Nova]',e.reason));
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#global-search')?.focus()}});
document.addEventListener('click',e=>{
  const target=e.target?.closest?.('a[data-go]');
  if(!target || !target.isConnected || e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const route=target.dataset.go||''; const param=target.dataset.param||'';
  e.preventDefault();
  try{ navigate(route==='course'?'course':route,param); }
  catch(error){ console.error('[Nova][NavigationFallback]',{route,param,error}); const href=target.getAttribute('href'); if(href) window.location.assign(href); }
});
(async function boot(){setTheme();parseRoute();try{const st=await api('/api/auth/status');state.connected=Boolean(st.connected);state.user=st.user||null;state.campusUrl=st.campusUrl||state.campusUrl;if(state.campusUrl)localStorage.setItem('nova-campus-url',state.campusUrl)}catch(e){console.warn(e)}const params=new URLSearchParams(location.search);if(!state.connected&&params.get('demo')==='1'){return loadDemo()}render();if(state.connected)loadRouteData(state.route==='course')})();
