// Seed script for initializing Firestore with participant data
// Run this in the browser console after Firebase is configured

async function seedParticipants() {
  if (!window.firebase || !window.firebase.firestore) {
    console.error('❌ Firebase not loaded. Make sure config.js is filled in correctly.');
    return;
  }

  try {
    const { collection, getDocs, setDoc, doc, getFirestore } = firebase.firestore;
    const db = getFirestore();

    console.log('🔍 Checking if participants exist...');
    const participantsRef = collection(db, 'participants');
    const snap = await getDocs(participantsRef);

    if (snap.size > 0) {
      console.log('✅ Participants already exist. Skipping seed.');
      return;
    }

    const participants = [
      {
        name: 'John',
        height_inches: 70,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 180,
        goal_weight_lbs: 170
      },
      {
        name: 'Howie',
        height_inches: 69,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 195,
        goal_weight_lbs: 180
      },
      {
        name: 'Tyler',
        height_inches: 72,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 210,
        goal_weight_lbs: 190
      },
      {
        name: 'Will',
        height_inches: 68,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 185,
        goal_weight_lbs: 170
      },
      {
        name: 'Michael',
        height_inches: 71,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 200,
        goal_weight_lbs: 185
      },
      {
        name: 'Jimmy',
        height_inches: 67,
        sex: 'M',
        start_date: '2026-08-01',
        start_weight_lbs: 175,
        goal_weight_lbs: 165
      }
    ];

    console.log('📝 Seeding participants...');
    for (const p of participants) {
      await setDoc(doc(db, 'participants', p.name), { ...p, id: p.name });
      console.log(`  ✅ ${p.name}`);
    }

    console.log('');
    console.log('🎉 All 6 participants seeded successfully!');
    console.log('   Reloading page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    console.error('❌ Error during seed:', error.message);
    if (error.code === 'permission-denied') {
      console.error('   Check Firestore security rules are set to allow public write.');
    }
  }
}

// Run the seed function
seedParticipants();
