// Dashboard - at-a-glance view

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found');
    return;
  }

  const board = Store.getScoreboard('percent_change');
  const today = DateUtils.today();

  // ---- Today's strip ----
  const workedOut = [];
  const weighedIn = [];
  const bpLogged = [];

  participants.forEach(p => {
    const log = Store.getDailyLog(p.name, today);
    if (log && log.worked_out) workedOut.push(p.name);
    if (Store.hasWeighedInOn(p.name, today)) weighedIn.push(p.name);
    if (Store.hasLoggedBpOn(p.name, today)) bpLogged.push(p.name);
  });

  const openBets = Store.getOpenBets();

  let html = `
    <div class="card">
      <h3>Today &middot; ${DateUtils.display(today)}</h3>
      <p>Worked out: <strong>${workedOut.length ? workedOut.join(', ') : 'nobody yet'}</strong></p>
      <p>Weighed in: <strong>${weighedIn.length ? weighedIn.join(', ') : 'nobody yet'}</strong></p>
      <p>Logged BP: <strong>${bpLogged.length ? bpLogged.join(', ') : 'nobody yet'}</strong></p>
      <p>Open bets: <strong>${openBets.length}</strong></p>
    </div>
  `;

  // ---- Top 3 tiles ----
  html += '<div class="grid grid-3 mb-md">';
  board.slice(0, 3).forEach((row, idx) => {
    const m = row.metrics;
    const pctTone = FitnessMetrics.toneFor(m.percent_change);
    const lbsTone = FitnessMetrics.toneFor(m.weight_change);
    const bmiTone = FitnessMetrics.toneFor(m.bmi_change);

    html += `
      <div class="card highlight">
        <h4>${idx + 1}. ${row.participant.name}</h4>
        ${Components.statRow('Body weight change', FitnessMetrics.formatSignedPercent(m.percent_change), pctTone)}
        ${Components.statRow('Pounds', FitnessMetrics.formatSigned(m.weight_change, 'lbs'), lbsTone)}
        ${Components.statRow('BMI', FitnessMetrics.formatSigned(m.bmi_change, '', 2), bmiTone)}
        ${Components.statRow('Blood pressure', FitnessMetrics.formatBp(m.systolic, m.diastolic), m.bp_category.tone)}
      </div>
    `;
  });
  html += '</div>';

  // ---- Full standings ----
  html += `
    <h3>Standings</h3>
    <p class="text-small text-muted mb-sm">
      Ranked by percent of body weight change. Green is moving down, red is moving up.
    </p>
    <div class="leaderboard-scroll">
      <div>
        ${Components.leaderboardHeader()}
        ${board.map((row, idx) => Components.leaderboardRow(row, idx + 1)).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
