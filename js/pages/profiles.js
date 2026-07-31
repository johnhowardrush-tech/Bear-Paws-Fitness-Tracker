// Profiles - one card per participant, with inline editing

let editingProfile = null;

function renderProfiles() {
  const container = document.getElementById('profiles-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found');
    return;
  }

  let html = '<div class="grid grid-2">';

  participants.forEach(p => {
    const { currentWeight, currentBp, startBp, metrics } = Store.getScorecard(p);
    const history = Store.getWeightHistory(p.name);
    const recentLogs = Store.getRecentLogs(p.name, 7);
    const chartId = `chart-${p.name.replace(/\s+/g, '-')}`;
    const isEditing = editingProfile === p.name;

    const feet = Math.floor(p.height_inches / 12);
    const inches = p.height_inches % 12;

    html += '<div class="card">';
    html += `<h3>${p.name}</h3>`;
    html += `<p class="text-small text-dim">Started ${DateUtils.display(p.start_date)}</p>`;

    if (isEditing) {
      html += `
        <div class="form-box mt-sm">
          <div class="form-group">
            <label>Height (total inches)</label>
            <input type="number" id="edit-height-${p.name}" value="${p.height_inches}"
                   min="36" max="96" step="1">
            <span class="form-hint">Currently ${feet}'${inches}"</span>
          </div>
          <div class="form-group">
            <label>Starting weight (lbs)</label>
            <input type="number" id="edit-start-${p.name}" value="${p.start_weight_lbs}" step="0.1">
            <span class="form-hint">Your baseline. Everything is measured against this.</span>
          </div>
          <div class="form-group">
            <label>Current weight (lbs)</label>
            <input type="number" id="edit-current-${p.name}" value="${currentWeight.toFixed(1)}" step="0.1">
            <span class="form-hint">Saves as today's weigh-in.</span>
          </div>
          <div class="form-group">
            <label>Goal weight (lbs)</label>
            <input type="number" id="edit-goal-${p.name}" value="${p.goal_weight_lbs || ''}"
                   step="0.1" placeholder="Optional">
          </div>
          <div class="form-group">
            <label>Starting blood pressure</label>
            <div class="form-row">
              <input type="number" id="edit-sys-${p.name}"
                     value="${p.start_systolic || (startBp ? startBp.systolic : '')}"
                     min="60" max="260" placeholder="Systolic">
              <input type="number" id="edit-dia-${p.name}"
                     value="${p.start_diastolic || (startBp ? startBp.diastolic : '')}"
                     min="30" max="180" placeholder="Diastolic">
            </div>
            <span class="form-hint">Your BP baseline. Leave blank to use your first logged reading.</span>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-success btn-small" onclick="saveProfileEdit('${p.name}')">Save</button>
            <button class="btn btn-secondary btn-small" onclick="cancelProfileEdit()">Cancel</button>
          </div>
          <p class="text-small text-danger hidden" id="edit-error-${p.name}"></p>
        </div>
      `;
    } else {
      html += Components.statRow('Height', `${feet}'${inches}"`);
      html += Components.statRow('Starting weight', `${p.start_weight_lbs} lbs`);
      html += Components.statRow('Current weight', `${currentWeight.toFixed(1)} lbs`, 'primary');

      if (p.goal_weight_lbs) {
        const toGoal = currentWeight - p.goal_weight_lbs;
        html += Components.statRow('Goal weight', `${p.goal_weight_lbs} lbs`);
        html += Components.statRow(
          'To goal',
          toGoal > 0 ? `${toGoal.toFixed(1)} lbs to go` : 'Goal reached',
          toGoal > 0 ? 'warning' : 'success'
        );
      }

      html += '<hr class="divider">';

      html += '<div class="section-label">Progress</div>';
      html += Components.statRow(
        'Body weight change',
        FitnessMetrics.formatSignedPercent(metrics.percent_change),
        FitnessMetrics.toneFor(metrics.percent_change)
      );
      html += Components.statRow(
        'Pounds change',
        FitnessMetrics.formatSigned(metrics.weight_change, 'lbs'),
        FitnessMetrics.toneFor(metrics.weight_change)
      );
      html += Components.statRow('Starting BMI', metrics.start_bmi.toFixed(1));
      html += Components.statRow('Current BMI', metrics.current_bmi.toFixed(1));
      html += Components.statRow(
        'BMI change',
        FitnessMetrics.formatSigned(metrics.bmi_change, '', 2),
        FitnessMetrics.toneFor(metrics.bmi_change)
      );

      html += '<hr class="divider">';

      html += `<div class="section-label">Blood pressure ${Components.bpBadge(metrics)}</div>`;
      if (currentBp) {
        html += Components.statRow(
          'Latest reading',
          `${FitnessMetrics.formatBp(metrics.systolic, metrics.diastolic)} <span class="text-dim text-small">(${DateUtils.displayRelative(currentBp.date)})</span>`,
          metrics.bp_category.tone
        );
        html += Components.statRow('MAP', metrics.map.toFixed(1));
        if (startBp) {
          html += Components.statRow(
            'Baseline',
            FitnessMetrics.formatBp(startBp.systolic, startBp.diastolic)
          );
        }
        if (metrics.map_change !== null) {
          html += Components.statRow(
            'MAP change',
            FitnessMetrics.formatSigned(metrics.map_change, 'pts'),
            FitnessMetrics.toneFor(metrics.map_change)
          );
        }
      } else {
        html += '<p class="text-small text-dim">No blood pressure logged yet. Add one on the Check In tab.</p>';
      }

      html += `<button class="btn btn-secondary btn-small btn-block mt-md"
                       onclick="startProfileEdit('${p.name}')">Edit stats</button>`;
    }

    // Weight chart
    if (history.length > 1) {
      html += `<div class="chart-container"><canvas id="${chartId}"></canvas></div>`;
    }

    html += '<div class="section-label mt-md">Last 7 days</div>';
    if (recentLogs.length === 0) {
      html += '<p class="text-small text-dim">Nothing logged this week.</p>';
    } else {
      recentLogs.slice(0, 4).forEach(log => {
        const parts = [];
        if (log.worked_out) {
          parts.push(`worked out${log.workout_minutes ? ` ${log.workout_minutes} min` : ''}`);
        }
        if (log.drinks > 0) parts.push(`${log.drinks} drink${log.drinks !== 1 ? 's' : ''}`);
        if (log.notes) parts.push(log.notes);
        html += `<p class="text-small text-muted">
          <strong>${DateUtils.displayRelative(log.date)}</strong> — ${parts.length ? parts.join(' &middot; ') : 'rest day'}
        </p>`;
      });
    }

    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;

  // Charts need the canvases in the DOM first
  setTimeout(() => {
    participants.forEach(p => {
      const history = Store.getWeightHistory(p.name);
      if (history.length > 1) {
        ChartUtils.createWeightChart(
          `chart-${p.name.replace(/\s+/g, '-')}`,
          history.map(w => w.date),
          history.map(w => w.weight_lbs)
        );
      }
    });
  }, 50);
}

function startProfileEdit(participantName) {
  editingProfile = participantName;
  renderProfiles();
}

function cancelProfileEdit() {
  editingProfile = null;
  renderProfiles();
}

async function saveProfileEdit(participantName) {
  const val = (prefix) => document.getElementById(`edit-${prefix}-${participantName}`).value;
  const errorEl = document.getElementById(`edit-error-${participantName}`);

  const fail = (message) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  };

  const height = parseInt(val('height'));
  const startWeight = parseFloat(val('start'));
  const currentWeight = parseFloat(val('current'));
  const goalWeight = val('goal') ? parseFloat(val('goal')) : null;
  const startSys = val('sys') ? parseInt(val('sys')) : null;
  const startDia = val('dia') ? parseInt(val('dia')) : null;

  if (!height || isNaN(height) || height < 36 || height > 96) {
    return fail('Height must be between 36 and 96 inches.');
  }
  if (!startWeight || isNaN(startWeight)) return fail('Starting weight is required.');
  if (!currentWeight || isNaN(currentWeight)) return fail('Current weight is required.');
  if ((startSys && !startDia) || (startDia && !startSys)) {
    return fail('Starting blood pressure needs both numbers.');
  }
  if (startSys && startDia && startDia >= startSys) {
    return fail('Systolic should be higher than diastolic.');
  }

  try {
    await Store.updateParticipant(participantName, {
      height_inches: height,
      start_weight_lbs: startWeight,
      goal_weight_lbs: goalWeight,
      start_systolic: startSys,
      start_diastolic: startDia
    });

    // Record current weight as today's weigh-in
    await Store.addWeighIn(participantName, DateUtils.today(), currentWeight);

    editingProfile = null;
    UI.render();
  } catch (error) {
    console.error('Error updating profile:', error);
    fail('Save failed. Check your connection and try again.');
  }
}
