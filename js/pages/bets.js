// Bets - friendly wagers in virtual points

function renderBets() {
  const container = document.getElementById('bets-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found');
    return;
  }

  const options = participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  const betBoard = Store.getBetLeaderboard();

  // Next Sunday as a sensible default deadline
  const deadline = DateUtils.nextSunday();

  let html = `
    <h3>Bet points</h3>
    <div class="grid grid-3 mb-lg">
      ${betBoard.map((entry, idx) => `
        <div class="stat-tile">
          <div class="stat-value">${entry.points}</div>
          <div class="stat-label">${idx === 0 ? 'Leader &middot; ' : ''}${entry.name}</div>
          <p class="text-small text-dim mt-xs">
            ${entry.record} record${entry.open ? ` &middot; ${entry.open} at stake` : ''}
          </p>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <h3>Place a bet</h3>
      <form id="new-bet-form" class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="bet-creator">You are</label>
            <select id="bet-creator" required>
              <option value="">Select...</option>${options}
            </select>
          </div>
          <div class="form-group">
            <label for="bet-target">Betting about</label>
            <select id="bet-target" required>
              <option value="">Select...</option>${options}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="bet-metric">Metric</label>
            <select id="bet-metric" required>
              <option value="weight">Weight / % body weight</option>
              <option value="bp">Blood pressure (MAP)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="bet-position">Your call</label>
            <select id="bet-position" required>
              <option value="will_succeed">They WILL hit it</option>
              <option value="will_fail">They will MISS it</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="bet-description">The goal</label>
          <textarea id="bet-description" required
                    placeholder="Loses 5 lbs by Sunday / drops 8 MAP points by the end of the month"></textarea>
          <span class="form-hint" id="bet-hint">
            Tie it to something checkable — a target weight, a percent, or a MAP drop.
          </span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="bet-deadline">Deadline</label>
            <input type="date" id="bet-deadline" value="${deadline}" required>
          </div>
          <div class="form-group">
            <label for="bet-stake">Stake (points)</label>
            <input type="number" id="bet-stake" min="1" max="500" value="20" required>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">Place bet</button>
        <p id="bet-status" class="text-small text-center text-muted"></p>
      </form>
    </div>
  `;

  // ---- Open bets ----
  const openBets = Store.getOpenBets();
  html += '<h3 class="mt-lg">Open bets</h3>';

  if (openBets.length === 0) {
    html += Components.emptyState('No open bets', 'Be the first to call someone out.');
  } else {
    openBets.forEach(bet => {
      const takeControls = bet.taken_by
        ? ''
        : `
          <div class="toolbar mt-sm">
            <select id="take-${bet.id}">
              <option value="">Take the other side...</option>
              ${participants
                .filter(p => p.name !== bet.created_by)
                .map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-small" onclick="takeBet('${bet.id}')">
              Match ${bet.stake} pts
            </button>
          </div>
        `;

      const resolveControls = `
        <div class="toolbar mt-sm">
          <span class="text-small text-dim">Resolve:</span>
          <button class="btn btn-success btn-small" onclick="resolveBet('${bet.id}', 'won')">
            ${bet.created_by} was right
          </button>
          <button class="btn btn-danger btn-small" onclick="resolveBet('${bet.id}', 'lost')">
            ${bet.created_by} was wrong
          </button>
        </div>
      `;

      html += Components.betCard(bet, takeControls + resolveControls);
    });
  }

  // ---- Settled bets ----
  const settled = Store.getAllBets().filter(b => b.status !== 'open');
  if (settled.length > 0) {
    html += '<h3 class="mt-lg">Settled</h3>';
    settled
      .slice()
      .sort((a, b) => DateUtils.compare(b.resolved_date || '', a.resolved_date || ''))
      .forEach(bet => { html += Components.betCard(bet); });
  }

  container.innerHTML = html;

  // Swap the placeholder text to match the chosen metric
  const metricSelect = document.getElementById('bet-metric');
  const hint = document.getElementById('bet-hint');
  const description = document.getElementById('bet-description');

  metricSelect.addEventListener('change', () => {
    if (metricSelect.value === 'bp') {
      description.placeholder = 'Drops 8 MAP points by the end of the month';
      hint.innerHTML = 'MAP = diastolic + (systolic - diastolic) / 3. Bet on the points dropped from their baseline.';
    } else {
      description.placeholder = 'Loses 5 lbs by Sunday';
      hint.textContent = 'Tie it to something checkable — a target weight or a percent.';
    }
  });

  const form = document.getElementById('new-bet-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const status = document.getElementById('bet-status');
    const creator = document.getElementById('bet-creator').value;
    const target = document.getElementById('bet-target').value;
    const metric = metricSelect.value;
    const position = document.getElementById('bet-position').value;
    const desc = description.value.trim();
    const deadlineValue = document.getElementById('bet-deadline').value;
    const stake = parseInt(document.getElementById('bet-stake').value);

    const fail = (message) => {
      status.textContent = message;
      status.className = 'text-small text-center text-danger';
    };

    if (!creator || !target) return fail('Pick both people.');
    if (creator === target) return fail("You can't bet on yourself.");
    if (!desc) return fail('Describe the goal.');
    if (!stake || stake < 1) return fail('Stake must be at least 1 point.');

    const creatorPoints = betBoard.find(entry => entry.name === creator);
    if (creatorPoints && stake > creatorPoints.points) {
      return fail(`${creator} only has ${creatorPoints.points} points.`);
    }

    try {
      await Store.addBet(creator, target, desc, deadlineValue, position, stake, metric);
      status.textContent = 'Bet placed.';
      status.className = 'text-small text-center text-success';
      form.reset();
      document.getElementById('bet-deadline').value = deadline;
      UI.render();
    } catch (error) {
      console.error('Bet failed:', error);
      fail('Could not place the bet. Try again.');
    }
  });
}

async function takeBet(betId) {
  const select = document.getElementById(`take-${betId}`);
  const taker = select ? select.value : '';
  if (!taker) return;

  const bet = Store.getAllBets().find(b => b.id === betId);
  if (!bet) return;

  if (taker === bet.created_by) {
    alert("You can't take your own bet.");
    return;
  }

  try {
    await Store.updateBet(betId, { taken_by: taker });
    UI.render();
  } catch (error) {
    console.error('Could not take bet:', error);
    alert('Could not take that bet. Try again.');
  }
}

async function resolveBet(betId, status) {
  const bet = Store.getAllBets().find(b => b.id === betId);
  if (!bet) return;

  const verdict = status === 'won'
    ? `${bet.created_by} called it right`
    : `${bet.created_by} called it wrong`;

  if (!window.confirm(`Settle this bet: ${verdict}?`)) return;

  try {
    await Store.updateBet(betId, { status, resolved_date: DateUtils.today() });
    UI.render();
  } catch (error) {
    console.error('Could not resolve bet:', error);
    alert('Could not settle that bet. Try again.');
  }
}
