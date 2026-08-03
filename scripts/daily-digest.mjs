// Builds the daily "who logged yesterday" email.
//
// Runs on a GitHub Actions schedule. Reads Firestore over the REST API - no
// credentials needed because the security rules allow public read, and the
// project id lives in config.js already.
//
// Writes digest.html + digest.txt and exports a subject line for the mail step.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const TZ = process.env.DIGEST_TZ || 'America/Chicago';
const SITE_URL = process.env.SITE_URL || '';
const SUBJECT = 'Bear Paws Fitness Tracker Update';

// ---------- date helpers (plain YYYY-MM-DD strings, like the app) ----------

const todayIn = (tz) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

// Anchored at noon UTC so daylight-saving shifts can never roll the date over
const shiftDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

const prettyDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric'
  });
};

// Stable day counter so the trash talk rotates but stays reproducible in tests
const dayIndex = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

// ---------- Firestore REST ----------

function readFirebaseConfig() {
  const source = readFileSync(new URL('../config.js', import.meta.url), 'utf8');
  const pick = (key) => {
    const match = source.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
    return match ? match[1] : null;
  };
  const projectId = pick('projectId');
  const apiKey = pick('apiKey');

  if (!projectId || projectId.includes('YOUR_')) {
    throw new Error('config.js has no real projectId - fill in your Firebase config first.');
  }
  return { projectId, apiKey };
}

const { projectId, apiKey } = readFirebaseConfig();
const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const keyParam = apiKey ? `key=${apiKey}` : '';

function decodeValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

// Full collection read, following pagination
async function listAll(collection) {
  const docs = [];
  let pageToken = '';

  for (let guard = 0; guard < 100; guard++) {
    const params = [keyParam, 'pageSize=300', pageToken && `pageToken=${pageToken}`]
      .filter(Boolean).join('&');
    const response = await fetch(`${BASE}/${collection}?${params}`);

    if (!response.ok) {
      throw new Error(`Firestore read of "${collection}" failed: ${response.status} ${await response.text()}`);
    }

    const body = await response.json();
    for (const doc of body.documents || []) {
      docs.push({ id: doc.name.split('/').pop(), ...decodeFields(doc.fields || {}) });
    }

    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }

  return docs;
}

