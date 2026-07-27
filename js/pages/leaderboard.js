// Leaderboard page - fair comparison metrics

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-content');
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

  let html = `
    <div style="margin-bottom: 1rem;">
      <p>
        <strong>Primary metric:</strong> Percent of body weight lost.
        This accounts for different starting weights — a fair comparison.
      </p>
    </div>
  `;

  // Main leaderboard table
  html += Components.leaderboardHeader();

  leaderboard.forEach((entry, idx) => {
    const p = entry.participant;
    const currentWeight = entry.currentWeight;
    const metrics = entry.metrics;
    html += Components.participantCard(p, currentWeight, metrics, idx + 1);
  });

  // Detailed metrics table
  html += `<h3 style="margin-top: 2rem; margin-bottom: 1rem;">Detailed Metrics</h3>`;

  html += `
    <div style="overflow-x: auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Started</th>
            <th>Start Weight</th>
            <th>Current</th>
            <th>Lbs Lost</th>
            <th>% Lost</th>
            <th>Start BMI</th>
            <th>Current BMI</th>
            <th>BMI Change</th>
          </tr>
        </thead>
        <tbody>
  `;

  leaderboard.forEach(entry => {
    const p = entry.participant;
    const m = entry.metrics;
    html += `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${DateUtils.display(p.start_date)}</td>
        <td>${p.start_weight_lbs} lbs</td>
        <td>${entry.currentWeight.toFixed(1)} lbs</td>
        <td>${m.lbs_lost} lbs</td>
        <td><strong>${m.percent_lost}%</strong></td>
        <td>${m.start_bmi}</td>
        <td>${m.current_bmi}</td>
        <td>${m.bmi_change}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Explanation
  html += `
    <div class="card mt-lg">
      <h4>How the Fair Comparison Works</h4>
      <p>
        <strong>Percent of body weight lost</strong> is the fairest metric because
        it accounts for starting weight differences.
      </p>
      <p style="margin-top: 0.5rem;">
        Example: Someone who is 5'10" and 180 lbs losing 10 lbs is a 5.56% loss.
        Someone who is 6'2" and 220 lbs losing 10 lbs is a 4.55% loss.
        Even though both lost the same absolute amount, the first person's achievement
        is proportionally larger relative to their body.
      </p>
      <p style="margin-top: 0.5rem;">
        We also track absolute loss and BMI change for reference, but the primary
        leaderboard ranking is based on percent lost.
      </p>
    </div>
  `;

  container.innerHTML = html;
}
