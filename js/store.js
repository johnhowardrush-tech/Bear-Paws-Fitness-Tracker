// Read/write layer over AppState + Firestore

const Store = {
  // ---- Writes ----

  addWeighIn: async (participant_id, date, weight_lbs) => {
    return FirebaseInit.addWeighIn(participant_id, date, weight_lbs);
  },

  addBloodPressure: async (participant_id, date, systolic, diastolic) => {
    return FirebaseInit.addBloodPressure(participant_id, date, systolic, diastolic);
  },

  addDailyLog: async (participant_id, date, logData) => {
    return FirebaseInit.addDailyLog(participant_id, date, logData);
  },

  addBet: async (created_by, target_participant_id, description, deadline, position, stake, metric) => {
    return FirebaseInit.addBet({
      created_by,
      target_participant_id,
      description,
      deadline,
      position,
      metric: metric || 'weight',
      stake: parseInt(stake),
      status: 'open',
      taken_by: null,
      created_date: DateUtils.today()
    });
  },

  updateBet: async (betId, updates) => {
    return FirebaseInit.updateBet(betId, updates);
  },

  updateParticipant: async (participantId, updates) => {
    return FirebaseInit.updateParticipant(participantId, updates);
  },

  // ---- Participants ----

  // Always alphabetical. Firestore returns docs sorted by id while the local
  // seed file has its own order - without this the cards reshuffle the moment
  // Firebase connects, which is how edits landed on the wrong person once.
  getParticipants: () => {
    return AppState.participants.slice().sort((a, b) => a.name.localeCompare(b.name));
  },

  getParticipantByName: (name) => AppState.participants.find(p => p.name === name),

  // ---- Weight ----

  getCurrentWeight: (participantId) => {
    const weighIns = AppState.weigh_ins.filter(w => w.participant_id === participantId);
    if (weighIns.length === 0) {
      const p = Store.getParticipantByName(participantId);
      return p ? p.start_weight_lbs : 0;
    }
    weighIns.sort((a, b) => DateUtils.compare(b.date, a.date));
    return weighIns[0].weight_lbs;
  },

  // Starting weight is the first point, then every logged weigh-in
  getWeightHistory: (participantId) => {
    const p = Store.getParticipantByName(participantId);
    if (!p) return [];

    const history = [{ date: p.start_date, weight_lbs: p.start_weight_lbs }];
    history.push(...AppState.weigh_ins.filter(w => w.participant_id === participantId));
    history.sort((a, b) => DateUtils.compare(a.date, b.date));
    return history;
  },

  hasWeighedInOn: (participantId, date) => {
    return AppState.weigh_ins.some(w => w.participant_id === participantId && w.date === date);
  },

  // ---- Blood pressure ----

  // All readings for a participant, oldest first
  getBpHistory: (participantId) => {
    const readings = AppState.blood_pressures.filter(b => b.participant_id === participantId);
    readings.sort((a, b) => DateUtils.compare(a.date, b.date));
    return readings;
  },

  // Most recent reading, or null
  getCurrentBp: (participantId) => {
    const readings = Store.getBpHistory(participantId);
    if (readings.length === 0) return null;
    return readings[readings.length - 1];
  },

  // Baseline: the participant's recorded starting BP if set, otherwise their
  // first logged reading. Used as the "start" side of every BP comparison.
  getStartBp: (participantId) => {
    const p = Store.getParticipantByName(participantId);
    if (p && p.start_systolic && p.start_diastolic) {
      return {
        systolic: p.start_systolic,
        diastolic: p.start_diastolic,
        date: p.start_date
      };
    }
    const readings = Store.getBpHistory(participantId);
    return readings.length ? readings[0] : null;
  },

  hasLoggedBpOn: (participantId, date) => {
    return AppState.blood_pressures.some(b => b.participant_id === participantId && b.date === date);
  },

  // ---- Daily logs ----

  getDailyLog: (participantId, date) => {
    return AppState.daily_logs.find(d => d.participant_id === participantId && d.date === date);
  },

  getRecentLogs: (participantId, days = 7) => {
    const cutoff = DateUtils.subtractDays(DateUtils.today(), days);
    const logs = AppState.daily_logs.filter(d =>
      d.participant_id === participantId && DateUtils.compare(d.date, cutoff) >= 0
    );
    logs.sort((a, b) => DateUtils.compare(b.date, a.date));
    return logs;
  },

  // ---- Combined metrics ----

  // One row of everything the dashboard/leaderboard/profile needs
  getScorecard: (participant) => {
    const currentWeight = Store.getCurrentWeight(participant.name);
    const currentBp = Store.getCurrentBp(participant.name);
    const startBp = Store.getStartBp(participant.name);
    const metrics = FitnessMetrics.getMetrics(participant, currentWeight, currentBp, startBp);

    return { participant, currentWeight, currentBp, startBp, metrics };
  },

  // Every participant scored, ranked by percent body weight change (most
  // negative first - biggest proportional loss wins)
  getScoreboard: (sortKey = 'percent_change') => {
    const rows = Store.getParticipants().map(p => Store.getScorecard(p));

    const sorters = {
      // lower (more negative) is better
      percent_change: (a, b) => a.metrics.percent_change - b.metrics.percent_change,
      weight_change: (a, b) => a.metrics.weight_change - b.metrics.weight_change,
      bmi_change: (a, b) => a.metrics.bmi_change - b.metrics.bmi_change,
      // BP improvement: most negative MAP change first, no-reading last
      map_change: (a, b) => {
        const av = a.metrics.map_change, bv = b.metrics.map_change;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return av - bv;
      },
      // lower current MAP is better, no-reading last
      map: (a, b) => {
        const av = a.metrics.map, bv = b.metrics.map;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return av - bv;
      },
      name: (a, b) => a.participant.name.localeCompare(b.participant.name)
    };

    rows.sort(sorters[sortKey] || sorters.percent_change);
    return rows;
  },

  // ---- Bets ----

  getAllBets: () => AppState.bets,

  getOpenBets: () => AppState.bets.filter(b => b.status === 'open'),

  getBetsForParticipant: (participantId) => {
    return AppState.bets.filter(b => b.target_participant_id === participantId);
  },

  // Everyone starts at 100. A resolved bet moves the stake from the losing
  // side to the winning side. Unclaimed bets just return the stake.
  getBetLeaderboard: () => {
    const board = {};
    Store.getParticipants().forEach(p => {
      board[p.name] = { name: p.name, points: 100, open: 0, record: '0-0' };
    });

    let wins = {}, losses = {};

    AppState.bets.forEach(bet => {
      const creator = board[bet.created_by];
      const taker = bet.taken_by ? board[bet.taken_by] : null;
      if (!creator) return;

      if (bet.status === 'open') {
        creator.open += bet.stake;
        return;
      }

      const creatorWon = bet.status === 'won';

      if (creatorWon) {
        creator.points += bet.stake;
        wins[bet.created_by] = (wins[bet.created_by] || 0) + 1;
        if (taker) {
          taker.points -= bet.stake;
          losses[bet.taken_by] = (losses[bet.taken_by] || 0) + 1;
        }
      } else if (bet.status === 'lost') {
        creator.points -= bet.stake;
        losses[bet.created_by] = (losses[bet.created_by] || 0) + 1;
        if (taker) {
          taker.points += bet.stake;
          wins[bet.taken_by] = (wins[bet.taken_by] || 0) + 1;
        }
      }
    });

    Object.values(board).forEach(entry => {
      entry.record = `${wins[entry.name] || 0}-${losses[entry.name] || 0}`;
    });

    return Object.values(board).sort((a, b) => b.points - a.points);
  }
};
