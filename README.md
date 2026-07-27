# Fitness Tracker

A private-but-public fitness tracking website for a group of friends. Track workouts, weight, and compete fairly across different body sizes.

## Tech Stack

- **Frontend**: Vanilla HTML + CSS + JavaScript (no build step)
- **Database**: Firebase Cloud Firestore (free Spark tier)
- **Hosting**: GitLab Pages (static files only)

## Firebase Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it `fitness-tracker`
4. Disable Google Analytics (not needed)
5. Click "Create project" and wait for it to finish

### Step 2: Create a Firestore Database

1. In Firebase Console, go to **Build** (left sidebar) → **Firestore Database**
2. Click "Create database"
3. When prompted:
   - Start in **Test mode** (allows public read/write)
   - Choose region `us-central1` (or closest to you)
4. Click "Enable"

### Step 3: Get Your Web Config

1. In Firebase Console, click the gear icon ⚙️ (top right)
2. Go to **Project Settings** → **Your apps**
3. Click the web icon `</>` to create a new web app (if none exists)
4. Register app as `fitness-tracker`
5. Copy the config object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fitness-tracker-abc123.firebaseapp.com",
  projectId: "fitness-tracker-abc123",
  storageBucket: "fitness-tracker-abc123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Step 4: Update config.js

1. Open `config.js` in this repo
2. Replace the placeholder values with your actual config from Step 3
3. Example:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fitness-tracker-abc123.firebaseapp.com",
  projectId: "fitness-tracker-abc123",
  storageBucket: "fitness-tracker-abc123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

4. Save and commit

### Step 5: Set Firestore Security Rules

**⚠️ Warning: This allows public read/write to the database. Only use for private, trusted groups.**

1. In Firebase Console, go to **Firestore Database** → **Rules** (tab at the top)
2. Replace the default rules with:

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

3. Click "Publish" (blue button)
4. Wait for the rules to deploy (green checkmark appears)

### Step 6: Seed Initial Participant Data

1. Load the app in your browser: `http://localhost:8000` (or deployed URL)
2. Open the browser console (`F12` or `Cmd+Option+J`)
3. Copy and paste this script:

```javascript
async function seedParticipants() {
  const { collection, getDocs, setDoc, doc } = firebase.firestore;
  const db = firebase.firestore().app.firestore();
  
  const participantsRef = collection(db, 'participants');
  const snap = await getDocs(participantsRef);
  
  if (snap.size > 0) {
    console.log('✅ Participants already exist. Skipping seed.');
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
  
  for (const p of participants) {
    await setDoc(doc(db, 'participants', p.name), { ...p, id: p.name });
    console.log(`✅ Seeded ${p.name}`);
  }
  
  console.log('🎉 All participants seeded!');
  window.location.reload();
}

seedParticipants().catch(err => console.error('❌ Error:', err));
```

4. Press Enter
5. Wait for "🎉 All participants seeded!" message
6. Page auto-reloads with data

**Note:** If you're still in offline mode, refresh the page after confirming the config is correct.

### Step 7: Verify Firebase Connection

1. **Check console for success messages:**
   - Open browser DevTools console (`F12`)
   - Look for these messages:
     - ✅ "Firebase initialized successfully"
     - ✅ "Participants already exist..." or "Participants seeded successfully"

2. **If you see "Running in offline mode":**
   - Firebase config is not set correctly
   - Double-check `config.js` has your real config values
   - Make sure `projectId` doesn't contain `YOUR_`

3. **Refresh the dashboard:**
   - Go to Dashboard tab
   - All 6 participants should appear with their starting weights
   - If empty, Firebase seed didn't run — check console for errors

## Deployment

### GitHub Pages (Recommended - Simpler Setup)

**Your Site:** `https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker`

See **[QUICKSTART_GITHUB.md](QUICKSTART_GITHUB.md)** (5 minutes) or **[GITHUB_HOSTING.md](GITHUB_HOSTING.md)** (detailed).

Quick steps:
1. Push files to `main` branch
2. Enable Pages in Settings
3. Done! Site is live

### GitLab Pages (Alternative)

Push to GitLab and the `.gitlab-ci.yml` will automatically deploy.

Live at `https://<username>.gitlab.io/fitness-tracker/`

## Local Development

Serve the files locally with any static server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node http-server
npx http-server
```

Then open `http://localhost:8000` in your browser.

## Architecture Notes

- **No login**: Anyone visiting can select whose data they're entering. Simple and open.
- **Firestore as source of truth**: All data is persisted immediately; app state is in sync.
- **Mobile-first design**: Built for logging from phones.
- **Fair comparison math**: Weight loss is ranked by percentage of body weight lost, not absolute pounds.

## Data Model

**participants**: Name, height (inches), sex, start_date, start_weight_lbs, goal_weight_lbs
**weigh_ins**: participant_id, date, weight_lbs
**daily_logs**: participant_id, date, worked_out, workout_minutes, drinks, notes
**bets**: created_by, target_participant_id, description, deadline, position, stake, status

See `data/participants.json` for seed data format.
