# Firestore Setup Guide - Detailed Steps

This document provides step-by-step instructions for setting up Firebase Cloud Firestore for the Fitness Tracker app.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)
- This repository cloned locally

## Complete Setup (10 minutes)

### Phase 1: Create Firebase Project

**Step 1.1: Create Project**
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** button (top left)
3. Project name: `fitness-tracker`
4. Click **Continue**
5. Uncheck **"Enable Google Analytics for this project"**
6. Click **Create project**
7. Wait for "Your new project is ready" message (~2 min)

**Step 1.2: Register Web App**
1. In Firebase Console, you should see your project
2. Look for the section **"Get started by adding Firebase to your app"**
3. Click the web icon `</>`
4. App nickname: `fitness-tracker-web`
5. Check **"Also set up Firebase Hosting for this app"** (optional, but skip for now)
6. Click **"Register app"**
7. You'll see a code block with your `firebaseConfig`
8. Copy the entire config object (see Step 2 below)

---

### Phase 2: Copy Config to Project

**Step 2.1: Get Your Config**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDaGmWKa4JsXZ...",
  authDomain: "fitness-tracker-12345.firebaseapp.com",
  projectId: "fitness-tracker-12345",
  storageBucket: "fitness-tracker-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
```

**Step 2.2: Paste into config.js**
1. In this repo, open `config.js`
2. Replace the `YOUR_*` placeholders with values from your config above
3. Make sure `projectId` does **not** contain "YOUR_"
4. Save the file

**Example after update:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDaGmWKa4JsXZ-abc123...",
  authDomain: "fitness-tracker-12345.firebaseapp.com",
  projectId: "fitness-tracker-12345",
  storageBucket: "fitness-tracker-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
```

---

### Phase 3: Create Firestore Database

**Step 3.1: Create Database**
1. In Firebase Console, go to **Build** (left sidebar)
2. Click **"Firestore Database"**
3. Click **"Create database"** button
4. When prompted:
   - **Location:** `us-central1` (or closest to you)
   - **Security rules:** Select **"Start in test mode"**
5. Click **"Enable"**
6. Wait for database to initialize (~1 minute)

**Step 3.2: Verify Database**
- You should see "Cloud Firestore" in the left sidebar
- Click it and you should see an empty database
- Collections will be created when we add data

---

### Phase 4: Set Security Rules

**⚠️ Warning:** Test mode (30 days) allows public read/write. For production, use stricter rules.

**Step 4.1: Update Rules**
1. In Firebase Console, go to **Firestore Database**
2. Click the **"Rules"** tab (at the top)
3. You should see:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2026, 9, 1);
       }
     }
   }
   ```

4. Replace everything with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

5. Click **"Publish"** button (blue)
6. Wait for **green checkmark** (rules deployed)

---

### Phase 5: Seed Data

**Step 5.1: Start the App**
1. In terminal, navigate to this repo
2. Run: `python -m http.server 8000`
3. Open `http://localhost:8000` in browser

**Step 5.2: Wait for Firebase Connection**
1. Open browser console (`F12` on Windows, `Cmd+Option+J` on Mac)
2. Wait for message: **"Firebase initialized successfully"**
3. If you see **"Running in offline mode"**:
   - Your `config.js` is not set up correctly
   - Check that `projectId` doesn't contain "YOUR_"
   - Refresh page

**Step 5.3: Load Seed Script**
1. Copy this entire script:

```javascript
async function seedParticipants() {
  if (!window.firebase || !window.firebase.firestore) {
    console.error('❌ Firebase not loaded');
    return;
  }

  try {
    const { collection, getDocs, setDoc, doc } = firebase.firestore;
    const db = firebase.firestore().app.firestore();

    console.log('🔍 Checking existing participants...');
    const snap = await getDocs(collection(db, 'participants'));

    if (snap.size > 0) {
      console.log('✅ Participants already exist (' + snap.size + ' found)');
      return;
    }

    const participants = [
      { name: "John", height_inches: 70, sex: "M", start_date: "2026-08-01", start_weight_lbs: 180, goal_weight_lbs: 170 },
      { name: "Howie", height_inches: 69, sex: "M", start_date: "2026-08-01", start_weight_lbs: 195, goal_weight_lbs: 180 },
      { name: "Tyler", height_inches: 72, sex: "M", start_date: "2026-08-01", start_weight_lbs: 210, goal_weight_lbs: 190 },
      { name: "Will", height_inches: 68, sex: "M", start_date: "2026-08-01", start_weight_lbs: 185, goal_weight_lbs: 170 },
      { name: "Michael", height_inches: 71, sex: "M", start_date: "2026-08-01", start_weight_lbs: 200, goal_weight_lbs: 185 },
      { name: "Jimmy", height_inches: 67, sex: "M", start_date: "2026-08-01", start_weight_lbs: 175, goal_weight_lbs: 165 }
    ];

    console.log('📝 Seeding ' + participants.length + ' participants...');
    for (const p of participants) {
      await setDoc(doc(db, 'participants', p.name), { ...p, id: p.name });
      console.log('  ✅ ' + p.name);
    }

    console.log('');
    console.log('🎉 Seeding complete!');
    console.log('   Refreshing page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'permission-denied') {
      console.error('   Make sure Firestore security rules are set to allow write');
    }
  }
}

seedParticipants();
```

2. Paste into browser console
3. Press Enter
4. Wait for:
   - ✅ checkmarks for each participant
   - 🎉 "Seeding complete!"
   - Page auto-reloads

**Step 5.4: Verify Data**
1. Check **Firebase Console** → **Firestore Database**
2. You should see a `participants` collection with 6 documents
3. In the app, go to **Dashboard** tab
4. All 6 participants should appear in the leaderboard

---

## Collections Created

Firestore will automatically create these collections when data is added:

| Collection | Documents | Purpose |
|-----------|-----------|---------|
| `participants` | One per person | Name, height, starting weight, goals |
| `weigh_ins` | One per weigh-in | Historical weight data |
| `daily_logs` | One per person per day | Workouts, drinks, notes |
| `bets` | One per bet | Friendly bets between participants |

---

## Troubleshooting

### "Firebase initialized successfully" but no data appears

**Problem:** Participants aren't loading from Firestore

**Solutions:**
1. Check Firestore console - are participants showing up in the database?
2. Try seeding again (Step 5.3)
3. Check browser console for errors (F12)
4. Make sure security rules are published (green checkmark in Firebase)

### "permission-denied" error when seeding

**Problem:** Security rules prevent writing data

**Solution:**
1. Go to Firebase Console → Firestore → Rules tab
2. Make sure the rules are set to `allow read, write: if true;`
3. Click "Publish" again
4. Wait 30 seconds
5. Try seeding again

### "Running in offline mode" message

**Problem:** Firebase config isn't loaded correctly

**Solutions:**
1. Check `config.js` - does it have your real values?
2. Is `projectId` still "YOUR_PROJECT_ID"? 
3. Try: Hard refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`)
4. Check that `config.js` is in the root directory

### Still having issues?

Check the browser console (F12) for error messages. Copy the error and search:
- https://firebase.google.com/docs/reference/js/v9/firestore
- Firebase error codes: https://firebase.google.com/docs/firestore/troubleshoot

---

## What's Next?

Once Firestore is set up:
1. You can start logging workouts and weigh-ins from the app
2. Data will persist across page refreshes
3. All 6 participants will see the same shared data

See the main `README.md` for deployment instructions.
