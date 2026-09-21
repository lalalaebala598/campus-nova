const MONTHS = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12
};

const DAY_NAMES = {
  понедельник: 1,
  вторник: 2,
  среда: 3,
  четверг: 4,
  пятница: 5,
  суббота: 6,
  воскресенье: 7
};

const LESSON_TYPES = {
  '📝': 'practice',
  '📗': 'lecture',
  '📘': 'lecture',
  '📙': 'lecture',
  '🧪': 'lab',
  '📚': 'seminar',
  '💻': 'computer',
  '🖥️': 'computer'
};

const PAIR_SLOTS = [
  ['08:00', '09:30', 1],
  ['09:40', '11:10', 2],
  ['11:20', '12:50', 3],
  ['13:20', '14:50', 4],
  ['15:00', '16:30', 5],
  ['16:40', '18:10', 6]
];

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x20;/gi, ' ')
    .replace(/&#32;/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanMarkup(value = '') {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[`_]/g, '')
    .replace(/\\\r?\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeInput(value = '') {
  return cleanMarkup(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function parseDate(value = '') {
  const match =
    String(value).match(
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
    );

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseWeekPeriod(line = '') {
  const match =
    String(line).match(
      /(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–]\s*(\d{1,2}\.\d{1,2}\.\d{4})/i
    );

  if (!match) return null;

  const startDate = parseDate(match[1]);
  const endDate = parseDate(match[2]);

  if (!startDate || !endDate) return null;

  const text = String(line).toLowerCase();

  let parity = null;

  if (/нечетн/.test(text)) {
    parity = 'odd';
  } else if (/четн/.test(text)) {
    parity = 'even';
  }

  return {
    startDate,
    endDate,
    parity,
    label:
      parity === 'odd'
        ? 'нечетная неделя'
        : parity === 'even'
          ? 'четная неделя'
          : null
  };
}

function parseEducation(line = '') {
  const clean = cleanMarkup(line);

  const match =
    clean.match(
      /(\d+)\s*курс\s*[·•]\s*(.+?)\s*[·•]\s*группа\s*(.+)$/i
    );

  if (!match) return null;

  return {
    course: Number(match[1]),
    program: match[2].trim(),
    group: match[3].trim()
  };
}

function parseDayHeading(line = '') {
  const clean = cleanMarkup(line);

  const match =
    clean.match(
      /^(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s*(\d{1,2})\s+([А-Яа-яЁё]+)$/i
    );

  if (!match) return null;

  const dayName = match[1].toLowerCase();
  const day = Number(match[2]);
  const monthName = match[3].toLowerCase();
  const month = MONTHS[monthName];

  if (!month) return null;

  return {
    weekday: DAY_NAMES[dayName] || null,
    dayName: match[1],
    day,
    month,
    monthName
  };
}

function parseTime(value = '') {
  const match =
    String(value).match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
    value:
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutes: hour * 60 + minute
  };
}

function inferPairNumber(start, end) {
  const hit =
    PAIR_SLOTS.find(
      slot =>
        slot[0] === start &&
        slot[1] === end
    );

  return hit?.[2] || null;
}

function parseLessonDetails(value = '') {
  const parts =
    String(value)
      .split(/\s*[·•]\s*/)
      .map(v => cleanMarkup(v))
      .filter(Boolean);

  let room = null;
  let teacher = null;

  const remaining = [];

  for (const part of parts) {
    const roomMatch =
      part.match(
        /^(?:ауд\.?|аудитория)\s*([0-9A-Za-zА-Яа-яЁё._/-]+)$/i
      );

    if (roomMatch) {
      room = roomMatch[1];
      continue;
    }

    remaining.push(part);
  }

  if (remaining.length) {
    teacher = remaining.join(' · ');
  }

  return {
    room,
    teacher
  };
}

function parseLesson(line = '', day = null, year = null) {
  const clean = cleanMarkup(line);

  const match =
    clean.match(
      /^(?:[•·]\s*)?(📝|📗|📘|📙|🧪|📚|💻|🖥️)?\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s*[—-]\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/u
    );

  if (!match || !day || !year) {
    return null;
  }

  const emoji = match[1] || null;
  const start = parseTime(match[2]);
  const end = parseTime(match[3]);

  if (!start || !end) {
    return null;
  }

  const subject =
    cleanMarkup(match[4])
      .replace(/[. ]+$/, '')
      .trim();

  if (!subject) {
    return null;
  }

  const details =
    parseLessonDetails(match[5] || '');

  const month =
    String(day.month).padStart(2, '0');

  const dayNumber =
    String(day.day).padStart(2, '0');

  const date =
    `${year}-${month}-${dayNumber}`;

  return {
    id:
      `${date}:${start.value}-${end.value}:${subject.toLowerCase()}`,

    date,

    weekday:
      day.weekday,

    dayName:
      day.dayName,

    start:
      start.value,

    end:
      end.value,

    startMinutes:
      start.minutes,

    endMinutes:
      end.minutes,

    pairNumber:
      inferPairNumber(
        start.value,
        end.value
      ),

    subject,

    type:
      LESSON_TYPES[emoji] ||
      'unknown',

    typeLabel:
      emoji ||
      null,

    room:
      details.room,

    teacher:
      details.teacher
  };
}

export function parseScheduleMessage(input = '') {
  const lines =
    normalizeInput(input);

  if (!lines.length) {
    throw new Error(
      'Сообщение с расписанием пустое.'
    );
  }

  let period = null;
  let education = null;
  let currentDay = null;
  let year = null;

  const lessons = [];
  const warnings = [];

  for (const line of lines) {

    if (!education) {
      const parsedEducation =
        parseEducation(line);

      if (parsedEducation) {
        education =
          parsedEducation;
        continue;
      }
    }

    if (!period) {
      const parsedPeriod =
        parseWeekPeriod(line);

      if (parsedPeriod) {
        period =
          parsedPeriod;

        year =
          Number(
            parsedPeriod.startDate.slice(0, 4)
          );

        continue;
      }
    }

    const day =
      parseDayHeading(line);

    if (day) {
      currentDay = day;
      continue;
    }

    if (
      /^\s*(?:📝|📗|📘|📙|🧪|📚|💻|🖥️)?\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\s*[—-]/u.test(line)
    ) {
      const lesson =
        parseLesson(
          line,
          currentDay,
          year
        );

      if (lesson) {
        lessons.push(lesson);
      } else {
        warnings.push(
          `Не удалось распознать пару: ${line}`
        );
      }
    }
  }

  if (!period) {
    throw new Error(
      'Не удалось найти период расписания.'
    );
  }

  if (!education) {
    throw new Error(
      'Не удалось определить курс и группу.'
    );
  }

  if (!lessons.length) {
    throw new Error(
      'Не удалось найти ни одной пары.'
    );
  }

  lessons.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startMinutes - b.startMinutes
  );

  const uniqueDates =
    [...new Set(
      lessons.map(
        lesson => lesson.date
      )
    )];

  return {
    source: 'telegram',
    sourceBot: '@finashkakrd_bot',

    education,

    period,

    lessons,

    stats: {
      lessons: lessons.length,
      days: uniqueDates.length
    },

    warnings
  };
}
