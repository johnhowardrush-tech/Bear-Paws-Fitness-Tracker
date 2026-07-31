// Leaderboard - the full fair-comparison view

let leaderboardSort = 'percent_change';

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found');
    return;
  }

  const board = Store.getScoreboard(leaderboardSort);

  const sortOptions = [
    ['percent_change', '% of body weight (default)'],
    ['weight_change', 'Pounds changed'],
    ['bmi_change', 'BMI change'],
    ['map_change', 'BP improvement (MAP)'],
    ['map', 'Current BP (lowest MAP)'],
    ['name', 'Name']
  ];

  let html = `
    <div class="callout">
      <strong>Percent of body weight</strong> is the ranking metric — it puts everyone on an even
      footing regardless of size. 10 lbs off 180 is -5.56%; 10 lbs off 220 is only -4.55%.
      Negative numbers in green mean you're moving the right direction.
    </div>

    <div class="toolbar">
      <label for="lb-sort" class="text-small text-muted">Sort by</label>
      <select id="lb-sort">
        ${sortOptions.map(([value, label]) =>
          `<option value="${value}" ${leaderboardSort === value ? 'selected' : ''}>${label}</option>`
        ).join('')}
      </select>
    </div>

    <div class="leaderboard-scroll mb-lg">
      <div>
        ${Components.leaderboardHeader()}
        ${board.map((row, idx) => Components.leaderboardRow(row, idx + 1)).join('')}
      </div>
    </div>

    <h3>Every metric side by side</h3>
    <div class="table-scroll mb-lg">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th class="num">Start</th>
            <th class="num">Current</th>
            <th class="num">Lbs</th>
            <th class="num">% Body wt</th>
            <th class="num">Start BMI</th>
            <th class="num">BMI now</th>
            <th class="num">BMI chg</th>
            <th class="num">BP</th>
            <th>Category</th>
            <th class="num">MAP</th>
            <th class="num">MAP chg</th>
          </tr>
        </thead>
        <tbody>
  `;

  board.forEach((row, idx) => {
    const p = row.participant;
    const m = row.metrics;
    const cls = (v) => v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral';

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${p.name}</strong></td>
        <td class="num">${m.start_weight.toFixed(1)}</td>
        <td class="num">${m.current_weight.toFixed(1)}</td>
        <td class="num ${cls(m.weight_change)}">${FitnessMetrics.formatSigned(m.weight_change)}</td>
        <td class="num ${cls(m.percent_change)}"><strong>${FitnessMetrics.formatSignedPercent(m.percent_change)}</strong></td>
        <td class="num">${m.start_bmi.toFixed(1)}</td>
        <td class="num">${m.current_bmi.toFixed(1)}</td>
        <td class="num ${cls(m.bmi_change)}">${FitnessMetrics.formatSigned(m.bmi_change, '', 2)}</td>
        <td class="num">${FitnessMetrics.formatBp(m.systolic, m.diastolic)}</td>
        <td><span class="badge badge-${m.bp_category.tone}">${m.bp_category.label}</span></td>
        <td class="num">${m.map !== null ? m.map.toFixed(1) : '--'}</td>
        <td class="num ${m.map_change !== null ? cls(m.map_change) : 'neutral'}">
          ${m.map_change !== null ? FitnessMetrics.formatSigned(m.map_change) : '--'}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="card">
      <h4>How the fair comparison works</h4>
      <p><strong>Weight:</strong> we rank by percent of body weight changed, not raw pounds.
      A 180 lb guy dropping 10 lbs (-5.56%) outranks a 220 lb guy dropping the same 10 lbs (-4.55%),
      because it's a bigger share of his body. BMI change is shown too since it also folds in height.</p>

      <p class="mt-sm"><strong>Blood pressure:</strong> we score it with
      <strong>MAP (Mean Arterial Pressure)</strong> = diastolic + (systolic - diastolic) / 3.
      It squashes two numbers into one comparable value, so 130/85 (MAP 100) and 145/78 (MAP 100)
      count the same. Healthy MAP is roughly 70-100.</p>

      <p class="mt-sm"><strong>MAP change</strong> is the BP equivalent of percent lost: how many
      MAP points you've dropped from your baseline. That's the number to bet on — it rewards
      improvement rather than whoever happens to have the best genes. Someone starting at
      MAP 105 who gets to 95 (-10) beats someone who sat at 88 the whole time (0).</p>

      <p class="mt-sm"><strong>Signs and colors:</strong> every change is current minus start.
      Negative and green means down (good for weight, BMI, and BP). Positive and red means up.</p>
    </div>
  `;

  container.innerHTML = html;

  const sortSelect = document.getElementById('lb-sort');
  sortSelect.addEventListener('change', () => {
    leaderboardSort = sortSelect.value;
    renderLeaderboard();
  });
}
