# Phase 3: Daily Check-in + Real Data Flow - Testing Guide

This guide walks through testing the complete data flow from check-in form → Firestore → live dashboard updates.

## Data Flow Architecture

```
Check-in Form
    ↓
Store.addDailyLog() + Store.addWeighIn()
    ↓
FirebaseInit.addDailyLog() + FirebaseInit.addWeighIn()
    ↓
Firestore Collections (daily_logs, weigh_ins)
    ↓
Firestore Real-time Listeners (firebase-init.js)
    ↓
AppState.daily_logs + AppState.weigh_ins
    ↓
UI.render() + Store functions
    ↓
Dashboard Updates (leaderboard, today's activity, metrics)
```

## Prerequisites

- Firebase configured in config.js ✓
- Participants seeded in Firestore ✓
- App running on localhost:8000

## Step-by-Step Test

### 1. Check Firebase Connection

1. Open browser console (F12)
2. Look for message: **"Firebase initialized successfully"**
   - If you see "Running in offline mode": Firebase config not set correctly, check config.js
3. Confirm participants are in Firestore Database console

### 2. Test Check-in Form

1. Navigate to **Check In** tab
2. Select **"John"** from dropdown
3. Leave date as **Today** (2026-07-27)
4. Check **"I worked out today"**
5. Enter:
   - Minutes: **45**
   - Notes: **Morning run**
6. Set **Drinks**: **2**
7. Check **"Record a weigh-in"**
8. Enter Weight: **175.5** (5 lbs less than starting)
9. Click **"Save Check-in"**
10. Expect: **"Check-in saved!"** message

### 3. Verify Data Persisted

1. Open **Firebase Console** → **Firestore Database**
2. Check collections:
   - **daily_logs**: Should see a document with:
     - `participant_id: "John"`
     - `date: "2026-07-27"`
     - `worked_out: true`
     - `workout_minutes: 45`
     - `drinks: 2`
   - **weigh_ins**: Should see a document with:
     - `participant_id: "John"`
     - `date: "2026-07-27"`
     - `weight_lbs: 175.5`

### 4. Verify Dashboard Updates

1. Go to **Dashboard** tab
2. Check **"Today's Activity"** section:
   - Should show **"💪 Worked out: John"**
   - Should show **"⚖️ Weighed in: John"**
3. Check **Leaderboard**:
   - **John** should now show:
     - **% Lost**: 2.50% (5.5 lbs / 180 = 2.50%)
     - **Lbs Lost**: 5.5 lbs
     - **Current Weight**: 175.5 lbs
4. Check **top 3 cards**:
   - John's card should show 2.50% progress

### 5. Test Multiple Check-ins

1. Go back to **Check In**
2. Select **"Howie"**
3. Check **"I worked out today"** with **60** minutes
4. Check **"Record a weigh-in"** at **185.0** (10 lbs less than 195)
5. Save
6. **Dashboard** should now show:
   - Howie in "Worked out" list
   - Howie at ~5.13% (10/195)
   - John at 2.50%
   - Howie leading the leaderboard

### 6. Test Profile Updates

1. Go to **Profiles** tab
2. Click **"✏️ Edit"** on John's card
3. Change:
   - Starting Weight: **180** (no change)
   - Current Weight: **175.5** (same)
   - Goal Weight: **165** (changed from 170)
4. Click **Save**
5. John's profile should show:
   - Goal Weight: **165**
   - To Goal: **+10.5 lbs**

### 7. Test Recent Activity

1. Still on **Profiles**
2. Scroll to John's **Recent Activity**
3. Should see:
   - **Today**: 💪 Worked out (45 min) • 🍷 2 drinks

### 8. Test Leaderboard

1. Go to **Leaderboard** tab
2. Should see full metrics table:
   - John: 2.50% lost
   - Howie: 5.13% lost (leading)
   - Others: 0% (no weigh-ins)
3. Scroll to **Detailed Metrics** table
4. Verify all calculations are correct

## Expected Results

After completing all steps:

| Metric | John | Howie | Others |
|--------|------|-------|--------|
| Started | Jul 31, 2026 | Jul 31, 2026 | Jul 31, 2026 |
| Start Weight | 180 | 195 | (original) |
| Current Weight | 175.5 | 185.0 | (original) |
| % Lost | 2.50% | 5.13% | 0.00% |
| Lbs Lost | 5.5 | 10.0 | 0.0 |

## Troubleshooting

### "Firebase initialized successfully" but no data appears

1. Check Firestore console - documents exist?
2. Hard refresh page (Ctrl+Shift+R)
3. Check browser console for errors (F12)
4. Verify security rules allow write: `allow read, write: if true;`

### Form submits but data doesn't appear in Firestore

1. Check browser console for errors
2. Verify participant name matches exactly (case-sensitive)
3. Check Firestore security rules - "permission-denied" error?

### Dashboard shows wrong metrics

1. Verify weigh-in data in Firestore
2. Check that getCurrentWeight() is pulling correct data
3. Manually verify percent calculation: (start - current) / start * 100

### Data appears but dashboard doesn't update

1. Page might be cached - hard refresh (Ctrl+Shift+R)
2. Check browser console for listener errors
3. Verify UI.render() is being called

## Success Criteria

Phase 3 is complete when:
- ✅ Check-in form saves daily_logs to Firestore
- ✅ Weigh-in form saves weigh_ins to Firestore
- ✅ Dashboard updates in real-time when data arrives
- ✅ Leaderboard shows correct % lost calculations
- ✅ Today's activity shows who worked out and weighed in
- ✅ Profile recent activity shows logged workouts
- ✅ Fair comparison metrics are accurate

## Next Steps

Once Phase 3 is verified:
- Phase 4: Full leaderboard sorting and stats
- Phase 5: Betting system implementation
- Phase 6: Polish, deployment, and optimization