// Only the rows for one date - keeps daily_logs cheap as it grows
async function queryByDate(collection, date) {
  const response = await fetch(`${BASE}:runQuery?${keyParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'date' },
            op: 'EQUAL',
            value: { stringValue: date }
          }
        },
        limit: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Firestore query of "${collection}" failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json())
    .filter(entry => entry.document)
    .map(entry => ({
      id: entry.document.name.split('/').pop(),
      ...decodeFields(entry.document.fields || {})
    }));
}

// ---------- metrics (mirrors js/utils/math.js) ----------

const signed = (n, decimals = 1) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '--';
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return sign + Math.abs(n).toFixed(decimals);
};

const map = (systolic, diastolic) =>
  systolic && diastolic ? diastolic + (systolic - diastolic) / 3 : null;

// ---------- trash talk ----------

const SLACKER_HEADERS = [
  'The Lazy List',
  'Hall of Shame',
  'Did Absolutely Nothing',
  'Couldn\'t Be Bothered',
  'Today\'s Deadweight'
];

const SLACKER_JABS = [
  'Not a weigh-in, not a workout, not even a note. Get off your ass and get to work.',
  'Zero entries. The app takes twenty seconds. Get off your ass and get to work.',
  'You had all day and did nothing with it. Get off your ass and get to work.',
  'The scale did not move because you did not move. Get off your ass and get to work.',
  'Everyone can see this list. Get off your ass and get to work.',
  'Still waiting on you. Get off your ass and get to work.'
];

const CLEAN_SWEEP = [
  'Every single one of you logged. Nobody to make fun of today. Disappointing, honestly.',
  'Full house. All six logged. Keep it up and this email gets very boring.',
  'Clean sweep. Not one slacker in the group. Enjoy it while it lasts.'
];

const TOTAL_FAILURE = [
  'Not one person logged a thing. All six of you. Collectively worthless. Get off your asses and get to work.',
  'Zero entries across the board. Congratulations, you all failed together. Get off your asses and get to work.',
  'Nobody. Not a single one of you. Get off your asses and get to work.'
];

const pick = (list, seed) => list[seed % list.length];

// ---------- build the report ----------

const reportDate = (process.env.REPORT_DATE || '').trim() || shiftDays(todayIn(TZ), -1);
const seed = dayIndex(reportDate);

const [participants, weighIns, bloodPressures, logs] = await Promise.all([
  listAll('participants'),
  listAll('weigh_ins'),
  listAll('blood_pressures'),
  queryByDate('daily_logs', reportDate)
]);

if (participants.length === 0) {
  throw new Error('No participants found in Firestore - nothing to report on.');
}

participants.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const latestOnOrBefore = (rows, name, cutoff) => {
  const mine = rows
    .filter(r => r.participant_id === name && r.date <= cutoff)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return mine.length ? mine[mine.length - 1] : null;
};

const rows = participants.map(p => {
  const log = logs.find(l => l.participant_id === p.name) || null;
  const weighIn = weighIns.find(w => w.participant_id === p.name && w.date === reportDate) || null;
  const bp = bloodPressures.find(b => b.participant_id === p.name && b.date === reportDate) || null;

  const latestWeighIn = latestOnOrBefore(weighIns, p.name, reportDate);
  const currentWeight = latestWeighIn ? latestWeighIn.weight_lbs : p.start_weight_lbs;

  // Goal progress: how much of the start-to-goal gap they've closed.
  // Works in either direction - a goal above your start weight is a gain goal.
  const hasGoal = !!p.goal_weight_lbs;
  const goalGap = hasGoal ? p.start_weight_lbs - p.goal_weight_lbs : 0;
  const moved = p.start_weight_lbs - currentWeight;

  const reached = !hasGoal ? false
    : goalGap > 0 ? currentWeight <= p.goal_weight_lbs
    : currentWeight >= p.goal_weight_lbs;

  const toGo = hasGoal ? (reached ? 0 : Math.abs(currentWeight - p.goal_weight_lbs)) : null;
  const progress = hasGoal && goalGap !== 0 ? (moved / goalGap) * 100 : null;

  return {
    name: p.name,
    logged: !!(log || weighIn || bp),
    log, weighIn, bp,
    startWeight: p.start_weight_lbs,
    currentWeight,
    goalWeight: hasGoal ? p.goal_weight_lbs : null,
    change: currentWeight - p.start_weight_lbs,
    reached,
    toGo,
    progress
  };
});

const slackers = rows.filter(r => !r.logged);
const loggers = rows.filter(r => r.logged);

// Goal table: furthest along first, no-goal folks at the bottom
const goalRows = rows.slice().sort((a, b) => {
  if (a.progress === null && b.progress === null) return a.change - b.change;
  if (a.progress === null) return 1;
  if (b.progress === null) return -1;
  return b.progress - a.progress;
});

// ---------- copy ----------

const describe = (row) => {
  const bits = [];
  if (row.weighIn) bits.push(`weighed in at ${Number(row.weighIn.weight_lbs).toFixed(1)} lbs`);
  if (row.log && row.log.worked_out) {
    bits.push(`worked out${row.log.workout_minutes ? ` ${row.log.workout_minutes} min` : ''}`);
  } else if (row.log) {
    bits.push('no workout');
  }
  if (row.log && row.log.drinks > 0) {
    bits.push(`${row.log.drinks} drink${row.log.drinks !== 1 ? 's' : ''}`);
  }
  if (row.bp) {
    const m = map(row.bp.systolic, row.bp.diastolic);
    bits.push(`BP ${row.bp.systolic}/${row.bp.diastolic}${m ? ` (MAP ${m.toFixed(0)})` : ''}`);
  }
  return bits.length ? bits.join(', ') : 'logged an entry';
};

const goalCell = (row) => {
  if (row.goalWeight === null) return 'no goal set';
  if (row.reached) return 'goal reached';
  return `${row.toGo.toFixed(1)} lbs to go`;
};

const progressCell = (row) => {
  if (row.reached) return 'done';
  if (row.progress === null) return '--';
  if (row.progress < 0) return 'wrong way';
  if (row.progress === 0) return 'not started';
  return `${row.progress.toFixed(0)}%`;
};

const everyoneLogged = slackers.length === 0;
const nobodyLogged = loggers.length === 0;

const slackerHeader = pick(SLACKER_HEADERS, seed);
const slackerJab = nobodyLogged ? pick(TOTAL_FAILURE, seed) : pick(SLACKER_JABS, seed);
const sweepLine = pick(CLEAN_SWEEP, seed);

// ---------- render ----------

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const styles = {
  wrap: 'margin:0;padding:24px 12px;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  card: 'max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;',
  head: 'padding:20px 24px;background:#131a24;color:#ffffff;',
  body: 'padding:22px 24px;color:#1f2937;font-size:15px;line-height:1.55;',
  h2: 'margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700;',
  jab: 'margin:0 0 24px;padding:12px 14px;background:#fef2f2;border-left:3px solid #dc2626;color:#991b1b;font-weight:600;font-size:14px;',
  good: 'margin:0 0 24px;padding:12px 14px;background:#f0fdf4;border-left:3px solid #16a34a;color:#166534;font-weight:600;font-size:14px;',
  foot: 'padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;'
};

const html = `<!doctype html>
<html><body style="${styles.wrap}">
  <div style="${styles.card}">
    <div style="${styles.head}">
      <div style="font-size:19px;font-weight:700;">Bear Paws Fitness Tracker</div>
      <div style="font-size:13px;opacity:.75;margin-top:3px;">
        Recap for ${escapeHtml(prettyDate(reportDate))}
      </div>
    </div>

    <div style="${styles.body}">

      ${everyoneLogged ? `
      <h2 style="${styles.h2}">Nobody Slacked</h2>
      <p style="${styles.good}">${escapeHtml(sweepLine)}</p>
      ` : `
      <h2 style="${styles.h2}">${escapeHtml(slackerHeader)}</h2>
      <ul style="margin:0 0 12px;padding-left:20px;">
        ${slackers.map(r =>
          `<li style="margin:0 0 6px;font-size:16px;"><strong>${escapeHtml(r.name)}</strong></li>`
        ).join('')}
      </ul>
      <p style="${styles.jab}">${escapeHtml(slackerJab)}</p>
      `}

      ${loggers.length ? `
      <h2 style="${styles.h2}">Actually Showed Up</h2>
      <ul style="margin:0 0 24px;padding-left:20px;">
        ${loggers.map(r =>
          `<li style="margin:0 0 6px;"><strong>${escapeHtml(r.name)}</strong> &mdash; ${escapeHtml(describe(r))}</li>`
        ).join('')}
      </ul>` : ''}

      <h2 style="${styles.h2}">Where Everyone Stands</h2>
      <table role="presentation" cellpadding="0" cellspacing="0"
             style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">
          <td style="padding:6px 5px;">Name</td>
          <td style="padding:6px 5px;text-align:right;">Now</td>
          <td style="padding:6px 5px;text-align:right;">Change</td>
          <td style="padding:6px 5px;text-align:right;">Goal</td>
          <td style="padding:6px 5px;text-align:right;">To go</td>
          <td style="padding:6px 5px;text-align:right;">Done</td>
        </tr>
        ${goalRows.map(r => {
          const color = r.change > 0 ? '#dc2626' : r.change < 0 ? '#16a34a' : '#64748b';
          return `<tr style="border-top:1px solid #eef2f6;">
            <td style="padding:8px 5px;font-weight:600;">${escapeHtml(r.name)}</td>
            <td style="padding:8px 5px;text-align:right;">${r.currentWeight.toFixed(1)}</td>
            <td style="padding:8px 5px;text-align:right;color:${color};font-weight:700;">${signed(r.change)}</td>
            <td style="padding:8px 5px;text-align:right;color:#64748b;">${r.goalWeight !== null ? r.goalWeight : '--'}</td>
            <td style="padding:8px 5px;text-align:right;">${r.goalWeight === null ? '--' : (r.reached ? 'hit it' : r.toGo.toFixed(1))}</td>
            <td style="padding:8px 5px;text-align:right;font-weight:600;">${escapeHtml(progressCell(r))}</td>
          </tr>`;
        }).join('')}
      </table>

      ${SITE_URL ? `
      <p style="margin:26px 0 0;">
        <a href="${escapeHtml(SITE_URL)}"
           style="display:inline-block;padding:11px 20px;background:#2563eb;color:#ffffff;
                  text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
          Log today's check-in
        </a>
      </p>` : ''}
    </div>

    <div style="${styles.foot}">
      Change is current weight minus your starting weight - green is down, red is up.
      "Done" is how much of the gap to your goal you've closed.<br>
      Missed a day? You can still back-fill it on the Check In tab.
    </div>
  </div>
</body></html>`;

const text = [
  `BEAR PAWS FITNESS TRACKER UPDATE`,
  `Recap for ${prettyDate(reportDate)}`,
  '',
  ...(everyoneLogged
    ? ['NOBODY SLACKED', '', sweepLine, '']
    : [
        slackerHeader.toUpperCase(),
        ...slackers.map(r => `  - ${r.name}`),
        '',
        slackerJab,
        ''
      ]),
  ...(loggers.length
    ? ['ACTUALLY SHOWED UP', ...loggers.map(r => `  - ${r.name}: ${describe(r)}`), '']
    : []),
  'WHERE EVERYONE STANDS',
  ...goalRows.map(r => {
    const now = `${r.currentWeight.toFixed(1)} lbs`;
    const chg = `${signed(r.change)} lbs`;
    return `  ${r.name.padEnd(9)} ${now.padStart(10)}  ${chg.padStart(10)}  ${goalCell(r).padEnd(15)} ${progressCell(r)}`;
  }),
  '',
  ...(SITE_URL ? [`Log today: ${SITE_URL}`, ''] : []),
  'Change is current minus starting weight. Green/negative is down.'
].join('\n');

writeFileSync('digest.html', html);
writeFileSync('digest.txt', text);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `subject=${SUBJECT}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `report_date=${reportDate}\n`);
}

console.log(`Report date : ${reportDate} (${TZ})`);
console.log(`Slackers    : ${slackers.map(r => r.name).join(', ') || 'none'}`);
console.log(`Logged      : ${loggers.map(r => r.name).join(', ') || 'nobody'}`);
console.log(`Subject     : ${SUBJECT}`);
