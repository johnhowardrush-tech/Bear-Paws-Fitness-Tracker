// Dashboard page - home leaderboard and at-a-glance view

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found', '🤔');
    return;
  }

  // Calculate metrics for all participants
  const leaderboard = participants.map(p => {
    const currentWeight = Store.getCurrentWeight(p.name);
    const metrics = FitnessMetrics.getMetrics(p, currentWeight);
    return {
      participant: p,
      currentWeight,
      metrics,
      percentLost: parseFloat(metrics.percent_lost)
    };
  });

  // Sort by percent lost descending
  leaderboard.sort((a, b) => b.percentLost - a.percentLost);

  // Build HTML
  let html = '';

  // Today's activity strip
  html += '<div class="card">';
  html += '<h3>Today\'s Activity</h3>';
  const today = DateUtils.today();
  const todayLogs = participants.map(p => {
    const log = Store.getDailyLog(p.name, today);
    return {
      name: p.name,
      worked_out: log && log.worked_out,
      weighed_in: Store.getWeightHistory(p.name).some(w => w.date === today)
    };
  });

  const workedOut = todayLogs.filter(l => l.worked_out).map(l => l.name).join(', ');
  const weighedIn = todayLogs.filter(l => l.weighed_in).map(l => l.name).join(', ');

  html += `<p>💪 Worked out: ${workedOut || 'Nobody yet'}</p>`;
  html += `<p>⚖️ Weighed in: ${weighedIn || 'Nobody yet'}</p>`;

  const openBets = Store.getOpenBets();
  html += `<p>🎲 Open bets: <strong>${openBets.length}</strong></p>`;
  html += '</div>';

  // Leaderboard
  html += '<div class="mb-lg">';
  html += '<h3>Leaderboard - Fair Comparison</h3>';
  html += Components.leaderboardHeader();

  leaderboard.forEach((entry, idx) => {
    const p = entry.participant;
    const currentWeight = entry.currentWeight;
    const metrics = entry.metrics;
    html += Components.participantCard(p, currentWeight, metrics, idx + 1);
  });

  html += '</div>';

  // Key stats
  html += '<div class="grid grid-2">';
  leaderboard.slice(0, 3).forEach((entry, idx) => {
    const p = entry.participant;
    const metrics = entry.metrics;

    html += `<div class="card highlight">`;
    html += `<h4>${idx + 1}. ${p.name}</h4>`;
    html += `<div class="card-row">`;
    html += `<span class="card-label">% Lost (Primary)</span>`;
    html += `<span class="card-value primary">${metrics.percent_lost}%</span>`;
    html += `</div>`;
    html += `<div class="card-row">`;
    html += `<span class="card-label">Absolute Loss</span>`;
    html += `<span class="card-value">${metrics.lbs_lost} lbs</span>`;
    html += `</div>`;
    html += `<div class="card-row">`;
    html += `<span class="card-label">BMI Change</span>`;
    html += `<span class="card-value success">−${metrics.bmi_change}</span>`;
    html += `</div>`;
    html += `</div>`;
  });
  html += '</div>';

  container.innerHTML = html;
}
