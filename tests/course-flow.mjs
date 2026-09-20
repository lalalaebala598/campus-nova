import assert from 'node:assert/strict';
import { CampusSession, parseCourse, parseActivityLinks } from '../backend/src/campus.js';


/*
 * Regression:
 * files from neighbouring Moodle activities must never leak
 * into the current activity.
 */
const isolatedActivitiesHtml = `
<section id="section-9" class="section">
  <h3 class="sectionname">Материалы</h3>

  <li
    class="activity resource modtype_resource"
    id="module-901"
  >
    <div class="activityinstance">
      <a href="/mod/resource/view.php?id=901">
        <span class="instancename">
          Лекция №2
        </span>
      </a>
    </div>

    <a href="/pluginfile.php/101/resource/901/2.pdf">
      2.pdf
    </a>
  </li>

  <li
    class="activity resource modtype_resource"
    id="module-902"
  >
    <div class="activityinstance">
      <a href="/mod/resource/view.php?id=902">
        <span class="instancename">
          Лекция №1
        </span>
      </a>
    </div>

    <a href="/pluginfile.php/101/resource/902/1.pdf">
      1.pdf
    </a>
  </li>

  <li
    class="activity resource modtype_resource"
    id="module-903"
  >
    <div class="activityinstance">
      <a href="/mod/resource/view.php?id=903">
        <span class="instancename">
          Табличные данные в библиотеке pandas
        </span>
      </a>
    </div>

    <a href="/pluginfile.php/101/resource/903/pandas.pdf">
      pandas.pdf
    </a>
  </li>
</section>
`;

const isolatedActivities =
  parseActivityLinks(
    isolatedActivitiesHtml,
    101
  );

const lecture2 =
  isolatedActivities.find(
    item => Number(item.cmid) === 901
  );

assert.ok(
  lecture2,
  'Lecture #2 activity must be discovered'
);

assert.deepEqual(
  lecture2.contents.map(
    file => file.filename
  ),
  ['2.pdf'],
  'Lecture #2 must contain only its own file'
);

const lecture1 =
  isolatedActivities.find(
    item => Number(item.cmid) === 902
  );

assert.deepEqual(
  lecture1.contents.map(
    file => file.filename
  ),
  ['1.pdf'],
  'Lecture #1 must contain only its own file'
);


const variedHtml = `<!doctype html><html><head><title>Курс: Информатика</title></head><body>
<section id="section-1" class="section"><h3 class="sectionname">Организация</h3>
<li class="activity assign modtype_assign" id="module-10"><div class="activityinstance"><a href="/mod/assign/view.php?id=10"><span class="instancename">Домашнее задание</span></a></div></li>
</section>
<div id="section-2"><h3 class="sectionname">Материалы</h3>
<div class="activity-wrapper resource modtype_resource" id="module-11"><a href="/mod/resource/view.php?id=11"><span class="instancename">Лекция</span></a></div>
<div data-for="cmitem" data-id="12" class="activity-wrapper quiz modtype_quiz"><a href="/mod/quiz/view.php?id=12"><span class="instancename">Контрольный тест</span></a></div>
</div>
</body></html>`;

const parsed = parseCourse(variedHtml, 101);
assert.equal(parsed.sections.length, 2);
assert.deepEqual(parsed.sections.map(s => s.activities.map(a => a.type)), [['assign'], ['resource', 'quiz']]);

