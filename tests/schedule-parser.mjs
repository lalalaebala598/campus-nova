import assert from 'node:assert/strict';
import { parseScheduleMessage } from '../backend/src/schedule-parser.js';

const source = `
🗓 **Расписание на неделю**
🎓 *3 курс · Прикладная математика и информатика · Группа 2*
📆 *21.09.2026-26.09.2026 · нечетная неделя*
━━━━━━━━━━━━━━━━━━

**Понедельник, 21 сентября**
📝 08:00 – 09:30 — **Теория игр** *(ауд. 71к · Коренева О.В.)*
📗 09:40 – 11:10 — **Теория игр** *(ауд. 84 · Коренева О.В.)*

**Вторник, 22 сентября**
📗 15:00 – 16:30 — **Методы принятия управленческих решений** *(ауд. 54 · Яроменко Н.Н.)*
📝 16:40 – 18:10 — **Финансовая математика и ее приложения** *(ауд. 54 · Молчан А.С.)*

**Среда, 23 сентября**
📝 13:20 – 14:50 — **Элективные дисциплины по физ. культуре и спорту** *(Кирий Е.В.)*
📝 15:00 – 16:30 — **Элективные дисциплины по физ. культуре и спорту** *(Кирий Е.В.)*

**Четверг, 24 сентября**
📝 08:00 – 09:30 — **Методы принятия управленческих решений** *(ауд. 72 · Яроменко Н.Н.)*
📝 09:40 – 11:10 — **Иностранный язык в профессиональной сфере** *(ауд. 51 · Липеева И.Ю.)*

**Пятница, 25 сентября**
📗 11:20 – 12:50 — **Экономическая теория** *(ауд. 64 · Вихарев В.В.)*
📝 13:20 – 14:50 — **Эконометрика** *(ауд. 54 · Ануфриева А.П.)*

━━━━━━━━━━━━━━━━━━
📊 Пар за неделю: **10**
`;

const parsed =
  parseScheduleMessage(source);

assert.equal(
  parsed.education.course,
  3
);

assert.equal(
  parsed.education.program,
  'Прикладная математика и информатика'
);

assert.equal(
  parsed.education.group,
  '2'
);

assert.equal(
  parsed.period.startDate,
  '2026-09-21'
);

assert.equal(
  parsed.period.endDate,
  '2026-09-26'
);

assert.equal(
  parsed.period.parity,
  'odd'
);

assert.equal(
  parsed.stats.lessons,
  10
);

assert.equal(
  parsed.stats.days,
  5
);

const first = parsed.lessons[0];

assert.equal(
  first.date,
  '2026-09-21'
);

assert.equal(
  first.start,
  '08:00'
);

assert.equal(
  first.end,
  '09:30'
);

assert.equal(
  first.subject,
  'Теория игр'
);

assert.equal(
  first.type,
  'practice'
);

assert.equal(
  first.room,
  '71к'
);

assert.equal(
  first.teacher,
  'Коренева О.В.'
);

assert.equal(
  first.pairNumber,
  1
);

const wednesday =
  parsed.lessons.filter(
    lesson =>
      lesson.date ===
      '2026-09-23'
  );

assert.equal(
  wednesday.length,
  2
);

assert.equal(
  wednesday[0].room,
  null
);

assert.equal(
  wednesday[0].teacher,
  'Кирий Е.В.'
);

const fridayLast =
  parsed.lessons.find(
    lesson =>
      lesson.date ===
        '2026-09-25' &&
      lesson.start === '13:20'
  );

assert.ok(fridayLast);

assert.equal(
  fridayLast.subject,
  'Эконометрика'
);

assert.equal(
  fridayLast.type,
  'practice'
);

console.log(
  'PASS schedule parser: Telegram weekly format'
);
