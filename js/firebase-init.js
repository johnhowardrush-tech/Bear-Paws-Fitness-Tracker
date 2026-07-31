// Firebase initialization (compat SDK, loaded via script tags)

let db = null;
let isFirebaseReady = false;

// One doc per participant per day so re-saving a day updates instead of duplicating
const dayKey = (participant_id, date) => `${participant_id}_${date}`;

const FirebaseInit = {
  init: async () => {
    try {
      await FirebaseInit.waitForFirebase();

      if (!firebaseConfig || !firebaseConfig.projectId || firebaseConfig.projectId.includes('YOUR_')) {
        console.warn('Firebase config not set. Using offline mode with local data.');
        isFirebaseReady = false;
        return;
      }

      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      isFirebaseReady = true;

      console.log('Firebase initialized successfully');

      await FirebaseInit.seedParticipants();
      await FirebaseInit.listenToCollections();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      console.log('Running in offline mode with local data');
      isFirebaseReady = false;
    }
  },

  waitForFirebase: async () => {
    let attempts = 0;
    while ((!window.firebase || !window.firebase.firestore) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!window.firebase || !window.firebase.firestore) {
      throw new Error('Firebase SDK failed to load');
    }
  },

  seedParticipants: async () => {
    if (!isFirebaseReady || !db) return;

    try {
      const snap = await db.collection('participants').get();
      if (snap.size > 0) {
        console.log('Participants already exist in Firestore');
        return;
      }

      console.log('No participants found, seeding...');
      const response = await fetch('data/participants.json');
      const seedParticipants = await response.json();

      for (const p of seedParticipants) {
        await db.collection('participants').doc(p.name).set({ ...p, id: p.name });
        console.log(`  Added ${p.name}`);
      }
      console.log('Participants seeded successfully');
    } catch (error) {
      console.error('Error seeding participants:', error);
    }
  },

  listenToCollections: async () => {
    if (!isFirebaseReady) return;

    const bind = (name, target, mapDoc) => {
      db.collection(name).onSnapshot(
        (snap) => {
          AppState[target] = [];
          snap.forEach(doc => AppState[target].push(mapDoc(doc)));
          UI.render();
        },
        (error) => console.error(`Listener error on ${name}:`, error)
      );
    };

    try {
      bind('participants', 'participants', doc => ({ id: doc.data().id || doc.id, ...doc.data() }));
      bind('weigh_ins', 'weigh_ins', doc => ({ id: doc.id, ...doc.data() }));
      bind('blood_pressures', 'blood_pressures', doc => ({ id: doc.id, ...doc.data() }));
      bind('daily_logs', 'daily_logs', doc => ({ id: doc.id, ...doc.data() }));
      bind('bets', 'bets', doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  },

  addWeighIn: async (participant_id, date, weight_lbs) => {
    const record = { participant_id, date, weight_lbs: parseFloat(weight_lbs) };

    if (!isFirebaseReady) {
      AppState.setWeighIn({ id: dayKey(participant_id, date), ...record });
      return;
    }

    try {
      await db.collection('weigh_ins').doc(dayKey(participant_id, date)).set(record);
    } catch (error) {
      console.error('Error adding weigh-in:', error);
      throw error;
    }
  },

  addBloodPressure: async (participant_id, date, systolic, diastolic) => {
    const record = {
      participant_id,
      date,
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic)
    };

    if (!isFirebaseReady) {
      AppState.setBloodPressure({ id: dayKey(participant_id, date), ...record });
      return;
    }

    try {
      await db.collection('blood_pressures').doc(dayKey(participant_id, date)).set(record);
    } catch (error) {
      console.error('Error adding blood pressure:', error);
      throw error;
    }
  },

  addDailyLog: async (participant_id, date, logData) => {
    const record = { participant_id, date, ...logData };

    if (!isFirebaseReady) {
      AppState.setDailyLog({ id: dayKey(participant_id, date), ...record });
      return;
    }

    try {
      await db.collection('daily_logs').doc(dayKey(participant_id, date)).set(record);
    } catch (error) {
      console.error('Error adding daily log:', error);
      throw error;
    }
  },

  addBet: async (betData) => {
    if (!isFirebaseReady) {
      AppState.setBet({ id: Date.now().toString(), ...betData });
      return;
    }

    try {
      await db.collection('bets').add(betData);
    } catch (error) {
      console.error('Error adding bet:', error);
      throw error;
    }
  },

  updateBet: async (betId, updates) => {
    if (!isFirebaseReady) {
      const bet = AppState.bets.find(b => b.id === betId);
      if (bet) Object.assign(bet, updates);
      return;
    }

    try {
      await db.collection('bets').doc(betId).update(updates);
    } catch (error) {
      console.error('Error updating bet:', error);
      throw error;
    }
  },

  updateParticipant: async (participantId, updates) => {
    if (!isFirebaseReady) {
      const participant = AppState.participants.find(p => p.name === participantId);
      if (participant) Object.assign(participant, updates);
      return;
    }

    try {
      await db.collection('participants').doc(participantId).set(updates, { merge: true });
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  }
};
