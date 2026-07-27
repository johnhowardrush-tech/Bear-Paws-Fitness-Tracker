// Reusable UI components

const Components = {
  // Participant selector dropdown
  participantSelect: (name = '', onChange = () => {}) => {
    const participants = Store.getParticipants();
    const options = participants.map(p =>
      `<option value="${p.name}" ${p.name === name ? 'selected' : ''}>${p.name}</option>`
    ).join('');

    return `
      <select onchange="(function(e) { ${onChange.toString().replace('function (e) ', '')}(e) })(event)" class="form-input">
        <option value="">Select a person...</option>
        ${options}
      </select>
    `;
  },

  // Date input with default to today
  dateInput: (date = null, id = 'date-input') => {
    const defaultDate = date || DateUtils.today();
    return `<input type="date" id="${id}" value="${defaultDate}" class="form-input">`;
  },

  // Participant card for leaderboard
  participantCard: (participant, currentWeight, metrics, rank) => {
    const percent = parseFloat(metrics.percent_lost);
    const lbs = parseFloat(metrics.lbs_lost);

    return `
      <div class="leaderboard-row">
        <div class="leaderboard-rank">#${rank}</div>
        <div class="leaderboard-name">${participant.name}</div>
        <div class="leaderboard-stat">${metrics.percent_lost}%</div>
        <div class="leaderboard-stat">${metrics.lbs_lost} lbs</div>
        <div class="leaderboard-stat">${currentWeight.toFixed(1)} lbs</div>
      </div>
    `;
  },

  // Leaderboard header
  leaderboardHeader: () => {
    return `
      <div class="leaderboard-header">
        <div style="min-width: 30px; text-align: center;">Rank</div>
        <div>Name</div>
        <div class="leaderboard-stat">% Lost</div>
        <div class="leaderboard-stat">Lbs Lost</div>
        <div class="leaderboard-stat">Current</div>
      </div>
    `;
  },

  // Progress ring for visual metric display
  progressRing: (percent, size = 100) => {
    const radius = size / 2 - 5;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return `
      <svg width="${size}" height="${size}" style="transform: rotate(-90deg)">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="4"></circle>
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#2563eb" stroke-width="4"
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset}; transition: stroke-dashoffset 0.3s ease;"></circle>
      </svg>
    `;
  },

  // Daily log summary card
  dailyLogCard: (date, log, participant) => {
    let html = `<div class="card">`;
    html += `<h4>${DateUtils.displayRelative(date)}</h4>`;

    if (log) {
      if (log.worked_out) {
        const minutes = log.workout_minutes ? ` (${log.workout_minutes} min)` : '';
        html += `<p>💪 Worked out${minutes}`;
        if (log.workout_notes) html += `: ${log.workout_notes}`;
        html += `</p>`;
      }

      if (log.drinks > 0) {
        html += `<p>🍷 ${log.drinks} drink${log.drinks !== 1 ? 's' : ''}</p>`;
      }

      if (log.notes) {
        html += `<p>${log.notes}</p>`;
      }

      if (!log.worked_out && log.drinks === 0 && !log.notes) {
        html += `<p class="text-muted">No activity logged</p>`;
      }
    } else {
      html += `<p class="text-muted">No log entry</p>`;
    }

    html += `</div>`;
    return html;
  },

  // Bet card
  betCard: (bet, targetName) => {
    const deadline = DateUtils.display(bet.deadline);
    const icon = bet.position === 'will_succeed' ? '✅' : '❌';

    let statusBadge = '';
    if (bet.status === 'open') {
      statusBadge = '<span class="badge badge-primary">Open</span>';
    } else if (bet.status === 'won') {
      statusBadge = '<span class="badge badge-success">Won</span>';
    } else {
      statusBadge = '<span class="badge badge-danger">Lost</span>';
    }

    return `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
          <div>
            <h4>${icon} ${bet.description}</h4>
            <p class="text-small text-muted">
              ${bet.created_by} → ${targetName} | Deadline: ${deadline}
            </p>
            <p class="text-small"><strong>${bet.stake} points</strong></p>
          </div>
          <div>${statusBadge}</div>
        </div>
      </div>
    `;
  },

  // Empty state
  emptyState: (message, icon = '📭') => {
    return `
      <div class="empty-state">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
        <h3>${message}</h3>
      </div>
    `;
  },

  // Loading spinner
  spinner: () => {
    return `<p class="loading-text">Loading...</p>`;
  }
};
