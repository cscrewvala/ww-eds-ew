/**
 * cards-calendar: list of upcoming events with an "Add to calendar" action.
 *
 * Authored rows, one per event:
 *   cell 1: date (dd/mm/yyyy, yyyy-mm-dd, or "28 October 2026")
 *   cell 2: event title (optionally followed by detail paragraphs)
 *   cell 3 (optional): description / details
 *
 * The "Add" button builds an all-day .ics file client-side (Blob download) from the
 * row's date and title; rows whose date cannot be parsed render without the button.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function validDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? date : null;
}

/** Parse a date string into a UTC-midnight Date (calendar date only), or null. */
export function parseEventDate(text) {
  const s = (text || '').trim();
  let m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); // dd/mm/yyyy (AU)
  if (m) return validDate(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); // ISO
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,})\.?,?\s+(\d{4})/i); // 28 October 2026
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (month >= 0) return validDate(+m[3], month + 1, +m[1]);
  }
  return null;
}

function icsDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function icsEscape(text) {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** Fold content lines at 75 octets (approximated by characters) per RFC 5545. */
function fold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

export function buildIcs({ date, title, description }) {
  const end = new Date(date.getTime() + 86400000);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `${icsDate(date)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@${window.location.hostname || 'localhost'}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EDS//cards-calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(date)}`,
    `DTEND;VALUE=DATE:${icsDate(end)}`,
    `SUMMARY:${icsEscape(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push(`URL:${window.location.href}`, 'END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function decorateEvent(row) {
  const cells = [...row.children];
  // Date cell: the first cell whose text parses as a date (normally cell 1).
  const dateCell = cells.find((c) => parseEventDate(c.textContent)) || cells[0];
  const others = cells.filter((c) => c !== dateCell);
  const date = dateCell ? parseEventDate(dateCell.textContent) : null;

  const li = document.createElement('li');
  li.className = 'cards-calendar-event';

  const icon = document.createElement('span');
  icon.className = 'cards-calendar-icon';
  icon.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'cards-calendar-body';

  const dateEl = document.createElement('p');
  dateEl.className = 'cards-calendar-date';
  const dateText = dateCell ? dateCell.textContent.trim() : '';
  if (date) {
    const time = document.createElement('time');
    time.dateTime = date.toISOString().slice(0, 10);
    time.textContent = dateText;
    dateEl.append(time);
  } else {
    dateEl.textContent = dateText;
  }
  if (dateText) body.append(dateEl);

  // Title = first heading/paragraph of the next cell; remaining content = details.
  const titleCell = others.shift();
  let titleEl = null;
  if (titleCell) {
    const first = titleCell.firstElementChild;
    if (first) {
      titleEl = first;
    } else if (titleCell.textContent.trim()) {
      titleEl = document.createElement('p');
      titleEl.textContent = titleCell.textContent.trim();
    }
    if (titleEl) {
      titleEl.classList.add('cards-calendar-title');
      body.append(titleEl);
      [...titleCell.children].forEach((el) => {
        if (el !== titleEl && el.textContent.trim()) {
          el.classList.add('cards-calendar-details');
          body.append(el);
        }
      });
    }
  }
  others.forEach((cell) => {
    if (!cell.textContent.trim()) return;
    const details = document.createElement('div');
    details.className = 'cards-calendar-details';
    while (cell.firstChild) details.append(cell.firstChild);
    body.append(details);
  });

  li.append(icon, body);

  const title = titleEl ? titleEl.textContent.trim() : '';
  if (date && title) {
    const summary = title.replace(/\s*\*+$/, ''); // drop footnote markers
    const description = [...body.querySelectorAll('.cards-calendar-details')]
      .map((el) => el.textContent.trim()).filter(Boolean).join('\n');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cards-calendar-add';
    button.setAttribute('aria-label', `Add ${summary} on ${dateText} to calendar`);
    button.innerHTML = '<span class="cards-calendar-add-label">Add</span><span class="cards-calendar-add-icon" aria-hidden="true"></span>';
    button.addEventListener('click', () => {
      const slug = summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
      download(`${slug}.ics`, buildIcs({ date, title: summary, description }));
    });
    li.append(button);
  }
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (!row.textContent.trim()) return;
    ul.append(decorateEvent(row));
  });
  block.replaceChildren(ul);
}
