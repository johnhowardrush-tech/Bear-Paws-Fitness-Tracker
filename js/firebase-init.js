// Firebase initialization with modular SDK (v9+)

let db = null;
let isFirebaseReady = false;

const FirebaseInit = {
  init: async () => {
    try {
      // Wait for Firebase SDK to be available
      await FirebaseInit.waitForFirebase();

      const { initializeApp } = window.firebase;
      const { getFirestore } = window.firebase.firestore;

      // Check if config is properly set
      if (!firebaseConfig || !firebaseConfig.projectId || firebaseConfig.projectId.includes('YOUR_')) {
        console.warn('Firebase config not set. Using offline mode with local data.');
        isFirebaseReady = false;
        return;
      }

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      isFirebaseReady = true;

      console.log('Firebase initialized successfully');

      // Seed participants if database is empty
      await FirebaseInit.seedParticipants();

      // Listen to Firestore collections
      await FirebaseInit.listenToCollections();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      console.log('Running in offline mode with local data');
      isFirebaseReady = false;
    }
  },

  waitForFirebase: async () => {
    let attempts = 0;
    while (!window.firebase && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.firebase) {
      throw new Error('Firebase SDK failed to load');
    }
  },

  seedParticipants: async () => {
    if (!isFirebaseReady || !db) return;

    try {
      const { collection, getDocs, setDoc, doc } = window.firebase.firestore;

      const snap = await getDocs(collection(db, 'participants'));

      // If participants already exist, don't seed
      if (snap.size > 0) {
        console.log('Participants already exist in Firestore');
        return;
      }

      console.log('No participants found, seeding...');

      // Load seed data
      const response = await fetch('data/participants.json');
      const seedParticipants = await response.json();

      // Add each participant to Firestore
      for (const p of seedParticipants) {
        const docRef = doc(db, 'participants', p.name);
        await setDoc(docRef, {
          ...p,
          id: p.name
        });
        console.log(`  Added ${p.name}`);
      }

      console.log('✅ Participants seeded successfully');
    } catch (error) {
      console.error('Error seeding participants:', error);
    }
  },

  listenToCollections: async () => {
    if (!isFirebaseReady) return;

    const { collection, onSnapshot } = window.firebase.firestore;

    try {
      // Listen to participants
      onSnapshot(collection(db, 'participants'), (snap) => {
        AppState.participants = [];
        snap.forEach(doc => {
          const data = doc.data();
          AppState.participants.push({
            id: data.id || doc.id,
            ...data
          });
        });
        console.log('Participants updated:', AppState.participants.length);
        UI.render();
      });

      // Listen to weigh_ins
      onSnapshot(collection(db, 'weigh_ins'), (snap) => {
        AppState.weigh_ins = [];
        snap.forEach(doc => {
          const data = doc.data();
          AppState.weigh_ins.push({
            id: doc.id,
            ...data
          });
        });
        console.log('Weigh-ins updated:', AppState.weigh_ins.length);
        UI.render();
      });

      // Listen to daily_logs
      onSnapshot(collection(db, 'daily_logs'), (snap) => {
        AppState.daily_logs = [];
        snap.forEach(doc => {
          const data = doc.data();
          AppState.daily_logs.push({
            id: doc.id,
            ...data
          });
        });
        console.log('Daily logs updated:', AppState.daily_logs.length);
        UI.render();
      });

      // Listen to bets
      onSnapshot(collection(db, 'bets'), (snap) => {
        AppState.bets = [];
        snap.forEach(doc => {
          const data = doc.data();
          AppState.bets.push({
            id: doc.id,
            ...data
          });
        });
        console.log('Bets updated:', AppState.bets.length);
        UI.render();
      });
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  },

  addWeighIn: async (participant_id, date, weight_lbs) => {
    if (!isFirebaseReady) {
      AppState.setWeighIn({
        id: Date.now().toString(),
        participant_id,
        date,
        weight_lbs
      });
      return;
    }

    const { collection, addDoc } = window.firebase.firestore;

    try {
      await addDoc(collection(db, 'weigh_ins'), {
        participant_id,
        date,
        weight_lbs: parseFloat(weight_lbs)
      });
    } catch (error) {
      console.error('Error adding weigh-in:', error);
    }
  },

  addDailyLog: async (participant_id, date, logData) => {
    if (!isFirebaseReady) {
      AppState.setDailyLog({
        id: Date.now().toString(),
        participant_id,
        date,
        ...logData
      });
      return;
    }

    const { collection, addDoc } = window.firebase.firestore;

    try {
      await addDoc(collection(db, 'daily_logs'), {
        participant_id,
        date,
        ...logData
      });
    } catch (error) {
      console.error('Error adding daily log:', error);
    }
  },

  addBet: async (betData) => {
    if (!isFirebaseReady) {
      AppState.setBet({
        id: Date.now().toString(),
        ...betData
      });
      return;
    }

    const { collection, addDoc } = window.firebase.firestore;

    try {
      await addDoc(collection(db, 'bets'), betData);
    } catch (error) {
      console.error('Error adding bet:', error);
    }
  },

  updateBet: async (betId, updates) => {
    if (!isFirebaseReady) {
      const bet = AppState.bets.find(b => b.id === betId);
      if (bet) Object.assign(bet, updates);
      return;
    }

    const { doc, updateDoc } = window.firebase.firestore;

    try {
      await updateDoc(doc(db, 'bets', betId), updates);
    } catch (error) {
      console.error('Error updating bet:', error);
    }
  },

  updateParticipant: async (participantId, updates) => {
    if (!isFirebaseReady) {
      const participant = AppState.participants.find(p => p.name === participantId || p.id === participantId);
      if (participant) Object.assign(participant, updates);
      return;
    }

    const { doc, updateDoc } = window.firebase.firestore;

    try {
      // Use participant name as document ID
      const docId = participantId;
      await updateDoc(doc(db, 'participants', docId), updates);
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  }
};
