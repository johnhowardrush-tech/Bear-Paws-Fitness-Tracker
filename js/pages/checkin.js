// Daily Check-in page - data entry

function renderCheckin() {
  const container = document.getElementById('checkin-content');
  const participants = Store.getParticipants();

  if (participants.length === 0) {
    container.innerHTML = Components.emptyState('No participants found', '🤔');
    return;
  }

  const today = DateUtils.today();
  let selectedPerson = '';
  let selectedDate = today;

  let html = `
    <form id="checkin-form" class="form">
      <div class="form-row">
        <div class="form-group">
          <label>Who are you?</label>
          <select id="person-select" required>
            <option value="">Select a person...</option>
            ${participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="checkin-date" value="${today}" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" id="worked-out-checkbox">
          <span>I worked out today</span>
        </label>
      </div>

      <div id="workout-details" class="hidden">
        <div class="form-group">
          <label>Minutes (optional)</label>
          <input type="number" id="workout-minutes" min="0" placeholder="30">
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="workout-notes" placeholder="What did you do?"></textarea>
        </div>
      </div>

      <div class="form-group">
        <label>Drinks today (alcoholic)</label>
        <input type="number" id="drinks-count" min="0" value="0" required>
      </div>

      <div class="form-group">
        <label>General notes (optional)</label>
        <textarea id="general-notes" placeholder="How are you feeling? Anything else to note?"></textarea>
      </div>

      <div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" id="weigh-in-checkbox">
          <span>Record a weigh-in</span>
        </label>
      </div>

      <div id="weigh-in-details" class="hidden">
        <div class="form-group">
          <label>Weight (lbs)</label>
          <input type="number" id="weight-input" step="0.1" placeholder="180.5" required>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block">Save Check-in</button>
    </form>
  `;

  container.innerHTML = html;

  // Event listeners
  const workedOutCheckbox = document.getElementById('worked-out-checkbox');
  const workoutDetails = document.getElementById('workout-details');
  workedOutCheckbox.addEventListener('change', () => {
    workoutDetails.classList.toggle('hidden');
  });

  const weighInCheckbox = document.getElementById('weigh-in-checkbox');
  const weighInDetails = document.getElementById('weigh-in-details');
  weighInCheckbox.addEventListener('change', () => {
    weighInDetails.classList.toggle('hidden');
  });

  const form = document.getElementById('checkin-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const person = document.getElementById('person-select').value;
    const date = document.getElementById('checkin-date').value;
    const workedOut = document.getElementById('worked-out-checkbox').checked;
    const workoutMinutes = workedOut ? parseInt(document.getElementById('workout-minutes').value || 0) : null;
    const workoutNotes = workedOut ? document.getElementById('workout-notes').value : null;
    const drinksCount = parseInt(document.getElementById('drinks-count').value || 0);
    const generalNotes = document.getElementById('general-notes').value;
    const weighIn = document.getElementById('weigh-in-checkbox').checked;
    const weight = weighIn ? parseFloat(document.getElementById('weight-input').value) : null;

    if (!person) {
      alert('Please select a person');
      return;
    }

    // Save daily log
    await Store.addDailyLog(person, date, {
      worked_out: workedOut,
      workout_minutes: workoutMinutes,
      workout_notes: workoutNotes,
      drinks: drinksCount,
      notes: generalNotes
    });

    // Save weigh-in if provided
    if (weighIn && weight) {
      await Store.addWeighIn(person, date, weight);
    }

    // Show success message and reset form
    alert('Check-in saved!');
    form.reset();
    workoutDetails.classList.add('hidden');
    weighInDetails.classList.add('hidden');

    // Trigger a dashboard update after a short delay
    setTimeout(() => {
      UI.render();
    }, 500);
  });
}
