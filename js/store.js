// Firestore data operations

const Store = {
  // Add a new weigh-in
  addWeighIn: async (participant_id, date, weight_lbs) => {
    return FirebaseInit.addWeighIn(participant_id, date, weight_lbs);
  },

  // Add or update a daily log
  addDailyLog: async (participant_id, date, logData) => {
    return FirebaseInit.addDailyLog(participant_id, date, logData);
  },

  // Add a new bet
  addBet: async (created_by, target_participant_id, description, deadline, position, stake) => {
    return FirebaseInit.addBet({
      created_by,
      target_participant_id,
      description,
      deadline,
      position,
      stake: parseInt(stake),
      status: 'open',
      created_date: DateUtils.today()
    });
  },

  // Update a bet (resolve it)
  updateBet: async (betId, updates) => {
    return FirebaseInit.updateBet(betId, updates);
  },

  // Get all participants
  getParticipants: () => {
    return AppState.participants;
  },

  // Get participant by name
  getParticipantByName: (name) => {
    return AppState.participants.find(p => p.name === name);
  },

  // Get current weight for a participant
  getCurrentWeight: (participantId) => {
    const weighIns = AppState.weigh_ins.filter(w => w.participant_id === participantId);
    if (weighIns.length === 0) {
      const p = AppState.participants.find(p => p.id === participantId || p.name === participantId);
      return p ? p.start_weight_lbs : null;
    }
    weighIns.sort((a, b) => DateUtils.compare(b.date, a.date));
    return weighIns[0].weight_lbs;
  },

  // Get weight history for a participant
  getWeightHistory: (participantId) => {
    const p = AppState.participants.find(p => p.id === participantId || p.name === participantId);
    if (!p) return [];

    // Start with initial weigh-in from start_date
    const history = [{
      date: p.start_date,
      weight_lbs: p.start_weight_lbs
    }];

    // Add all weigh-ins for this participant
    const weighIns = AppState.weigh_ins.filter(w => w.participant_id === p.name || w.participant_id === p.id);
    history.push(...weighIns);

    // Sort by date ascending
    history.sort((a, b) => DateUtils.compare(a.date, b.date));

    return history;
  },

  // Get daily log for a participant on a specific date
  getDailyLog: (participantId, date) => {
    return AppState.daily_logs.find(d =>
      (d.participant_id === participantId || d.participant_id === participantId) && d.date === date
    );
  },

  // Get recent daily logs for a participant
  getRecentLogs: (participantId, days = 7) => {
    const today = DateUtils.today();
    const cutoff = DateUtils.subtractDays(today, days);

    const logs = AppState.daily_logs.filter(d =>
      (d.participant_id === participantId) &&
      DateUtils.compare(d.date, cutoff) >= 0
    );

    logs.sort((a, b) => DateUtils.compare(b.date, a.date));
    return logs;
  },

  // Get all bets
  getAllBets: () => {
    return AppState.bets;
  },

  // Get open bets
  getOpenBets: () => {
    return AppState.bets.filter(b => b.status === 'open');
  },

  // Get bets related to a participant
  getBetsForParticipant: (participantId) => {
    return AppState.bets.filter(b => b.target_participant_id === participantId);
  },

  // Get bet points for each participant
  getBetLeaderboard: () => {
    const leaderboard = {};

    AppState.participants.forEach(p => {
      leaderboard[p.name] = {
        name: p.name,
        points: 100 // Starting points
      };
    });

    // Subtract/add based on resolved bets
    AppState.bets.forEach(bet => {
      if (bet.status === 'won' || bet.status === 'lost') {
        // Creator loses stake if bet lost
        if (bet.status === 'lost') {
          leaderboard[bet.created_by].points -= bet.stake;
        }
        // Creator gains if bet won
        else if (bet.status === 'won') {
          leaderboard[bet.created_by].points += bet.stake;
        }
      }
    });

    // Sort by points descending
    return Object.values(leaderboard).sort((a, b) => b.points - a.points);
  },

  // Update participant data
  updateParticipant: async (participantId, updates) => {
    return FirebaseInit.updateParticipant(participantId, updates);
  }
};
