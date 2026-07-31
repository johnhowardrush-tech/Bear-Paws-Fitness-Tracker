// Daily Check-in - the data entry screen

function renderCheckin() {
  const container = document.getElementById('checkin-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found', 'question');
    return;
  }

  const today = DateUtils.today();

  container.innerHTML = `
    <div class="callout">
      Weight is required on every check-in so the leaderboard stays honest.
      Blood pressure is optional, but logging it feeds the BP leaderboard.
    </div>

    <form id="checkin-form" class="form">
      <div class="form-row">
        <div class="form-group">
          <label for="person-select">Who are you? <span class="required-star">*</span></label>
          <select id="person-select" required>
            <option value="">Select a person...</option>
            ${participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="checkin-date">Date <span class="required-star">*</span></label>
          <input type="date" id="checkin-date" value="${today}" max="${today}" required>
        </div>
      </div>

      <div class="form-group">
        <label for="weight-input">Weight (lbs) <span class="required-star">*</span></label>
        <input type="number" id="weight-input" step="0.1" min="50" max="700"
               placeholder="180.5" required>
        <span class="form-hint">Step on the scale. This is what drives your ranking.</span>
      </div>

      <div class="form-group">
        <label>Blood pressure <span class="text-dim">(optional)</span></label>
        <div class="form-row">
          <input type="number" id="bp-systolic" min="60" max="260" placeholder="Systolic (e.g. 122)">
          <input type="number" id="bp-diastolic" min="30" max="180" placeholder="Diastolic (e.g. 78)">
        </div>
        <span class="form-hint" id="bp-preview">Enter both numbers to see your category.</span>
      </div>

      <hr class="divider">

      <div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" id="worked-out-checkbox">
          <span>I worked out today</span>
        </label>
      </div>

      <div id="workout-details" class="form-box hidden">
        <div class="form-group">
          <label for="workout-minutes">Minutes</label>
          <input type="number" id="workout-minutes" min="0" max="600" placeholder="30">
        </div>
        <div class="form-group">
          <label for="workout-notes">What did you do?</label>
          <textarea id="workout-notes" placeholder="Ran 3 miles, lifted, pickleball..."></textarea>
        </div>
      </div>

      <div class="form-group">
        <label for="drinks-count">Alcoholic drinks today</label>
        <input type="number" id="drinks-count" min="0" max="50" value="0" required>
      </div>

      <div class="form-group">
        <label for="general-notes">Notes <span class="text-dim">(optional)</span></label>
        <textarea id="general-notes" placeholder="How are you feeling?"></textarea>
      </div>

      <button type="submit" class="btn btn-primary btn-block" id="checkin-submit">
        Save Check-in
      </button>
      <p id="checkin-status" class="text-small text-center text-muted"></p>
    </form>
  `;

  const personSelect = document.getElementById('person-select');
  const dateInput = document.getElementById('checkin-date');
  const weightInput = document.getElementById('weight-input');
  const systolicInput = document.getElementById('bp-systolic');
  const diastolicInput = document.getElementById('bp-diastolic');
  const bpPreview = document.getElementById('bp-preview');
  const workedOutCheckbox = document.getElementById('worked-out-checkbox');
  const workoutDetails = document.getElementById('workout-details');
  const workoutMinutes = document.getElementById('workout-minutes');
  const workoutNotes = document.getElementById('workout-notes');
  const drinksCount = document.getElementById('drinks-count');
  const generalNotes = document.getElementById('general-notes');
  const status = document.getElementById('checkin-status');
  const submitBtn = document.getElementById('checkin-submit');
  const form = document.getElementById('checkin-form');

  workedOutCheckbox.addEventListener('change', () => {
    workoutDetails.classList.toggle('hidden', !workedOutCheckbox.checked);
  });

  // Live BP category so people see what their numbers mean
  const updateBpPreview = () => {
    const sys = parseInt(systolicInput.value);
    const dia = parseInt(diastolicInput.value);
    if (!sys || !dia) {
      bpPreview.textContent = 'Enter both numbers to see your category.';
      bpPreview.className = 'form-hint';
      return;
    }
    const cat = FitnessMetrics.bpCategory(sys, dia);
    const map = FitnessMetrics.map(sys, dia);
    bpPreview.textContent = `${sys}/${dia} — ${cat.label} (MAP ${map.toFixed(1)})`;
    bpPreview.className = `form-hint text-${cat.tone === 'muted' ? 'dim' : cat.tone}`;
  };

  systolicInput.addEventListener('input', updateBpPreview);
  diastolicInput.addEventListener('input', updateBpPreview);

  // Pull up whatever is already saved for this person+date so editing a past
  // day shows the existing values instead of a blank form
  const loadExisting = () => {
    const person = personSelect.value;
    const date = dateInput.value;
    if (!person || !date) return;

    const log = Store.getDailyLog(person, date);
    const weighIn = AppState.weigh_ins.find(w => w.participant_id === person && w.date === date);
    const bp = AppState.blood_pressures.find(b => b.participant_id === person && b.date === date);

    weightInput.value = weighIn ? weighIn.weight_lbs : '';
    systolicInput.value = bp ? bp.systolic : '';
    diastolicInput.value = bp ? bp.diastolic : '';
    updateBpPreview();

    workedOutCheckbox.checked = !!(log && log.worked_out);
    workoutDetails.classList.toggle('hidden', !workedOutCheckbox.checked);
    workoutMinutes.value = log && log.workout_minutes ? log.workout_minutes : '';
    workoutNotes.value = log && log.workout_notes ? log.workout_notes : '';
    drinksCount.value = log ? (log.drinks || 0) : 0;
    generalNotes.value = log && log.notes ? log.notes : '';

    if (log || weighIn) {
      status.textContent = `Editing your existing entry for ${DateUtils.displayRelative(date)} — saving will update it.`;
      status.className = 'text-small text-center text-muted';
    } else {
      status.textContent = '';
    }
  };

  personSelect.addEventListener('change', loadExisting);
  dateInput.addEventListener('change', loadExisting);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const person = personSelect.value;
    const date = dateInput.value;
    const weight = parseFloat(weightInput.value);
    const sys = systolicInput.value ? parseInt(systolicInput.value) : null;
    const dia = diastolicInput.value ? parseInt(diastolicInput.value) : null;

    if (!person) {
      status.textContent = 'Pick who you are first.';
      status.className = 'text-small text-center text-danger';
      return;
    }

    if (!weight || isNaN(weight)) {
      status.textContent = 'Weight is required.';
      status.className = 'text-small text-center text-danger';
      weightInput.focus();
      return;
    }

    // Both BP numbers or neither
    if ((sys && !dia) || (dia && !sys)) {
      status.textContent = 'Blood pressure needs both numbers (systolic and diastolic).';
      status.className = 'text-small text-center text-danger';
      return;
    }

    if (sys && dia && dia >= sys) {
      status.textContent = 'Systolic (top number) should be higher than diastolic.';
      status.className = 'text-small text-center text-danger';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await Store.addDailyLog(person, date, {
        worked_out: workedOutCheckbox.checked,
        workout_minutes: workedOutCheckbox.checked ? parseInt(workoutMinutes.value || 0) : null,
        workout_notes: workedOutCheckbox.checked ? (workoutNotes.value || null) : null,
        drinks: parseInt(drinksCount.value || 0),
        notes: generalNotes.value || null
      });

      await Store.addWeighIn(person, date, weight);

      if (sys && dia) {
        await Store.addBloodPressure(person, date, sys, dia);
      }

      status.textContent = `Saved ${person}'s check-in for ${DateUtils.displayRelative(date)}.`;
      status.className = 'text-small text-center text-success';

      form.reset();
      dateInput.value = today;
      workoutDetails.classList.add('hidden');
      updateBpPreview();
      UI.render();
    } catch (error) {
      console.error('Check-in save failed:', error);
      status.textContent = 'Save failed. Check your connection and try again.';
      status.className = 'text-small text-center text-danger';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Check-in';
    }
  });
}