const session = new CampusSession();
session.token = 'fixture-token';
session.courses = async () => [
  { id: 101, fullname: 'Информатика', fullnamedisplay: 'Информатика', summary: 'Базовый курс' },
  { id: 202, fullname: 'Математика', fullnamedisplay: 'Математика', summary: 'Большой курс' },
  { id: 303, fullname: 'Экономика', fullnamedisplay: 'Экономика', summary: '' },
  { id: 404, fullname: 'Управление', fullnamedisplay: 'Управление', summary: 'Курс с неполным REST-контентом' },
];
let calls = [];
session.rest = async (method, args) => {
  calls.push([method, args.courseid]);
  if (method !== 'core_course_get_contents') throw new Error('Unexpected method');
  if (args.courseid === 101) return [
    { id: 1, name: 'Организация', modules: [{ id: 10, modname: 'assign', name: 'Домашнее задание', url: '/mod/assign/view.php?id=10' }] },
    { id: 2, name: 'Материалы', modules: [{ id: 11, modname: 'resource', name: 'Лекция', url: '/mod/resource/view.php?id=11' }, { id: 12, modname: 'quiz', name: 'Тест', url: '/mod/quiz/view.php?id=12' }] },
  ];
  if (args.courseid === 202) return [];
  if (args.courseid === 303) throw new Error('Invalid response value detected');
  if (args.courseid === 404) return [
    { id: 1, name: 'Тема 1', modules: [{ id: 41, modname: 'resource', name: 'Лекция', url: '/mod/resource/view.php?id=41' }] }
  ];
};
session.page = async path => {
  const id = Number(new URL(path, 'https://campus.fa.ru').searchParams.get('id'));
  if (id === 303) return { status: 200, contentType: 'text/html', headers: {}, text: '<html><head><title>Курс: Экономика</title></head><body><h1>Экономика</h1><section id="section-1" class="section"><h3 class="sectionname">Введение</h3><li class="activity file modtype_resource" id="module-31"><a href="/mod/resource/view.php?id=31"><span class="instancename">Методичка</span></a><a href="/pluginfile.php/101/mod_resource/content/0/Методичка.pdf">PDF</a></li></section></body></html>', path };
  if (id === 404) return { status: 200, contentType: 'text/html', headers: {}, text: '<html><head><title>Курс: Управление</title></head><body><h1>Управление</h1><section id="section-1" class="section"><h3 class="sectionname">Тема 1</h3><li class="activity resource modtype_resource" id="module-41"><a href="/mod/resource/view.php?id=41"><span class="instancename">Лекция</span></a></li><li class="activity quiz modtype_quiz" id="module-42"><a href="/mod/quiz/view.php?id=42"><span class="instancename">Контроль</span></a></li><li class="activity assign modtype_assign" id="module-43"><a href="/mod/assign/view.php?id=43"><span class="instancename">Практика</span></a></li></section></body></html>', path };
  return { status: 200, contentType: 'text/html', headers: {}, text: variedHtml, path };
};

const a = await session.course(101, { force: true });
assert.equal(a.title, 'Информатика');
assert.equal(a.sections.length, 2);
assert.equal(a.sections[1].activities.length, 2);

const b = await session.course(202, { force: true });
assert.equal(b.title, 'Информатика', 'when REST contents is empty, real course HTML must be checked instead of accepting a false empty shell');
assert.equal(b.sections.length, 2, 'HTML course fallback must recover real sections after an empty REST response');
assert.equal(b.sections[1].activities.length, 2);

const c = await session.course(303, { force: true });
assert.equal(c.title, 'Экономика');
assert.equal(c.sections.length, 1, 'HTML course fallback must work when REST content fails');
assert.equal(c.sections[0].name, 'Введение');
assert.equal(c.sections[0].activities[0].contents[0].fileurl, '/pluginfile.php/101/mod_resource/content/0/Методичка.pdf');

const merged = await session.course(404, { force: true, verify: true });
assert.equal(merged.title, 'Управление');
assert.equal(merged.sections[0].activities.length, 3, 'verified course open must merge activities missing from REST with the real course HTML');
assert.deepEqual(merged.sections[0].activities.map(a => a.type), ['resource', 'quiz', 'assign']);

assert.ok(calls.some(([m,id]) => m === 'core_course_get_contents' && id === 101));
assert.ok(calls.some(([m,id]) => m === 'core_course_get_contents' && id === 202));
assert.ok(calls.some(([m,id]) => m === 'core_course_get_contents' && id === 303));

const beforeRefreshCalls = calls.length;
const refreshed = await session.course(101, { force: true });
assert.equal(refreshed.sections.length, 2);
assert.ok(calls.length > beforeRefreshCalls, 'force refresh must bypass the course cache');

console.log('PASS course flow: multiple course IDs, empty REST fallback, HTML fallback, varied activity types, file contents');
