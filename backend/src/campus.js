// NOVA 28.5 · SERVER MICRO CACHE
import crypto from 'node:crypto';
import { SessionManager } from './session-manager.js';
import { ContractRegistry } from './contract-registry.js';
import { CampusTransport, CampusTransportError } from './transport.js';
import { OperationTrace } from './operation-trace.js';
import { ActivityRegistry } from './activity-registry.js';
import { ActivityIndex } from './activity-index.js';
import { CourseGraph } from './course-graph.js';
import { ActivityEngine } from './activity-engine.js';
import { FormService } from './form-service.js';
import { FileService } from './file-service.js';
import { CampusAdapter } from './campus-adapter.js';

const CAMPUS_ORIGIN = process.env.CAMPUS_ORIGIN || 'https://campus.fa.ru';
const CAMPUS_HOST = new URL(CAMPUS_ORIGIN).hostname;
const INTERNAL_PREFIX = '/campus';

function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    if (Array.isArray(values)) return values.map(v => v.split(';', 1)[0]).filter(Boolean);
  }
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=\s*[^;=]+=)/).map(v => v.split(';', 1)[0]).filter(Boolean);
}
function mergeCookies(jar, values) {
  for (const item of values) {
    const i = item.indexOf('=');
    if (i < 0) continue;
    const k = item.slice(0, i).trim();
    const v = item.slice(i + 1).trim();
    if (!v) jar.delete(k); else jar.set(k, v);
  }
}
function cookieHeader(jar) { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
function decodeHtml(s = '') {
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
function textOnly(value = '') {
  return decodeHtml(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function attr(tag, name) { return tag.match(new RegExp(`\\b${name}=["']([^"']*)`, 'i'))?.[1] || ''; }
function hiddenInputs(html) {
  const out = {};
  for (const tag of html.match(/<input\b[^>]*>/gi) || []) {
    if ((attr(tag, 'type') || 'text').toLowerCase() !== 'hidden') continue;
    const name = attr(tag, 'name'); if (name) out[name] = attr(tag, 'value');
  }
  return out;
}
function loginForm(html) {
  for (const m of html.matchAll(/<form\b[^>]*>/gi)) {
    const tag = m[0]; const start = m.index + tag.length; const end = html.indexOf('</form>', start); const chunk = end >= 0 ? html.slice(start, end) : '';
    if (!/name=["']password["']/i.test(chunk) || !/name=["']username["']/i.test(chunk)) continue;
    let submit = null;
    const submitButton = chunk.match(/<(?:button|input)\b[^>]*type=["']submit["'][^>]*>/i)?.[0] || '';
    if (submitButton) {
      const name = attr(submitButton, 'name');
      const value = attr(submitButton, 'value') || textOnly(submitButton);
      if (name) submit = { name, value };
    }
    return { action: attr(tag, 'action') || '/login/index.php', hidden: hiddenInputs(chunk), submit };
  }
  return { action: '/login/index.php', hidden: hiddenInputs(html), submit: { name: 'submit', value: 'Вход' } };
}
function parseConfig(html) {
  const raw = String(html || '');
  const src = decodeHtml(raw);
  const sesskey =
    src.match(/(?:["']?sesskey["']?\s*[:=]\s*["'])([^"'\s]+)["']/i)?.[1] ||
    src.match(/(?:["']?sesskey["']?\s*=\s*)([A-Za-z0-9._~-]+)/i)?.[1] ||
    src.match(/(?:logout\.php[^?#]*\?[^"'<>\s]*\bsesskey=)([^&"'<>\s#]+)/i)?.[1] ||
    src.match(/<input\b[^>]*\bname=["']sesskey["'][^>]*\bvalue=["']([^"']+)["']/i)?.[1] ||
    src.match(/\bdata-sesskey=["']([^"']+)["']/i)?.[1] ||
    null;
  const contextid = Number(src.match(/(?:["']?contextid["']?\s*[:=]\s*)(\d+)/i)?.[1] || 0) || null;
  const userid =
    Number(src.match(/(?:data-userid|["']?userid["']?)=["']?(\d+)["']?/i)?.[1] || 0) ||
    Number(src.match(/user\/profile\.php\?id=(\d+)/i)?.[1] || 0) ||
    null;
  return { sesskey, contextid, userid };
}
function parseUser(html, userid) {
  const rawName = textOnly(html.match(/<button[^>]+tool-login[^>]*>([\s\S]*?)<\/button>/i)?.[1] || '');
  const name = rawName.replace(/^(Войти|Профиль)\s*/i, '').trim() || 'Студент';
  const email = decodeHtml(html.match(/mailto:([^"'>\s]+)/i)?.[1] || '') || null;
  return { id: userid || null, fullname: name, email };
}
function pathOnly(urlValue, baseUrl = CAMPUS_ORIGIN) {
  try { const u = new URL(urlValue, baseUrl); return u.pathname + u.search + u.hash; }
  catch { return String(urlValue || '/'); }
}
function hasLoginForm(html = '') {
  for (const m of String(html || '').matchAll(/<form\b[^>]*>/gi)) {
    const tag = m[0];
    const start = m.index + tag.length;
    const end = String(html || '').indexOf('</form>', start);
    const chunk = end >= 0 ? String(html || '').slice(start, end) : '';
    if (/name=["']password["']/i.test(chunk) && /name=["']username["']/i.test(chunk)) return true;
  }
  return false;
}
function isLoginHtml(html = '') {
  const raw = String(html || '');
  if (!hasLoginForm(raw)) return false;
  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const top = textOnly(raw).slice(0, 5000);
  return /Вход на сайт|Вход в систему|login/i.test(textOnly(title)) || /login\/(?:index|token)\.php/i.test(raw) || /\bВход\b/i.test(top);
}
function hasMoodleSessionCookie(jar) {
  return [...(jar?.keys?.() || [])].some(k => /^MoodleSession/i.test(String(k || '')));
}
function hasWebCookie(jar) {
  return [...(jar?.keys?.() || [])].some(k => /^(?:MoodleSession|session-cookie)/i.test(String(k || '')));
}
function extractTestSessionId(pathname, baseUrl = CAMPUS_ORIGIN) {
  try {
    const u = new URL(pathname, baseUrl);
    const value = u.searchParams.get('testsession');
    return /^\d+$/.test(String(value || '')) ? Number(value) : null;
  } catch { return null; }
}
function looksAuthenticatedPage(pathname, status, html = '') {
  const raw = String(html || '');
  if (!(status >= 200 && status < 300)) return false;
  const path = pathOnly(pathname || '/');
  if (/^\/login\//i.test(path)) return false;
  const title = textOnly(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  if (/Вход на сайт|Вход в систему/i.test(title)) return false;
  const hasSesskey = /(?:["']?sesskey["']?\s*[:=]\s*["'])[A-Za-z0-9._~-]+["']/i.test(raw)
    || /logout\.php[^?#]*\?[^"'<>\s]*\bsesskey=/i.test(raw)
    || /<input\b[^>]*\bname=["']sesskey["']/i.test(raw)
    || /\bdata-sesskey=["'][^"']+["']/i.test(raw);
  const hasUserMarker = /(?:user\/(?:profile|view)\.php\?id=\d+|\btool-login\b|Личный кабинет)/i.test(raw);
  return hasSesskey || hasUserMarker || path === '/my/' || path.startsWith('/my/');
}

function appendRestParam(qs, key, value) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendRestParam(qs, `${key}[${i}]`, v));
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) appendRestParam(qs, `${key}[${k}]`, v);
    return;
  }
  qs.append(key, String(value));
}

function sectionBlocks(html) {
  const src = String(html || '');
  const collect = (re, idFromAttrs) => {
    const openings = [];
    for (const m of src.matchAll(re)) {
      const attrs = m[1];
      const id = idFromAttrs(attrs);
      if (id) openings.push({ id: Number(id), index: m.index, tagLength: m[0].length });
    }
    return openings.map((h, idx) => ({ id: h.id, html: src.slice(h.index + h.tagLength, openings[idx + 1]?.index ?? src.length) }));
  };
  const legacy = collect(/<(?:li|div|section)\b([^>]*)>/gi, attrs => {
    const id = attrs.match(/\bid=["']section-(\d+)["']/i)?.[1];
    if (!id) return null;
    const cls = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
    return /\bsection\b/i.test(cls) || !cls ? id : null;
  });
  if (legacy.length) return legacy;
  return collect(/<(?:li|div|section)\b([^>]*)>/gi, attrs => {
    if (!/\bdata-for=["']section["']/i.test(attrs)) return null;
    return attrs.match(/\bdata-number=["'](\d+)["']/i)?.[1] || attrs.match(/\bdata-id=["'](\d+)["']/i)?.[1] || null;
  });
}
function activityBlocks(html) {
  const src = String(html || ''); const hits = [];
  for (const m of src.matchAll(/<(?:li|div)\b([^>]*)>/gi)) {
    const a = m[1];
    const id = a.match(/\bid=["']module-(\d+)["']/i)?.[1] || (/\bdata-for=["']cmitem["']/i.test(a) ? a.match(/\bdata-id=["'](\d+)["']/i)?.[1] : null);
    const cls = a.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
    if (id && (/\bactivity\b/i.test(cls) || /\bmodtype_[a-z0-9_]+\b/i.test(cls) || /\bdata-for=["']cmitem["']/i.test(a))) hits.push({ index: m.index, id: Number(id), cls, tagLength: m[0].length });
  }
  return hits.map((h, idx) => ({ id: h.id, cls: h.cls, html: src.slice(h.index + h.tagLength, hits[idx + 1]?.index ?? src.length) }));
}
function normalizeCourseContents(data, courseId, meta = null) {
  const rawSections = Array.isArray(data) ? data : (Array.isArray(data?.sections) ? data.sections : null);
  if (!rawSections) return null;
  const sections = rawSections.map((sec, i) => {
    const modules = Array.isArray(sec?.modules) ? sec.modules : (Array.isArray(sec?.activities) ? sec.activities : []);
    return {
      id: Number(sec?.id || sec?.sectionid || i + 1),
      name: textOnly(sec?.name || sec?.title || sec?.displayname || `Раздел ${i + 1}`),
      summary: textOnly(sec?.summary || sec?.description || ''),
      summaryformat: Number(sec?.summaryformat ?? 1),
      visible: sec?.visible !== false,
      uservisible: sec?.uservisible !== false,
      hiddenbynumsections: Boolean(sec?.hiddenbynumsections),
      availabilityinfo: textOnly(sec?.availabilityinfo || ''),
      sectionnumber: Number(sec?.section || sec?.sectionnumber || i),
      activities: modules.map((m, j) => {
        const type = textOnly(m?.modname || m?.type || m?.module || 'activity') || 'activity';
        const contents = Array.isArray(m?.contents) ? m.contents.map((f, k) => ({
          type: textOnly(f?.type || 'file') || 'file',
          filename: textOnly(f?.filename || ''),
          filepath: f?.filepath ?? '',
          filesize: Number(f?.filesize || 0) || 0,
          fileurl: decodeHtml(f?.fileurl || f?.url || ''),
          content: typeof f?.content === 'string' ? f.content : '',
          sortorder: Number(f?.sortorder ?? k),
          mimetype: textOnly(f?.mimetype || '')
        })) : [];
        return {
          id: Number(m?.id || m?.cmid || m?.coursemodule || j + 1),
          cmid: Number(m?.id || m?.cmid || m?.coursemodule || j + 1),
          instance: Number(m?.instance || m?.instanceid || 0) || null,
          type,
          name: textOnly(m?.name || m?.displayname || `Активность ${j + 1}`),
          url: decodeHtml(m?.url || m?.viewurl || ''),
          description: textOnly(m?.description || m?.intro || ''),
          descriptionformat: Number(m?.descriptionformat ?? m?.introformat ?? 1),
          visible: m?.visible !== false,
          uservisible: m?.uservisible !== false,
          availabilityinfo: textOnly(m?.availabilityinfo || ''),
          availability: m?.availability ?? null,
          completion: m?.completion ?? null,
          completionexpected: m?.completionexpected ?? null,
          completionstatus: textOnly(m?.completionstatus || ''),
          indent: Number(m?.indent || 0) || 0,
          iconurl: decodeHtml(m?.iconurl || ''),
          modicon: decodeHtml(m?.modicon || ''),
          modplural: textOnly(m?.modplural || ''),
          onclick: textOnly(m?.onclick || ''),
          contents,
          dates: Array.isArray(m?.dates) ? m.dates.map(d => ({ ...d, label: textOnly(d?.label || ''), timestamp: Number(d?.timestamp || 0) || 0 })) : [],
          afterlink: textOnly(m?.afterlink || ''),
          customdata: m?.customdata ?? null
        };
      }).filter(a => a.name || a.url || a.contents.length)
    };
  });
  return {
    id: Number(courseId),
    title: textOnly(meta?.fullnamedisplay || meta?.fullname || meta?.displayname || `Курс ${courseId}`),
    description: textOnly(meta?.summary || meta?.description || ''),
    descriptionformat: Number(meta?.summaryformat ?? 1),
    courseimage: meta?.courseimage || null,
    teachers: Array.isArray(meta?.teachers) ? meta.teachers : [],
    progress: meta?.progress ?? null,
    hasprogress: Boolean(meta?.hasprogress),
    visible: meta?.visible !== false,
    sections
  };
}
export function parseActivityLinks(html, courseId) {
  const source =
    String(html || '');

  const out = [];
  const seen = new Set();

  const cleanFileName = value =>
    decodeHtml(
      String(value || '')
    )
      .replace(/^.*\//, '')
      .split('?')[0]
      .trim();

  const extractFiles = chunk => {
    const files = [];
    const fileSeen = new Set();

    for(
      const match of String(chunk || '').matchAll(
        /(?:href|src)=["']([^"']*(?:\/pluginfile\.php|\/webservice\/pluginfile\.php|\/tokenpluginfile\.php)[^"']*)["']/gi
      )
    ){

      const fileurl =
        decodeHtml(
          match[1] || ''
        );

      if(
        !fileurl ||
        fileSeen.has(fileurl)
      ){
        continue;
      }

      const filename =
        cleanFileName(
          fileurl
        ) ||
        'Файл';

      files.push({
        type:'file',
        filename,
        filepath:'/',
        filesize:0,
        fileurl,
        content:'',
        sortorder:files.length,
        mimetype:''
      });

      fileSeen.add(
        fileurl
      );
    }

    return files;
  };

  /*
   * IMPORTANT:
   *
   * We NEVER collect pluginfile links from an arbitrary
   * neighbourhood around an activity.
   *
   * We first isolate each real Moodle activity block.
   * Therefore Lecture #2 cannot inherit files from Lecture #1,
   * Pandas, Numpy or the next activity.
   */
  const blocks =
    activityBlocks(
      source
    );

  for(
    const block of blocks
  ){

    if(
      !block?.id ||
      seen.has(
        Number(block.id)
      )
    ){
      continue;
    }

    const chunk =
      String(
        block.html || ''
      );

    const href =
      chunk.match(
        /<a\b[^>]*href=["']([^"']*\/mod\/([a-z0-9_]+)\/view\.php\?[^"']*?\bid=(\d+)[^"']*)["'][^>]*>/i
      );

    const fallbackHref =
      chunk.match(
        /<a\b[^>]*href=["']([^"']+)["']/i
      );

    const hrefValue =
      href?.[1] ||
      fallbackHref?.[1] ||
      '';

    const type =
      (
        href?.[2] ||
        block.cls?.match(
          /\bmodtype_([a-z0-9_]+)\b/i
        )?.[1] ||
        'activity'
      )
        .toLowerCase();

    const cmid =
      Number(
        href?.[3] ||
        block.id ||
        0
      );

    if(!cmid){
      continue;
    }

    const label =
      textOnly(
        chunk.match(
          /<span[^>]+class=["'][^"']*instancename[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
        )?.[1] ||
        chunk.match(
          /<a\b[^>]*>([\s\S]*?)<\/a>/i
        )?.[1] ||
        ''
      )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    const name =
      label ||
      `${type} ${cmid}`;

    const contents =
      extractFiles(
        chunk
      );

    out.push({
      id:cmid,
      cmid,
      instance:null,

      type,

      name,

      url:
        decodeHtml(
          hrefValue
        ),

      description:'',

      visible:true,
      uservisible:true,

      contents
    });

    seen.add(
      cmid
    );
  }

  /*
   * If the HTML theme is too unusual for activityBlocks(),
   * still preserve activity discovery, BUT DO NOT ATTACH
   * arbitrary nearby pluginfile links.
   *
   * This fallback creates activity records with empty
   * contents. An opened activity can later resolve its own
   * files from its dedicated page.
   */
  if(!out.length){

    for(
      const m of source.matchAll(
        /<a\b[^>]*href=["']([^"']*\/mod\/([a-z0-9_]+)\/view\.php\?[^"']*?\bid=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    ){

      const hrefValue =
        decodeHtml(
          m[1]
        );

      const type =
        String(
          m[2] ||
          'activity'
        ).toLowerCase();

      const cmid =
        Number(
          m[3] ||
          0
        );

      if(
        !cmid ||
        seen.has(cmid)
      ){
        continue;
      }

      const name =
        textOnly(
          m[4]
        )
          .replace(
            /\s+/g,
            ' '
          )
          .trim();

      if(!name){
        continue;
      }

      out.push({
        id:cmid,
        cmid,
        instance:null,
        type,
        name,
        url:hrefValue,
        description:'',
        visible:true,
        uservisible:true,
        contents:[]
      });

      seen.add(
        cmid
      );
    }
  }

  return out;
}


function parseCourse(html, courseId, baseUrl = CAMPUS_ORIGIN) {
  const source = String(html || '');
  const h1 = textOnly(source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const title = (h1 || textOnly(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''))
    .replace(/^Курс:\s*/i, '')
    .trim();

  const sections = [];

  for (const sec of sectionBlocks(source)) {
    const name =
      textOnly(
        sec.html.match(
          /<h[23][^>]*class=["'][^"']*sectionname[^"']*["'][^>]*>([\s\S]*?)<\/h[23]>/i
        )?.[1] || ''
      ) || `Раздел ${sections.length + 1}`;

    const activities = [];

    for (const a of activityBlocks(sec.html)) {
      const href =
        decodeHtml(a.html.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1] || '');

      const rawName =
        textOnly(
          a.html.match(
            /<span[^>]+class=["'][^"']*instancename[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
          )?.[1] || ''
        );

      const label = rawName || textOnly(a.html).slice(0, 220);

      const type =
        a.cls.match(/\bmodtype_([a-z0-9_]+)/i)?.[1] || 'activity';

      const description = textOnly(
        a.html.match(
          /<div[^>]+class=["'][^"']*(?:activityinstance|contentafterlink)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        )?.[1] || ''
      ).slice(0, 500);

      const contents = [];

      for (const fm of a.html.matchAll(
        /(?:href|src)=["']([^"']*(?:\/pluginfile\.php|\/webservice\/pluginfile\.php|\/tokenpluginfile\.php)[^"']*)["']/gi
      )) {
        const fileurl = decodeHtml(fm[1]);

        if (!contents.some(f => f.fileurl === fileurl)) {
          contents.push({
            type: 'file',
            filename: decodeURIComponent(
              fileurl.split('/').pop()?.split('?')[0] || ''
            ),
            filepath: '/',
            filesize: 0,
            fileurl,
            content: '',
            sortorder: contents.length,
            mimetype: ''
          });
        }
      }

      if (label) {
        activities.push({
          id: a.id,
          cmid: a.id,
          instance: null,
          type,
          name: label.replace(
            /\s+(?:Гиперссылка|Файл|Задание|Тест|Форум|Страница|Ресурс)$/i,
            ''
          ),
          url: href,
          description,
          visible: true,
          uservisible: true,
          contents
        });
      }
    }

    sections.push({
      id: sec.id,
      name,
      activities
    });
  }

  const directActivities = parseActivityLinks(source, courseId);

  const existing = new Set(
    sections.flatMap(sec => (sec.activities || []).map(a => Number(a.cmid || a.id)))
  );

  for (const activity of directActivities) {
    if (!existing.has(Number(activity.cmid || activity.id))) {
      let target = sections[0];

      if (!target) {
        target = {
          id: 0,
          name: 'Содержание курса',
          activities: []
        };
        sections.push(target);
      }

      target.activities.push(activity);
      existing.add(Number(activity.cmid || activity.id));
    }
  }

  const summary = textOnly(
    source.match(
      /<div[^>]+id=["']intro["'][^>]*>([\s\S]*?)<\/div>/i
    )?.[1] ||
    source.match(
      /<div[^>]+class=["'][^"']*(?:course-summary|summary)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    )?.[1] ||
    ''
  );

  const courseimage =
    decodeHtml(
      source.match(
        /<img[^>]+src=["']([^"']+course\/overviewfiles[^"']+)["']/i
      )?.[1] || ''
    ) || null;

  const teachers = [];
  const teacherSeen = new Set();

  for (const m of source.matchAll(
    /<a\b[^>]+href=["']([^"']*\/user\/profile\.php\?id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const id = Number(m[2]);
    const name = textOnly(m[3]);

    if (
      id &&
      name &&
      !teacherSeen.has(id)
    ) {
      teacherSeen.add(id);
      teachers.push({
        id,
        fullname: name,
        url: decodeHtml(m[1])
      });
    }
  }

  return {
    id: Number(courseId),
    title: title || `Курс ${courseId}`,
    description: summary,
    courseimage,
    teachers,
    sections
  };
}

function firstFileLink(html) {
  for (const m of String(html || '').matchAll(/(?:href|src)=["']([^"']*(?:\/pluginfile\.php|\/webservice\/pluginfile\.php|\/tokenpluginfile\.php)[^"']*)["']/gi)) {
    const href = decodeHtml(m[1]); if (href) return href;
  }
  return null;
}
function extractFilename(contentDisposition = '', fallback = 'campus-file') {
  const m = String(contentDisposition).match(/filename\*=UTF-8''([^;]+)|filename="?([^;\"]+)/i);
  try { return decodeURIComponent(m?.[1] || m?.[2] || fallback).trim() || fallback; }
  catch { return (m?.[1] || m?.[2] || fallback).trim() || fallback; }
}
function isBinaryContent(contentType = '', contentDisposition = '') {
  return /application\/(?:pdf|zip|x-7z-compressed|x-rar-compressed|msword|vnd\.|octet-stream)|application\/x-download|audio\/|video\//i.test(contentType) || /attachment/i.test(contentDisposition);
}
function rewriteInternalUrl(raw, basePath = '/', baseUrl = CAMPUS_ORIGIN) {
  const source = decodeHtml(raw || '');
  if (!source || source.startsWith('#') || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(source)) return source;
  try {
    const u = new URL(source, baseUrl + basePath);
    if (u.hostname !== new URL(baseUrl).hostname) return source;
    return INTERNAL_PREFIX + u.pathname + u.search + u.hash;
  } catch { return source; }
}
function extractMain(html) {
  const source = String(html || '');
  const region = source.match(/<section[^>]+id=["']region-main["'][^>]*>([\s\S]*?)<\/section>/i);
  if (region?.[1]) return region[1];
  const main = source.match(/<div[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/div>/i);
  return main?.[1] || source;
}
export function sanitizeCampusHtml(html, basePath = '/', baseUrl = CAMPUS_ORIGIN) {
  const source = String(html || '');

  const isQuizPage =
    /\/mod\/quiz\/(?:attempt|review)\.php(?:\?|$)/i.test(
      String(basePath || '')
    );

  let out = (
    isQuizPage
      ? source
      : extractMain(source)
  )
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(
      isQuizPage
        ? /<(header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi
        : /<(header|footer|nav|aside)\b[^>]*>[\s\S]*?<\/\1>/gi
    )
    .replace(/<(div|section)\b[^>]*class=["'][^"']*(?:navbar|breadcrumb|block-region|sidebar|side-pre|page-header|notifications)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/\s(?:on\w+)=["'][^"']*["']/gi, '');
  out = out.replace(/\b(?:src|href|action)=["']([^"']+)["']/gi, (m, v) => {
    const attrName = m.match(/^(?:[^=\s]+)=/)?.[0]?.slice(0, -1) || 'href';
    const rewritten = rewriteInternalUrl(v, basePath, baseUrl);
    return `${attrName}="${rewritten.replace(/"/g, '&quot;')}"`;
  });
  out = out.replace(/<form\b/gi, '<form data-nova-form="1"');
  out = out.replace(/Кубанский филиал/gi, 'Краснодарский филиал').replace(/Кубанского филиала/gi, 'Краснодарского филиала');
  return out;
}
function parsePage(html, pathValue, baseUrl = CAMPUS_ORIGIN) {
  const source = String(html || '');
  const title = textOnly(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || 'Campus').replace(/^.*?:\s*/, '').trim();
  const downloadPath = /^\/mod\/resource\/view\.php/i.test(pathValue) ? firstFileLink(source) : null;
  return { title: title || 'Campus', path: pathValue, kind: downloadPath ? 'resource' : 'html', downloadPath, html: sanitizeCampusHtml(source, pathValue, baseUrl) };
}
function detectHtmlRedirect(html) {
  const source = String(html || '');
  const meta = source.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"']+)["']/i);
  if (meta?.[1]) return decodeHtml(meta[1].trim());
  const js = source.match(/(?:window\.location|document\.location|location(?:\.href|\.replace)?)\s*(?:=|\()\s*["']([^"']+)["']/i);
  if (js?.[1]) return decodeHtml(js[1].trim());
  const continueLink = source.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*(?:Продолжить|Continue)\s*<\/a>/i);
  if (continueLink?.[1] && /перенаправ|переадрес|redirect|continue/i.test(textOnly(source).slice(0, 14000))) return decodeHtml(continueLink[1].trim());
  return null;
}

function parseOverviewCourses(html, baseUrl = CAMPUS_ORIGIN) {
  const src = String(html || ''); const out = new Map();
  for (const m of src.matchAll(/<a\b[^>]*href=["']([^"']*\/course\/view\.php\?id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const id = Number(m[2]); if (!id || out.has(id)) continue;
    const title = textOnly(m[3]); if (!title || /личный кабинет|все курсы|филиалы|кафедра/i.test(title)) continue;
    const parent = src.slice(Math.max(0, m.index - 2200), Math.min(src.length, m.index + 5200));
    const img = parent.match(/<img[^>]+src=["']([^"']+course\/overviewfiles[^"']+)["']/i)?.[1] || null;
    const prog = parent.match(/(\d{1,3})\s*%/);
    out.set(id, { id, fullname: title, fullnamedisplay: title, shortname: title, summary: '', visible: true, hasprogress: Boolean(prog), progress: prog ? Number(prog[1]) : null, isfavourite: false, hidden: false, courseimage: decodeHtml(img || '') || null, viewurl: `${baseUrl}/course/view.php?id=${id}` });
  }
  return [...out.values()];
}

class CampusError extends Error {
  constructor(message, { code = 'CAMPUS_ERROR', status = null, retryable = false, cause = null } = {}) {
    super(message, { cause });
    this.name = 'CampusError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_ATTEMPTS = 3;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function retryDelay(headers, attempt) {
  const value = Number(headers?.get?.('retry-after'));
  if (Number.isFinite(value) && value >= 0) return Math.min(value * 1000, 8000);
  return Math.min(350 * (2 ** attempt) + Math.round(Math.random() * 120), 5000);
}
function retryableRequest(method, target) {
  const safeMethod = method === 'GET' || method === 'HEAD';
  const endpoint = new URL(target, CAMPUS_ORIGIN).pathname;
  return safeMethod || endpoint === '/lib/ajax/service.php' || endpoint === '/webservice/rest/server.php';
}
function authExpired(message = 'Сессия Campus истекла. Подключите Campus заново.', status = 401) {
  return new CampusError(message, { code: 'AUTH_EXPIRED', status });
}
function apiFailure(message, status = null, cause = null) {
  return new CampusError(message, { code: 'CAMPUS_ERROR', status, cause });
}

export class CampusSession {
  constructor({ baseUrl = CAMPUS_ORIGIN, scopeId = undefined, debug = process.env.DEBUG_CAMPUS === 'true' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.sessionManager = new SessionManager({ scopeId });
    this.contracts = new ContractRegistry();
    this.trace = new OperationTrace({ enabled: debug });
    this.activityRegistry = new ActivityRegistry();
    this.activityIndex = new ActivityIndex({ scopeId: this.sessionManager.scopeId });
    this.courseGraph = new CourseGraph({ scopeId: this.sessionManager.scopeId, registry: this.activityRegistry, index: this.activityIndex, trace: this.trace });
    this.transport = new CampusTransport({ baseUrl: this.baseUrl, session: this.sessionManager, contracts: this.contracts, trace: this.trace });
    this.formService = new FormService({ session: this, trace: this.trace });
    this.fileService = new FileService({ session: this, trace: this.trace });
    this.activityEngine = new ActivityEngine({ registry: this.activityRegistry, index: this.activityIndex, session: this, trace: this.trace, fileService: this.fileService, formService: this.formService });
    // New domain-facing facade. Legacy CampusSession APIs remain available.
    this.adapter = new CampusAdapter({ campus: this });
  }

  get jar() { return this.sessionManager.jar; }
  set jar(value) { this.sessionManager.replaceCookies(value); }
  get sesskey() { return this.sessionManager.sesskey; }
  set sesskey(value) { this.sessionManager.sesskey = value; }
  get contextid() { return this.sessionManager.contextid; }
  set contextid(value) { this.sessionManager.contextid = value; }
  get userid() { return this.sessionManager.userid; }
  set userid(value) { this.sessionManager.userid = value; }
  get user() { return this.sessionManager.user; }
  set user(value) { this.sessionManager.user = value; }
  get token() { return this.sessionManager.token; }
  set token(value) { this.sessionManager.token = value; }
  get lastSeen() { return this.sessionManager.lastSeen; }
  set lastSeen(value) { this.sessionManager.lastSeen = value; }
  get cache() { return this.sessionManager.cache; }
  get inflight() { return this.sessionManager.inflight; }
  get sessionController() { return this.sessionManager.sessionController; }

  setSessionScope(scopeId) { const next = String(scopeId || this.sessionManager.scopeId); this.sessionManager.scopeId = next; this.activityIndex.setScope(next); this.courseGraph.setScope(next); return this; }
  setRecoveryHandler(handler) { this.sessionManager.setRecoveryHandler(handler); return this; }
  async refreshWebSession() { return this.sessionManager.refreshWebSession(); }
  safeSessionSnapshot() { return this.sessionManager.safeSnapshot(); }
  getActivityRegistry() { return this.activityRegistry; }
  getActivityIndex() { return this.activityIndex; }
  getCourseGraph() { return this.courseGraph; }
  getCourseGraphSnapshot() { return this.courseGraph.snapshot(); }
  getActivityEngine() { return this.activityEngine; }
  getFileService() { return this.fileService; }
  getFormService() { return this.formService; }
  getAdapter() { return this.adapter; }

  _singleFlight(key, fn) { return this.sessionManager.singleFlight(key, fn); }

  invalidate(reason = 'Сессия Campus истекла. Подключите Campus заново.') { this.sessionManager.invalidate(reason); this.courseGraph.clear(); }
  invalidateWebSession() { this.sessionManager.invalidateWebSession(); }

  async request(pathOrUrl, options = {}) {
    return this.transport.request(pathOrUrl, options);
  }

  async executeOperation(operation, context = {}, params = {}, options = {}) {
    return this.adapter.execute(operation, context, params, options);
  }
  async executeActivity(ref, action, payload = {}, options = {}) {
    return this.activityEngine.execute(ref, action, payload, options);
  }
  async get(path) { return this.request(path, { method: 'GET' }); }
  async requestPage(path, maxRedirects = 8) {
    let current = pathOnly(path, this.baseUrl);
    for (let i = 0; i <= maxRedirects; i++) {
      const r = await this.request(current, { method: 'GET', redirect: 'manual' }); const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) { const next = pathOnly(loc, this.baseUrl); if (next === current) return { response: r, path: current }; if (/^\/login\/index\.php/i.test(next) && !/^\/login\/index\.php/i.test(current)) return { response: r, path: next }; current = next; continue; }
      // Moodle may contain client-side location code inside normal HTML/JS.
      // Treat HTTP Location redirects as navigation redirects, but do not
      // follow arbitrary meta-refresh/window.location snippets from the page.
      return { response: r, path: current };
    }
    throw new Error('Campus вернул слишком много перенаправлений.');
  }
  async obtainServiceToken(username, password) {
    const preservedWebCookies = new Map([...this.jar.entries()].filter(([k]) => /^(?:MoodleSession|session-cookie)/i.test(String(k))));
    const body = new URLSearchParams({ username, password, service: 'moodle_mobile_app' });
    const r = await this.request('/login/token.php', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString(), redirect: 'follow', traceOperation: 'auth.token.login', transport: 'WEB_FORM', traceParams: { username: '[REDACTED]' } });
    const data = await r.json().catch(() => null);
    if (!data?.token) throw new Error(data?.error || data?.errorcode || 'Web Service token не выдан.');
    this.token = data.token;
    // A token request can itself emit a MoodleSession cookie on some deployments.
    // Never let that secondary cookie replace the browser web session we already own.
    for (const [k, v] of preservedWebCookies) this.jar.set(k, v);
    const info = await this.rest('core_webservice_get_site_info', {});
    if (!info?.userid) throw new Error('Campus выдал токен без данных пользователя.');
    this.userid = Number(info.userid);
    this.user = { id: this.userid, fullname: info.fullname || username, email: info.useremail || null };
    return { ok: true, user: this.user };
  }
  async tryTokenLogin(username, password) {
    try { await this.obtainServiceToken(username, password); } catch (e) { return { ok: false, error: e?.message || 'Web Service token не выдан' }; }

    // Some Moodle deployments issue a web-capable session cookie under a
    // non-standard name (the Campus here can emit `session-cookie`). Bootstrap
    // only after an authenticated token flow has produced a possible web cookie.
    if (hasWebCookie(this.jar)) {
      try {
        const page = await this.request('/my/', { method: 'GET', redirect: 'manual', traceOperation: 'auth.bootstrapWebSession', transport: 'WEB_FORM' });
        const contentType = page.headers.get('content-type') || '';
        if (/text\/html|application\/xhtml\+xml/i.test(contentType)) {
          const html = await page.text();
          if (!isLoginHtml(html)) {
            const cfg = parseConfig(html);
            if (cfg.sesskey || cfg.userid) {
              this.sessionManager.bindWebContext({ sesskey: cfg.sesskey, contextid: cfg.contextid, userid: cfg.userid || this.userid, user: parseUser(html, cfg.userid || this.userid) || this.user, cookieNames: [...this.jar.keys()] });
            }
          }
        }
      } catch (e) {
        this.cache.set('webSessionBootstrapError', String(e?.message || e));
      }
    }

    return { ok: true, mode: this.sesskey ? 'token+session' : 'token' };
  }
  async bootstrapWebContext(seedPath = '/my/', { maxPages = 4 } = {}) {
    const candidates = [seedPath];
    const userId = this.userid || extractTestSessionId(seedPath, this.baseUrl);
    if (userId) candidates.push(`/user/profile.php?id=${encodeURIComponent(userId)}`);
    candidates.push('/course/index.php', '/');
    const seen = new Set();
    for (const candidate of candidates) {
      const normalized = pathOnly(candidate, this.baseUrl);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      try {
        const page = await this.request(normalized, { method: 'GET', redirect: 'manual', traceOperation: 'auth.bootstrapWebSession', transport: 'WEB_FORM' });
        const ct = page.headers.get('content-type') || '';
        if (!/text\/html|application\/xhtml\+xml/i.test(ct)) continue;
        const html = await page.text();
        if (isLoginHtml(html) && !hasWebCookie(this.jar)) continue;
        const cfg = parseConfig(html);
        const detectedUserId = cfg.userid || userId || this.userid || null;
        const detectedUser = parseUser(html, detectedUserId);
        if (cfg.sesskey || detectedUserId || hasMoodleSessionCookie(this.jar)) {
          this.sessionManager.bindWebContext({ sesskey: cfg.sesskey, contextid: cfg.contextid, userid: detectedUserId, user: detectedUser || this.user, cookieNames: [...this.jar.keys()] });
        }
        if (this.sesskey && hasWebCookie(this.jar)) return { ok: true, path: normalized, html, cfg };
      } catch (error) {
        this.cache.set('webSessionBootstrapError', String(error?.message || error));
      }
    }
    return { ok: false, path: null, html: null, cfg: null };
  }

  async tryFormLogin(username, password) {
    const page = await this.get('/login/index.php');
    const html = await page.text();
    const form = loginForm(html);
    const body = new URLSearchParams({ ...form.hidden, username, password });
    if (form.submit?.name) body.set(form.submit.name, form.submit.value || 'Вход');
    const action = new URL(form.action, this.baseUrl).toString();
    const r = await this.request(action, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', referer: `${this.baseUrl}/login/index.php`, origin: this.baseUrl },
      body: body.toString(),
      redirect: 'manual',
      traceOperation: 'auth.form.login',
      transport: 'WEB_FORM',
      traceParams: { username: '[REDACTED]', submit: form.submit?.name || null }
    });

    // Campus uses a two-step testsession redirect. Keep the Moodle cookie
    // produced by the POST and follow the redirect without switching auth modes.
    let followPath = r.headers.get('location') || '/my/';
    const testsessionId = extractTestSessionId(followPath, this.baseUrl);
    if (testsessionId && !this.userid) this.userid = testsessionId;
    const follow = await this.requestPage(followPath, 8);
    const verifyHtml = await follow.response.text();
    const cfg = parseConfig(verifyHtml);
    const detectedUserId = cfg.userid || extractTestSessionId(followPath, this.baseUrl) || this.userid || null;
    const detectedUser = parseUser(verifyHtml, detectedUserId);
    const authenticated = looksAuthenticatedPage(follow.path, follow.response.status, verifyHtml) || (follow.path.startsWith('/my/') && follow.response.status >= 200 && follow.response.status < 300 && hasWebCookie(this.jar));

    if (!authenticated || !hasWebCookie(this.jar)) {
      throw new Error('Campus не подтвердил авторизованный веб-контекст после входа.');
    }

    this.sessionManager.bindWebContext({ sesskey: cfg.sesskey, contextid: cfg.contextid, userid: detectedUserId, user: detectedUser || this.user, cookieNames: [...this.jar.keys()] });
    if (this.trace?.enabled) {
      console.debug('[CampusAuth:form.verify]', JSON.stringify({
        status: follow.response.status,
        path: follow.path,
        sesskeyFound: Boolean(cfg.sesskey),
        contextIdFound: Boolean(cfg.contextid),
        userIdFound: Boolean(detectedUserId),
        hasWebCookie: hasWebCookie(this.jar),
        cookieNames: [...this.jar.keys()]
      }));
    }

    if (!this.sesskey) {
      const boot = await this.bootstrapWebContext(follow.path, { maxPages: 4 });
      if (boot.ok) return { ok: true, mode: 'session' };
    }

    if (!this.sesskey || !hasWebCookie(this.jar)) {
      const err = new Error(`Campus веб-сессия создана, но sesskey не удалось получить (sesskey=${Boolean(this.sesskey)}, moodleCookie=${hasMoodleSessionCookie(this.jar)}).`);
      err.code = 'WEB_SESSION_UNAVAILABLE';
      throw err;
    }
    return { ok: true, mode: 'session' };
  }
  async login(username, password) {
    this.invalidate();
    let formError = null;
    try {
      const result = await this.tryFormLogin(username, password);
      this.cache.delete('authWarning');

      // Do not make the user wait for the optional REST capability.
      // The web session is already authenticated and can serve the UI.
      // Obtain the token in the background so later read-only requests
      // can transparently switch to REST when it becomes available.
      if (!this.token) {
        void this.obtainServiceToken(username, password)
          .catch(e => {
            this.cache.set(
              'tokenCapabilityWarning',
              String(e?.message || e)
            );
          });
      }

      return {
        user: this.user,
        token: Boolean(this.token),
        session: true,
        mode: result.mode
      };
    } catch (e) {
      formError = e;
      if (this.trace?.enabled) {
        console.debug('[CampusAuth:form.failure]', JSON.stringify({
          code: e?.code || null,
          message: String(e?.message || e),
          cookieNames: [...this.jar.keys()],
          hasWebCookie: hasWebCookie(this.jar),
          hasSesskey: Boolean(this.sesskey),
          hasUserId: Boolean(this.userid)
        }));
      }
      // Do one last web-session bootstrap before falling back.
      try {
        const boot = await this.bootstrapWebContext('/my/', { maxPages: 4 });
        if (boot.ok) return { user: this.user, token: Boolean(this.token), session: true, mode: 'session' };
      } catch {}

      // The web session may be unavailable on a particular Campus deployment.
      // Token login is a real authenticated Campus capability and is used for
      // read-only data. State-changing web-form actions remain guarded by the
      // Moodle web-session capability.
      try {
        const tokenResult = await this.tryTokenLogin(username, password);
        if (tokenResult?.ok) {
          this.cache.set('authWarning', 'Веб-сессия Campus недоступна; чтение работает через защищённый Campus Web Service.');
          return { user: this.user, token: true, session: Boolean(this.sesskey), mode: this.sesskey ? 'token+session' : 'token' };
        }
      } catch (tokenError) {
        this.cache.set('tokenFallbackError', String(tokenError?.message || tokenError));
      }

      this.invalidate();
      throw formError || new Error('Не удалось авторизоваться в Campus.');
    }
  }
  async rest(methodname, args = {}) {
    if (!this.token) throw new Error('REST token отсутствует.');
    const qs = new URLSearchParams({ wstoken: this.token, moodlewsrestformat: 'json', wsfunction: methodname });
    for (const [k, v] of Object.entries(args)) appendRestParam(qs, k, v);
    const r = await this.request(`/webservice/rest/server.php?${qs.toString()}`, { method: 'GET', headers: { accept: 'application/json' }, redirect: 'follow' });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data || data.exception || data.errorcode) {
      const code = data?.errorcode || data?.exception?.errorcode;
      if (/invalidtoken/i.test(String(code || ''))) this.token = null;
      if (/requirelogin|session/i.test(String(code || ''))) this.invalidateWebSession();
      throw apiFailure(data?.message || data?.error || data?.exception?.message || data?.errorcode || `Campus REST ${r.status}`, r.status || null);
    }
    return data;
  }
  async ajax(methods) {
    if (!this.sesskey) throw new CampusTransportError('Требуется веб-сессия Campus для AJAX-операции.', { code: 'SESSKEY_REQUIRED', phase: 'CONTRACT' });
    const info = methods.map(m => m.methodname).join(',');
    const r = await this.request(`/lib/ajax/service.php?sesskey=${encodeURIComponent(this.sesskey)}&info=${encodeURIComponent(info)}`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'XMLHttpRequest', referer: `${this.baseUrl}/my/`, origin: this.baseUrl },
      body: JSON.stringify(methods), traceOperation: `ajax.batch:${info}`, traceParams: methods.map(m => ({ methodname: m.methodname, args: m.args })),
      traceBodyShape: { kind: 'ajax-batch', operations: methods.map(m => m.methodname), argumentKeys: methods.map(m => Object.keys(m.args || {})) },
      retryable: methods.every(m => this.contracts.resolveMoodleOperation(m.methodname)?.retryPolicy?.idempotent === true),
      retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: methods.every(m => this.contracts.resolveMoodleOperation(m.methodname)?.retryPolicy?.idempotent === true) },
      transport: 'AJAX',
    });
    const responseText = await r.text();
    let data;
    try { data = JSON.parse(responseText); } catch {
      if (isLoginHtml(responseText)) {
        this.invalidate();
        throw authExpired();
      }
      throw apiFailure(`Campus AJAX вернул некорректный ответ (${r.status}).`, r.status);
    }
    if (!Array.isArray(data)) throw apiFailure('Campus AJAX вернул неожиданный формат данных.', r.status);
    for (const item of data) {
      if (!item?.error) continue;
      const code = item.exception?.errorcode || item.errorcode || '';
      const message = item.exception?.message || item.message || 'Campus AJAX error';
      if (/invalidsesskey/i.test(String(code))) {
        this.invalidateWebSession();
        throw authExpired(message);
      }
      if (/requirelogin|session/i.test(String(code)) || /сесси|must be logged in|login/i.test(String(message))) {
        this.invalidateWebSession();
        throw authExpired(message);
      }
      throw apiFailure(message, r.status);
    }
    return data;
  }
  cacheGet(key, ttl = 15000) {
    const x = this.cache.get(key);
    return x && x.t != null && Date.now() - x.t < ttl ? x.v : null;
  }
  cacheSet(key, value) { this.cache.set(key, { t: Date.now(), v: value }); return value; }

  async courses() {
    const cached = this.cacheGet('courses', 120000);
    if (cached !== null) return cached;
    return this._singleFlight('courses', async () => {
      const again = this.cacheGet('courses', 120000);
      if (again !== null) return again;
      let readError = null;
      const args = { offset: 0, limit: 0, classification: 'allincludinghidden', sort: 'ul.timeaccess desc', customfieldname: 'groups_name', customfieldvalue: '' };
      if (this.token) {
        try {
          const data = await this.rest('core_course_get_enrolled_courses_by_timeline_classification', args);
          const courses = Array.isArray(data?.courses) ? data.courses : (Array.isArray(data) ? data : null);
          if (courses) { this.cache.set('coursesSource', 'rest'); return this.cacheSet('courses', courses); }
        } catch (e) { readError = e; }
      }
      if (this.sesskey) {
        try {
          const out = await this.ajax([{ index: 0, methodname: 'core_course_get_enrolled_courses_by_timeline_classification', args }]);
          const payload = out[0]?.data;
          const courses = Array.isArray(payload?.courses) ? payload.courses : (Array.isArray(payload) ? payload : null);
          if (courses) { this.cache.set('coursesSource', 'ajax'); return this.cacheSet('courses', courses); }
        } catch (e) { readError = readError || e; }
      }
      try {
        const page = await this.requestPage('/my/');
        const html = await page.response.text();
        if (isLoginHtml(html)) throw authExpired();
        const fallback = parseOverviewCourses(html, this.baseUrl);
        if (fallback.length) return this.cacheSet('courses', fallback);
        throw new Error('Campus не вернул список курсов.');
      } catch (e) {
        if (e?.code === 'AUTH_EXPIRED') throw e;
        throw readError || e;
      }
    });
  }

  async calendar({ year, month, courseid = 1, day = 1, mini = true, includenavigation = true } = {}) {
    const now = new Date(); year = Number(year || now.getFullYear()); month = Number(month || now.getMonth() + 1); day = Number(day || now.getDate());
    const key = `cal:${year}:${month}:${courseid}:${mini}`;
    const cached = this.cacheGet(key, 30000);
    if (cached !== null) return cached;
    return this._singleFlight(key, async () => {
      const again = this.cacheGet(key, 12000);
      if (again !== null) return again;
      const args = { year, month, courseid, categoryid: 0, includenavigation, mini, day };
      let lastError = null;
      if (this.token) {
        try {
          const data = await this.rest('core_calendar_get_calendar_monthly_view', args);
          if (data && typeof data === 'object') return this.cacheSet(key, data);
        } catch (e) { lastError = e; }
      }
      try {
        const out = await this.ajax([{ index: 0, methodname: 'core_calendar_get_calendar_monthly_view', args }]);
        const data = out[0]?.data;
        if (!data || typeof data !== 'object') throw new Error('Campus вернул пустой календарный ответ.');
        return this.cacheSet(key, data);
      } catch (e) { throw lastError || e; }
    });
  }

  async messages() {
    const cached = this.cacheGet('messages', 15000);
    if (cached !== null) return cached;

    return this._singleFlight('messages', async () => {
      const userid = Number(this.userid); const conversations = new Map(); const errors = [];
      const call = async (methodname, args, critical = false) => {
        try {
          if (this.token) return await this.rest(methodname, args);
          return (await this.ajax([{ index: 0, methodname, args }]))?.[0]?.data;
        } catch (e) {
          if (e?.code === 'AUTH_EXPIRED') throw e;
          try {
            if (this.sesskey) return (await this.ajax([{ index: 0, methodname, args }]))?.[0]?.data;
          } catch (retryError) { e = retryError; }
          errors.push({ methodname, message: e.message, critical });
          return null;
        }
      };
      const counts = await call('core_message_get_conversation_counts', { userid });
      const unread = await call('core_message_get_unread_conversation_counts', { userid });
      const primary = await call('core_message_get_conversations', { userid, type: null, limitnum: 51, limitfrom: 0, favourites: true, mergeself: true }, true);
      if (!primary && errors.some(e => e.critical)) throw new Error(errors.find(e => e.critical)?.message || 'Campus не вернул список диалогов.');
      const variants = [
        { type: 1, limitnum: 51, limitfrom: 0, favourites: false, mergeself: true },
        { type: 2, limitnum: 51, limitfrom: 0, favourites: false, mergeself: false }
      ];
      for (const v of variants) { const data = await call('core_message_get_conversations', { userid, ...v }); for (const c of data?.conversations || []) if (c?.id != null) conversations.set(String(c.id), c); }
      for (const c of primary?.conversations || []) if (c?.id != null) conversations.set(String(c.id), c);
      const contactData = await call('core_message_get_user_contacts', { userid, limitnum: 101, limitfrom: 0 });
      const requestData = await call('core_message_get_contact_requests', { userid });
      const list = [...conversations.values()].map(c => ({ ...c, name: c.name || c.members?.find?.(m => String(m.id) !== String(userid))?.fullname || c.members?.[0]?.fullname || 'Диалог' }))
        .sort((a, b) => Number(b.messages?.[0]?.timecreated || 0) - Number(a.messages?.[0]?.timecreated || 0));
      this.cache.set('conversations', list);
      return { conversations: list, counts: counts || {}, unread: unread || {}, contacts: contactData || [], requests: requestData || [], errors, criticalError: null };
    });
  }

  async conversation(id) {
    const cid = Number(id); if (!Number.isInteger(cid) || cid <= 0) throw new Error('Некорректный диалог.');
    return this._singleFlight(`conversation:${cid}`, async () => {
    const cached = (this.cache.get('conversations') || []).find(c => String(c.id) === String(cid));
    try {
      const out = await this.ajax([{ index: 0, methodname: 'core_message_get_conversation', args: { userid: Number(this.userid), conversationid: cid, includecontactrequests: false, includeprivacyinfo: true, memberlimit: 100, memberoffset: 0, messagelimit: 200, messageoffset: 0, newestmessagesfirst: false } }]);
      if (out?.[0]?.data) return out[0].data;
    } catch {}
    const out = await this.ajax([{ index: 0, methodname: 'core_message_get_conversation_messages', args: { currentuserid: Number(this.userid), convid: cid, limitfrom: 0, limitnum: 200, newest: false, timefrom: 0 } }]);
    if (out?.[0]?.data) return { ...(cached || {}), id: cid, messages: out[0].data.messages || out[0].data || [], members: cached?.members || out[0].data.members || [] };
    return cached || null;
    });
  }
  async sendConversationMessage(conversationid, text) {
    const id = Number(conversationid); const message = String(text || '').trim(); if (!Number.isInteger(id) || id <= 0) throw new Error('Некорректный диалог.'); if (!message) throw new Error('Сообщение пустое.');
    const args = { conversationid: id, messages: [{ text: message, textformat: 1 }] };
    if (this.token) return this.rest('core_message_send_messages_to_conversation', args);
    const out = await this.ajax([{ index: 0, methodname: 'core_message_send_messages_to_conversation', args }]); return out?.[0]?.data || [];
  }
  async markConversationRead(conversationid) {
    const id = Number(conversationid); if (!Number.isInteger(id) || id <= 0) return false;
    try { const args = { userid: Number(this.userid), conversationid: id }; if (this.token) await this.rest('core_message_mark_all_conversation_messages_as_read', args); else await this.ajax([{ index: 0, methodname: 'core_message_mark_all_conversation_messages_as_read', args }]); return true; }
    catch (e) { if (e?.code === 'AUTH_EXPIRED') throw e; return false; }
  }
  async profilePage() {
    if (!this.userid) {
      return this.user;
    }

    const cached = this.cacheGet(
      'profile-data',
      60000
    );

    if (cached !== null) {
      return cached;
    }

    return this._singleFlight(
      'profile',
      async () => {
        const again = this.cacheGet(
          'profile-data',
          60000
        );

        if (again !== null) {
          return again;
        }
      if (!this.sesskey && this.token) {
        return this.cacheSet(
          'profile-data',
          {
            ...this.user,
            page: null,
            description: ''
          }
        );
      }
      try {
        const r = await this.get(`/user/profile.php?id=${this.userid}`); const html = await r.text();
        if (isLoginHtml(html)) throw authExpired();
        const full = parseUser(html, this.userid);
        return this.cacheSet(
          'profile-data',
          {
            ...full,
            description:
              textOnly(
                html.match(
                  /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
                )?.[1] || ''
              ),
            page: parsePage(
              html,
              `/user/profile.php?id=${this.userid}`
            )
          }
        );
      } catch (e) {
        if (
          e?.code === 'AUTH_EXPIRED' &&
          this.token &&
          this.user
        ) {
          return this.cacheSet(
            'profile-data',
            {
              ...this.user,
              page: null,
              description: ''
            }
          );
        }
        throw e;
      }
    });
  }
  async page(pathValue) {
    const { response: r, path: finalPath } = await this.requestPage(pathValue, 8); const contentType = r.headers.get('content-type') || ''; const headers = {};
    for (const key of ['content-disposition', 'content-length', 'location']) { const value = r.headers.get(key); if (value) headers[key] = value; }
    if (isBinaryContent(contentType, headers['content-disposition'] || '') || /^application\/pdf/i.test(contentType)) return { status: r.status, contentType, location: headers.location || null, headers, text: '', path: finalPath };
    const buf = Buffer.from(await r.arrayBuffer()); const sniff = buf.subarray(0, 8).toString('latin1');
    if (sniff.startsWith('%PDF-')) return { status: r.status, contentType: 'application/pdf', location: headers.location || null, headers, text: '', path: finalPath };
    const text = buf.toString('utf8');
    if (isLoginHtml(text)) { this.invalidateWebSession(); throw authExpired(); }
    return { status: r.status, contentType, location: headers.location || null, headers, text, path: finalPath };
  }
  async contentPage(pathValue) {
    const p = await this.page(pathValue); if (p.status >= 400) throw new Error(`Campus вернул ${p.status}.`);
    if (isBinaryContent(p.contentType, p.headers?.['content-disposition'] || '') || /^application\/pdf/i.test(p.contentType)) return { kind: 'file', title: extractFilename(p.headers?.['content-disposition'] || '', 'Файл'), path: p.path || pathValue, contentType: p.contentType, filename: extractFilename(p.headers?.['content-disposition'] || '', pathValue.split('/').pop() || 'campus-file') };
    return parsePage(p.text, p.path || pathValue, this.baseUrl);
  }
  _syncCourseGraph(course, source = {}) {
    if (!course) return null;
    try {
      return this.courseGraph.mergeCourse(course, { source, includeRaw: true });
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      this.trace?.stage?.(null, 'GRAPH_ERROR', { message: e.message });
      return null;
    }
  }

  async course(id, { force = false, verify = false } = {}) {
    const courseId = Number(id); if (!Number.isInteger(courseId) || courseId <= 0) throw new Error('Некорректный ID курса.');
    const key = `course:${courseId}`;
    if (force) this.cache.delete(key);
    const cached = this.cacheGet(key, 120000); if (cached !== null) { this._syncCourseGraph(cached); return cached; }
    return this._singleFlight(key, async () => {
      if (force) this.cache.delete(key);
      const again = this.cacheGet(key, 120000); if (again !== null) { this._syncCourseGraph(again); return again; }
      let pageError = null;
      let meta = null;
      try {
        const courses = await this.courses();
        meta = Array.isArray(courses) ? courses.find(c => Number(c.id) === courseId) || null : null;
      } catch (e) { if (e?.code === 'AUTH_EXPIRED' && !this.token) throw e; }

      let restReturned = false;
      let restCourse = null;
      if (this.token) {
        try {
          const data = await this.rest('core_course_get_contents', { courseid: courseId });
          restReturned = true;
          restCourse = normalizeCourseContents(data, courseId, meta);
          // A non-empty response is the normal fast path. An empty array is deliberately NOT final.
          if (restCourse && restCourse.sections.some(sec => (sec.activities || []).length > 0) && !verify) { this._syncCourseGraph(restCourse, { transport: 'WEB_SERVICE', endpoint: '/webservice/rest/server.php', operation: 'core_course_get_contents', parser: 'moodle.ws.course.contents.v1' }); return this.cacheSet(key, restCourse); }
        } catch (e) { pageError = e; }
      }

      if (this.sesskey) {
        try {
          const out = await this.ajax([{ index: 0, methodname: 'core_course_get_contents', args: { courseid: courseId } }]);
          const payload = out?.[0]?.data;
          const ajaxCourse = normalizeCourseContents(payload, courseId, meta);
          if (ajaxCourse && ajaxCourse.sections.some(sec => (sec.activities || []).length > 0)) {
            this._syncCourseGraph(ajaxCourse, { transport: 'AJAX', endpoint: '/lib/ajax/service.php', operation: 'core_course_get_contents', parser: 'moodle.ajax.course.contents.v1' });
            return this.cacheSet(key, ajaxCourse);
          }
        } catch (e) { pageError = pageError || e; }
      }

      try {
        const p = await this.page(`/course/view.php?id=${courseId}`);
        if (isLoginHtml(p.text || '')) throw authExpired();
        if (p.status >= 400) throw new Error(`Campus вернул ${p.status} для курса.`);
        const parsed = parseCourse(p.text || '', courseId, this.baseUrl);
        const final = normalizeCourseContents(parsed.sections, courseId, {
          ...meta,
          fullname: parsed.title,
          summary: parsed.description,
          courseimage: parsed.courseimage || meta?.courseimage || null,
          teachers: parsed.teachers || meta?.teachers || []
        });
        const validCoursePath = !p.path || /\/course\/view\.php(?:\?|$)/i.test(p.path || '');
        if (validCoursePath && final) {
          final.title = parsed.title || meta?.fullnamedisplay || meta?.fullname || `Курс ${courseId}`;
          final.description = parsed.description || textOnly(meta?.summary || '');
          final.courseimage = parsed.courseimage || meta?.courseimage || null;
          final.teachers = parsed.teachers || meta?.teachers || [];
          if (restCourse && restCourse.sections.some(sec => (sec.activities || []).length > 0)) {
            // The REST result is fast and structured, while the classic course HTML is a useful
            // completeness check. Merge only missing sections/activities so one source cannot erase
            // content returned by the other. This path is enabled for an interactive course open.
            const merged = JSON.parse(JSON.stringify(restCourse));
            const sectionKey = sec => `${sec.id}:${textOnly(sec.name).toLowerCase()}`;
            const activityKey = a => `${a.id}:${decodeHtml(a.url || '').toLowerCase()}:${textOnly(a.name).toLowerCase()}`;
            for (const hsec of final.sections || []) {
              let target = merged.sections.find(sec => Number(sec.id) === Number(hsec.id) || (textOnly(sec.name).toLowerCase() === textOnly(hsec.name).toLowerCase() && textOnly(sec.name)));
              if (!target) {
                merged.sections.push(hsec);
                continue;
              }
              const existing = new Set((target.activities || []).map(activityKey));
              for (const hact of hsec.activities || []) {
                const exact = (target.activities || []).find(a => Number(a.id) === Number(hact.id) || (a.url && hact.url && decodeHtml(a.url) === decodeHtml(hact.url)));
                if (exact) {
                  if (!(exact.contents || []).length && (hact.contents || []).length) exact.contents = hact.contents;
                  if (!exact.description && hact.description) exact.description = hact.description;
                  continue;
                }
                if (!existing.has(activityKey(hact))) { target.activities.push(hact); existing.add(activityKey(hact)); }
              }
            }
            this._syncCourseGraph(merged, { transport: 'WEB_FORM', endpoint: `/course/view.php?id=${courseId}`, operation: 'course.view', parser: 'moodle.html.course.v1' });
            return this.cacheSet(key, merged);
          }
          // Keep the real Campus page as a compatibility payload when structured parsing
          // cannot see activities. This prevents a false "course is empty" state.
          if (!final.sections.some(sec => (sec.activities || []).length > 0)) {
            final.contentState = 'native-fallback';
            final.fallback = { type: 'campus-page', url: `/course/view.php?id=${courseId}`, title: final.title };
            final.nativeHtml = sanitizeCampusHtml(p.text || '', `/course/view.php?id=${courseId}`, this.baseUrl);
          } else {
            final.contentState = 'structured';
          }
          this._syncCourseGraph(final, { transport: 'WEB_FORM', endpoint: `/course/view.php?id=${courseId}`, operation: 'course.view', parser: 'moodle.html.course.v2' });
          return this.cacheSet(key, final);
        }
        pageError = new Error('Campus открыл не страницу курса.');
      } catch (e) {
        pageError = e;
        if (e?.code === 'AUTH_EXPIRED' && !this.token) throw e;
      }

      if (meta && restReturned && restCourse) {
        restCourse.contentState = 'structured-empty';
        restCourse.fallback = { type: 'campus-page', url: `/course/view.php?id=${courseId}`, title: restCourse.title };
        this._syncCourseGraph(restCourse, { transport: 'WEB_SERVICE', endpoint: '/webservice/rest/server.php', operation: 'core_course_get_contents', parser: 'moodle.ws.course.contents.v2' });
        return this.cacheSet(key, restCourse);
      }
      if (meta) {
        const empty = { id: courseId, title: meta.fullnamedisplay || meta.fullname || `Курс ${courseId}`, description: textOnly(meta.summary || ''), courseimage: meta.courseimage || null, teachers: meta.teachers || [], progress: meta.progress ?? null, hasprogress: Boolean(meta.hasprogress), sections: [], contentState: 'fallback-required', fallback: { type: 'campus-page', url: `/course/view.php?id=${courseId}`, title: meta.fullnamedisplay || meta.fullname || `Курс ${courseId}` } };
        this._syncCourseGraph(empty, { transport: 'UNKNOWN', endpoint: null, operation: 'course.fallback-required', parser: 'campus.course.fallback.v1' });
        return this.cacheSet(key, empty);
      }
      throw pageError || new Error('Не удалось загрузить курс.');
    });
  }
  async gradesOverview() {
    const cached = this.cacheGet(
      'grades-overview-data',
      20000
    );

    if (cached !== null) {
      return cached;
    }

    return this._singleFlight('grades-overview', async () => {
      const again = this.cacheGet(
        'grades-overview-data',
        20000
      );

      if (again !== null) {
        return again;
      }
      let pageError = null;
      try {
        const p = await this.page('/grade/report/overview/index.php');
        if (p.status >= 400) throw new Error(`Campus вернул ${p.status} для оценок.`);
        const rows = parseGradeOverview(p.text);
        if (rows.length || !this.token) {
          return this.cacheSet(
            'grades-overview-data',
            rows
          );
        }
      } catch (e) {
        pageError = e;
        if (e?.code === 'AUTH_EXPIRED' && !this.token) throw e;
      }
      if (this.token) {
        try {
          const data = await this.rest('gradereport_overview_get_course_grades', { userid: Number(this.userid) });
          const rows = normalizeRestCourseGrades(data);
          if (rows.length || data) {
            return this.cacheSet(
              'grades-overview-data',
              rows
            );
          }
        } catch (e) { pageError = pageError || e; }
      }
      throw pageError || new Error('Campus не вернул оценки.');
    });
  }
  async gradesByCourse(id) {
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new Error(
        'Некорректный курс для отчёта.'
      );
    }

    const cacheKey =
      `grades-data:${courseId}`;

    const cached = this.cacheGet(
      cacheKey,
      20000
    );

    if (cached !== null) {
      return cached;
    }

    return this._singleFlight(
      `grades:${courseId}`,
      async () => {
        const again = this.cacheGet(
          cacheKey,
          20000
        );

        if (again !== null) {
          return again;
        }
      let pageError = null;
      try {
        const p = await this.page(`/grade/report/user/index.php?id=${encodeURIComponent(courseId)}`);
        if (p.status >= 400) throw new Error(`Campus вернул ${p.status} для отчёта.`);
        const rows = parseUserGrades(p.text);

        if (rows.length || !this.token) {
          return this.cacheSet(
            cacheKey,
            rows
          );
        }
      } catch (e) { pageError = e; if (e?.code === 'AUTH_EXPIRED' && !this.token) throw e; }
      if (this.token) {
        try {
          const data = await this.rest('gradereport_user_get_grade_items', { courseid: courseId, userid: Number(this.userid), groupid: 0 });
          const rows =
            normalizeRestGradeItems(data);

          if (rows.length || data) {
            return this.cacheSet(
              cacheKey,
              rows
            );
          }
        } catch (e) { pageError = pageError || e; }
      }
      throw pageError || new Error('Campus не вернул оценки по курсу.');
    });
  }
  async proxy(pathValue, options = {}) { return this.request(pathValue, options); }
}

export { CampusTransportError };

function normalizeRestCourseGrades(data) {
  const raw = Array.isArray(data) ? data : (data?.grades || data?.courses || data?.coursegrades || []);
  if (!Array.isArray(raw)) return [];
  return raw.map(x => {
    const c = x?.course || {};
    const course = textOnly(x?.coursename || x?.coursefullname || c?.fullname || c?.name || '');
    const grade = textOnly(x?.gradeformatted || x?.grade || x?.gradedisplay || x?.rawgrade || '');
    const courseId = Number(x?.courseid || c?.id || 0) || null;
    return course ? { course, grade: grade || '—', courseId } : null;
  }).filter(Boolean);
}
function normalizeRestGradeItems(data) {
  const groups = Array.isArray(data) ? data : (data?.usergrades || data?.grades || []);
  if (!Array.isArray(groups)) return [];
  const out=[];
  for (const group of groups) for (const item of (group?.gradeitems || group?.items || [])) {
    const name=textOnly(item?.itemname || item?.name || ''); if(!name) continue;
    out.push({name, grade:textOnly(item?.gradeformatted || item?.grade || item?.gradedisplay || ''), range:textOnly(item?.grademax != null ? `${item?.grademin ?? 0}–${item.grademax}` : ''), percentage:textOnly(item?.percentageformatted || item?.percentage || ''), feedback:textOnly(item?.feedback || ''), contribution:textOnly(item?.contribution || ''), href:item?.url || null});
  }
  return out;
}
function parseGradeOverview(html) {
  const rows = []; for (const m of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) { const cells = [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x => textOnly(x[1])); if (cells.length < 2 || /Название курса/i.test(cells[0])) continue; const href = m[1].match(/href=["']([^"']*grade\/report\/user[^"']*)/i)?.[1] || ''; const courseId = new URL(href, CAMPUS_ORIGIN).searchParams.get('id') || null; rows.push({ course: cells[0], grade: cells[1] || '-', courseId: courseId ? Number(courseId) : null, href: href || null }); } return rows;
}
function parseUserGrades(html) {
  const rows = []; for (const m of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) { const cells = [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x => textOnly(x[1])); if (cells.length < 4 || /Элемент оценивания/i.test(cells[0])) continue; const href = m[1].match(/href=["']([^"']*(?:mod\/(?:assign|quiz)|grade\/report)[^"']*)/i)?.[1] || null; rows.push({ name: cells[0], grade: cells[1] || '-', range: cells[2] || '', percentage: cells[3] || '', feedback: cells[4] || '', contribution: cells[5] || '', href }); } return rows;
}

export function makeSessionId() { return crypto.randomBytes(32).toString('base64url'); }
export { parseCourse, CAMPUS_ORIGIN };
