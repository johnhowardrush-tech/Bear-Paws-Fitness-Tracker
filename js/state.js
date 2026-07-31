// In-memory app state - mirrors the Firestore collections

const AppState = {
  participants: [],
  weigh_ins: [],
  blood_pressures: [],
  daily_logs: [],
  bets: [],

  // Seed from the local JSON so the UI has something before Firestore answers
  init: async () => {
    try {
      const response = await fetch('data/participants.json');
      AppState.participants = await response.json();
    } catch (error) {
      console.error('Could not load seed participants:', error);
      AppState.participants = [];
    }

    AppState.weigh_ins = [];
    AppState.blood_pressures = [];
    AppState.daily_logs = [];
    AppState.bets = [];
  },

  // Offline fallbacks - keep one record per participant+date
  setWeighIn: (weigh_in) => {
    const idx = AppState.weigh_ins.findIndex(w =>
      w.participant_id === weigh_in.participant_id && w.date === weigh_in.date
    );
    if (idx !== -1) AppState.weigh_ins.splice(idx, 1);
    AppState.weigh_ins.push(weigh_in);
  },

  setBloodPressure: (reading) => {
    const idx = AppState.blood_pressures.findIndex(b =>
      b.participant_id === reading.participant_id && b.date === reading.date
    );
    if (idx !== -1) AppState.blood_pressures.splice(idx, 1);
    AppState.blood_pressures.push(reading);
  },

  setDailyLog: (daily_log) => {
    const idx = AppState.daily_logs.findIndex(d =>
      d.participant_id === daily_log.participant_id && d.date === daily_log.date
    );
    if (idx !== -1) AppState.daily_logs.splice(idx, 1);
    AppState.daily_logs.push(daily_log);
  },

  setBet: (bet) => {
    const idx = AppState.bets.findIndex(b => b.id === bet.id);
    if (idx !== -1) AppState.bets.splice(idx, 1);
    AppState.bets.push(bet);
  },

  clear: () => {
    AppState.weigh_ins = [];
    AppState.blood_pressures = [];
    AppState.daily_logs = [];
    AppState.bets = [];
  }
};
