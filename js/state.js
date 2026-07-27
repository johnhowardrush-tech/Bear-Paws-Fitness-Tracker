// In-memory app state

const AppState = {
  participants: [],
  weigh_ins: [],
  daily_logs: [],
  bets: [],

  // Initialize state with seed data
  init: async () => {
    // Load seed data
    const response = await fetch('data/participants.json');
    const seedData = await response.json();

    // Store as indexed maps for fast lookups
    AppState.participantsByName = {};
    AppState.participantsById = {};

    seedData.forEach(p => {
      AppState.participantsByName[p.name] = p;
      if (p.id) {
        AppState.participantsById[p.id] = p;
      }
    });

    AppState.participants = seedData;

    // Initialize empty collections for Firestore-synced data
    AppState.weigh_ins = [];
    AppState.daily_logs = [];
    AppState.bets = [];

    // Create lookup maps
    AppState.weigh_insByParticipantId = {};
    AppState.daily_logsByParticipantIdDate = {};
    AppState.betsByCreator = {};
  },

  // Add or update a weighin
  setWeighIn: (weigh_in) => {
    // Remove old entry if updating
    const idx = AppState.weigh_ins.findIndex(w =>
      w.participant_id === weigh_in.participant_id && w.date === weigh_in.date
    );
    if (idx !== -1) AppState.weigh_ins.splice(idx, 1);

    AppState.weigh_ins.push(weigh_in);
  },

  // Get latest weight for a participant
  getCurrentWeight: (participant_id) => {
    const weighIns = AppState.weigh_ins.filter(w => w.participant_id === participant_id);
    if (weighIns.length === 0) return null;

    // Sort by date descending
    weighIns.sort((a, b) => DateUtils.compare(b.date, a.date));
    return weighIns[0].weight_lbs;
  },

  // Get all weight history for a participant, sorted by date ascending
  getWeightHistory: (participant_id) => {
    const weighIns = AppState.weigh_ins.filter(w => w.participant_id === participant_id);
    weighIns.sort((a, b) => DateUtils.compare(a.date, b.date));
    return weighIns;
  },

  // Add or update a daily log
  setDailyLog: (daily_log) => {
    // Remove old entry if updating
    const idx = AppState.daily_logs.findIndex(d =>
      d.participant_id === daily_log.participant_id && d.date === daily_log.date
    );
    if (idx !== -1) AppState.daily_logs.splice(idx, 1);

    AppState.daily_logs.push(daily_log);
  },

  // Get daily log for a specific date
  getDailyLog: (participant_id, date) => {
    return AppState.daily_logs.find(d =>
      d.participant_id === participant_id && d.date === date
    );
  },

  // Get recent daily logs for a participant
  getRecentLogs: (participant_id, days = 7) => {
    const today = DateUtils.today();
    const cutoff = DateUtils.subtractDays(today, days);

    const logs = AppState.daily_logs.filter(d =>
      d.participant_id === participant_id && DateUtils.compare(d.date, cutoff) >= 0
    );

    logs.sort((a, b) => DateUtils.compare(b.date, a.date));
    return logs;
  },

  // Add or update a bet
  setBet: (bet) => {
    const idx = AppState.bets.findIndex(b => b.id === bet.id);
    if (idx !== -1) AppState.bets.splice(idx, 1);
    AppState.bets.push(bet);
  },

  // Get all bets
  getAllBets: () => {
    return AppState.bets;
  },

  // Get open bets
  getOpenBets: () => {
    return AppState.bets.filter(b => b.status === 'open');
  },

  // Get bets for a specific participant
  getBetsForParticipant: (participant_id) => {
    return AppState.bets.filter(b => b.target_participant_id === participant_id);
  },

  // Clear all data (for testing)
  clear: () => {
    AppState.weigh_ins = [];
    AppState.daily_logs = [];
    AppState.bets = [];
  }
};
