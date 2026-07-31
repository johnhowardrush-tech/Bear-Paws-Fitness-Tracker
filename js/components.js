// Reusable UI fragments

const Components = {
  // Column headers for the compact leaderboard
  leaderboardHeader: () => `
    <div class="leaderboard-header">
      <div style="text-align:center">#</div>
      <div>Name</div>
      <div class="leaderboard-stat">% Chg</div>
      <div class="leaderboard-stat">Lbs</div>
      <div class="leaderboard-stat">Weight</div>
      <div class="leaderboard-stat">BP</div>
    </div>
  `,

  // One compact leaderboard row.
  // Negative change = progress = green; positive = red.
  leaderboardRow: (row, rank) => {
    const { participant, currentWeight, metrics } = row;
    const pctTone = FitnessMetrics.toneFor(metrics.percent_change);
    const lbsTone = FitnessMetrics.toneFor(metrics.weight_change);
    const bpCat = metrics.bp_category;

    return `
      <div class="leaderboard-row${rank === 1 ? ' leader' : ''}">
        <div class="leaderboard-rank">${rank}</div>
        <div class="leaderboard-name">${participant.name}</div>
        <div class="leaderboard-stat card-value ${pctTone}">
          ${FitnessMetrics.formatSignedPercent(metrics.percent_change)}
        </div>
        <div class="leaderboard-stat card-value ${lbsTone}">
          ${FitnessMetrics.formatSigned(metrics.weight_change)}
        </div>
        <div class="leaderboard-stat">${currentWeight.toFixed(1)}</div>
        <div class="leaderboard-stat card-value ${bpCat.tone}">
          ${FitnessMetrics.formatBp(metrics.systolic, metrics.diastolic)}
        </div>
      </div>
    `;
  },

  // Label + value row inside a card, with optional tone class
  statRow: (label, value, tone = '') => `
    <div class="card-row">
      <span class="card-label">${label}</span>
      <span class="card-value ${tone}">${value}</span>
    </div>
  `,

  // Big number tile
  statTile: (value, label, tone = '') => `
    <div class="stat-tile">
      <div class="stat-value ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : ''}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `,

  bpBadge: (metrics) => {
    const cat = metrics.bp_category;
    if (cat.level < 0) return `<span class="badge badge-muted">No BP reading</span>`;
    return `<span class="badge badge-${cat.tone}">${cat.label}</span>`;
  },

  betCard: (bet, actions = '') => {
    const deadline = DateUtils.display(bet.deadline);
    const sideLabel = bet.position === 'will_succeed' ? 'WILL hit it' : 'will MISS it';
    const metricLabel = bet.metric === 'bp' ? 'Blood pressure' : 'Weight';

    let statusBadge;
    if (bet.status === 'open') statusBadge = '<span class="badge badge-primary">Open</span>';
    else if (bet.status === 'won') statusBadge = '<span class="badge badge-success">Creator won</span>';
    else statusBadge = '<span class="badge badge-danger">Creator lost</span>';

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
          <div style="flex:1">
            <h4>${bet.description}</h4>
            <p class="text-small">
              <strong>${bet.created_by}</strong> says ${bet.target_participant_id} ${sideLabel}
            </p>
            <p class="text-small text-dim">
              ${metricLabel} &middot; Deadline ${deadline} &middot; ${bet.stake} pts
              ${bet.taken_by ? ` &middot; taken by <strong>${bet.taken_by}</strong>` : ' &middot; nobody has taken the other side'}
            </p>
          </div>
          <div>${statusBadge}</div>
        </div>
        ${actions}
      </div>
    `;
  },

  emptyState: (message, hint = '') => `
    <div class="empty-state">
      <h3>${message}</h3>
      ${hint ? `<p class="text-small">${hint}</p>` : ''}
    </div>
  `
};
