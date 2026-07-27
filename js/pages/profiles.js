// Profiles page - individual participant pages

let editingProfile = null;

function renderProfiles() {
  const container = document.getElementById('profiles-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found', '🤔');
    return;
  }

  let html = '<div class="grid grid-2">';

  participants.forEach(p => {
    const currentWeight = Store.getCurrentWeight(p.name);
    const metrics = FitnessMetrics.getMetrics(p, currentWeight);
    const history = Store.getWeightHistory(p.name);
    const recentLogs = Store.getRecentLogs(p.name, 7);

    const chartId = `chart-${p.name.replace(/\s+/g, '-')}`;
    const isEditing = editingProfile === p.name;

    html += `<div class="card">`;

    // Header
    html += `<h3>${p.name}</h3>`;
    html += `<p class="text-muted text-small">Started ${DateUtils.display(p.start_date)}</p>`;

    if (isEditing) {
      // Edit mode
      const feet = Math.floor(p.height_inches / 12);
      const inches = p.height_inches % 12;
      html += `<div style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">`;
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;">Height (inches total)</label>`;
      html += `<input type="number" id="edit-height-${p.name}" value="${p.height_inches}" min="36" max="96" step="1" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem;">`;
      html += `<p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">Currently ${feet}'${inches}"</p>`;
      html += `</div>`;
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;">Starting Weight (lbs)</label>`;
      html += `<input type="number" id="edit-start-${p.name}" value="${p.start_weight_lbs}" step="0.1" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem;">`;
      html += `</div>`;
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;">Current Weight (lbs)</label>`;
      html += `<input type="number" id="edit-current-${p.name}" value="${currentWeight.toFixed(1)}" step="0.1" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem;">`;
      html += `</div>`;
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;">Goal Weight (lbs)</label>`;
      html += `<input type="number" id="edit-goal-${p.name}" value="${p.goal_weight_lbs || ''}" step="0.1" placeholder="Optional" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem;">`;
      html += `</div>`;
      html += `<div style="display: flex; gap: 0.5rem;">`;
      html += `<button class="btn btn-success btn-small" onclick="saveProfileEdit('${p.name}')">Save</button>`;
      html += `<button class="btn btn-secondary btn-small" onclick="cancelProfileEdit()">Cancel</button>`;
      html += `</div>`;
      html += `</div>`;
    } else {
      // View mode
      const feet = Math.floor(p.height_inches / 12);
      const inches = p.height_inches % 12;
      html += `<div class="card-row">`;
      html += `<span class="card-label">Height</span>`;
      html += `<span class="card-value">${feet}'${inches}"</span>`;
      html += `</div>`;

      html += `<div class="card-row">`;
      html += `<span class="card-label">Starting Weight</span>`;
      html += `<span class="card-value">${p.start_weight_lbs} lbs</span>`;
      html += `</div>`;

      html += `<div class="card-row">`;
      html += `<span class="card-label">Current Weight</span>`;
      html += `<span class="card-value primary">${currentWeight.toFixed(1)} lbs</span>`;
      html += `</div>`;

      if (p.goal_weight_lbs) {
        const remaining = currentWeight - p.goal_weight_lbs;
        html += `<div class="card-row">`;
        html += `<span class="card-label">Goal Weight</span>`;
        html += `<span class="card-value">${p.goal_weight_lbs} lbs</span>`;
        html += `</div>`;
        html += `<div class="card-row">`;
        html += `<span class="card-label">To Goal</span>`;
        html += `<span class="card-value ${remaining > 0 ? 'warning' : 'success'}">${remaining > 0 ? '+' : ''}${remaining.toFixed(1)} lbs</span>`;
        html += `</div>`;
      }

      html += `<button class="btn btn-secondary btn-small" onclick="startProfileEdit('${p.name}')" style="margin-top: 1rem; width: 100%;">✏️ Edit</button>`;
    }

    html += `<hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb;">`;

    // Progress metrics
    html += `<div class="card-row">`;
    html += `<span class="card-label">% Lost (Fair Metric)</span>`;
    html += `<span class="card-value primary">${metrics.percent_lost}%</span>`;
    html += `</div>`;

    html += `<div class="card-row">`;
    html += `<span class="card-label">Absolute Loss</span>`;
    html += `<span class="card-value">${metrics.lbs_lost} lbs</span>`;
    html += `</div>`;

    html += `<div class="card-row">`;
    html += `<span class="card-label">Starting BMI</span>`;
    html += `<span class="card-value">${metrics.start_bmi}</span>`;
    html += `</div>`;

    html += `<div class="card-row">`;
    html += `<span class="card-label">Current BMI</span>`;
    html += `<span class="card-value">${metrics.current_bmi}</span>`;
    html += `</div>`;

    html += `<div class="card-row">`;
    html += `<span class="card-label">BMI Change</span>`;
    html += `<span class="card-value success">−${metrics.bmi_change}</span>`;
    html += `</div>`;

    // Weight chart
    if (history.length > 1) {
      const dates = history.map(w => w.date);
      const weights = history.map(w => w.weight_lbs);

      html += `<div class="chart-container">`;
      html += `<canvas id="${chartId}"></canvas>`;
      html += `</div>`;
    }

    // Recent activity
    html += `<h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Recent Activity</h4>`;

    if (recentLogs.length === 0) {
      html += `<p class="text-muted text-small">No activity logged in the past week</p>`;
    } else {
      recentLogs.slice(0, 3).forEach(log => {
        const parts = [];
        if (log.worked_out) {
          const mins = log.workout_minutes ? ` (${log.workout_minutes} min)` : '';
          parts.push(`💪 Worked out${mins}`);
        }
        if (log.drinks > 0) {
          parts.push(`🍷 ${log.drinks} drink${log.drinks !== 1 ? 's' : ''}`);
        }
        if (log.notes) {
          parts.push(`📝 ${log.notes}`);
        }

        if (parts.length > 0) {
          html += `<p class="text-small text-muted">${DateUtils.displayRelative(log.date)}: ${parts.join(' • ')}</p>`;
        }
      });
    }

    html += `</div>`;
  });

  html += '</div>';

  container.innerHTML = html;

  // Initialize charts after rendering
  setTimeout(() => {
    participants.forEach(p => {
      const chartId = `chart-${p.name.replace(/\s+/g, '-')}`;
      const history = Store.getWeightHistory(p.name);

      if (history.length > 1) {
        const dates = history.map(w => w.date);
        const weights = history.map(w => w.weight_lbs);

        ChartUtils.createWeightChart(chartId, dates, weights, p.name);
      }
    });
  }, 100);
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
  const heightEl = document.getElementById(`edit-height-${participantName}`);
  const startWeightEl = document.getElementById(`edit-start-${participantName}`);
  const currentWeightEl = document.getElementById(`edit-current-${participantName}`);
  const goalWeightEl = document.getElementById(`edit-goal-${participantName}`);

  const height = parseInt(heightEl.value);
  const startWeight = parseFloat(startWeightEl.value);
  const currentWeight = parseFloat(currentWeightEl.value);
  const goalWeight = goalWeightEl.value ? parseFloat(goalWeightEl.value) : null;

  if (!height || !startWeight || !currentWeight) {
    alert('Height, start weight, and current weight are required');
    return;
  }

  if (isNaN(height) || isNaN(startWeight) || isNaN(currentWeight)) {
    alert('Invalid values');
    return;
  }

  if (height < 36 || height > 96) {
    alert('Height must be between 36 and 96 inches');
    return;
  }

  try {
    // Update participant height, starting weight, and goal
    await Store.updateParticipant(participantName, {
      height_inches: height,
      start_weight_lbs: startWeight,
      goal_weight_lbs: goalWeight
    });

    // If current weight differs from starting weight, add a weigh-in
    if (currentWeight !== startWeight) {
      await Store.addWeighIn(participantName, DateUtils.today(), currentWeight);
    }

    editingProfile = null;
    renderProfiles();
    alert('Profile updated!');
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Error updating profile. Check console.');
  }
}
