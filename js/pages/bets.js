// Bets page - betting system

function renderBets() {
  const container = document.getElementById('bets-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found', '🤔');
    return;
  }

  let html = '';

  // Betting leaderboard
  html += '<h3>Bet Points Leaderboard</h3>';
  const betLeaderboard = Store.getBetLeaderboard();

  html += `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
  `;

  betLeaderboard.forEach((entry, idx) => {
    html += `
      <div class="card">
        <div style="text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">
            ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
          </div>
          <h4>${entry.name}</h4>
          <div style="font-size: 2rem; color: #2563eb; font-weight: bold;">
            ${entry.points}
          </div>
          <p class="text-small text-muted">points</p>
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Create new bet form
  html += `
    <div class="card">
      <h3>Place a New Bet</h3>
      <form id="new-bet-form" class="form">
        <div class="form-group">
          <label>I'm betting that</label>
          <select id="bet-creator" required>
            <option value="">Select who's making the bet...</option>
            ${participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>...about (target person)</label>
            <select id="bet-target" required>
              <option value="">Select target...</option>
              ${participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>...that they</label>
            <select id="bet-position" required>
              <option value="will_succeed">Will succeed</option>
              <option value="will_fail">Will fail</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Goal description (e.g., "loses 5 lbs by Sunday")</label>
          <textarea id="bet-description" required placeholder="Loses 5 lbs by end of week..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Deadline</label>
            <input type="date" id="bet-deadline" required>
          </div>

          <div class="form-group">
            <label>Stake (points)</label>
            <input type="number" id="bet-stake" min="1" value="20" required>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">Place Bet</button>
      </form>
    </div>
  `;

  // Set default deadline to next Sunday
  const nextSunday = new Date();
  do {
    nextSunday.setDate(nextSunday.getDate() + 1);
  } while (nextSunday.getDay() !== 0);

  // Open bets
  const openBets = Store.getOpenBets();

  html += '<h3 style="margin-top: 2rem;">Open Bets</h3>';

  if (openBets.length === 0) {
    html += Components.emptyState('No open bets yet', '🎲');
  } else {
    openBets.forEach(bet => {
      const targetName = bet.target_participant_id;
      html += Components.betCard(bet, targetName);

      // Action buttons
      html += `
        <div style="display: flex; gap: 0.5rem; margin: -0.5rem 0 1rem 0;">
          <button class="btn btn-success btn-small" onclick="resolveBet('${bet.id}', 'won')">✓ Won</button>
          <button class="btn btn-danger btn-small" onclick="resolveBet('${bet.id}', 'lost')">✗ Lost</button>
        </div>
      `;
    });
  }

  // Resolved bets (won and lost)
  const resolvedBets = Store.getAllBets().filter(b => b.status !== 'open');

  if (resolvedBets.length > 0) {
    html += '<h3 style="margin-top: 2rem;">Resolved Bets</h3>';
    resolvedBets.forEach(bet => {
      const targetName = bet.target_participant_id;
      html += Components.betCard(bet, targetName);
    });
  }

  container.innerHTML = html;

  // Set default deadline
  const deadlineInput = document.getElementById('bet-deadline');
  if (deadlineInput) {
    deadlineInput.value = DateUtils.format(nextSunday);
  }

  // Form submission
  const form = document.getElementById('new-bet-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const creator = document.getElementById('bet-creator').value;
      const target = document.getElementById('bet-target').value;
      const position = document.getElementById('bet-position').value;
      const description = document.getElementById('bet-description').value;
      const deadline = document.getElementById('bet-deadline').value;
      const stake = document.getElementById('bet-stake').value;

      if (!creator || !target || !description || !deadline || !stake) {
        alert('Please fill in all fields');
        return;
      }

      if (creator === target) {
        alert("You can't bet on yourself!");
        return;
      }

      await Store.addBet(creator, target, description, deadline, position, stake);
      alert('Bet placed!');
      form.reset();
      renderBets();
    });
  }
}

// Resolve a bet
async function resolveBet(betId, status) {
  const bet = Store.getAllBets().find(b => b.id === betId);
  if (!bet) return;

  const confirm = window.confirm(`Mark bet as ${status}?`);
  if (!confirm) return;

  await Store.updateBet(betId, {
    status,
    resolved_date: DateUtils.today()
  });

  renderBets();
}
