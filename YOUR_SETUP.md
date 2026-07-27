# Bear Paws Fitness Tracker - Your Setup

## Your Details

| Item | Value |
|------|-------|
| Repository | `Bear-Paws-Fitness-Tracker` |
| Username | `johnhowardrush-tech` |
| **Your Live Site** | **`https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker`** |
| Repository URL | `https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker` |

---

## 3 Steps to Go Live

### Step 1: Push Code to GitHub (5 min)

From your terminal in the project directory:

```bash
git init
git add .
git commit -m "Initial commit: Bear Paws Fitness Tracker"
git branch -M main
git remote add origin https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker.git
git push -u origin main
```

### Step 2: Enable GitHub Pages (2 min)

1. Go to: https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker
2. Click **Settings** (top right)
3. Left sidebar → **Pages**
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
5. Click **Save**
6. Wait 1-2 minutes ⏳

### Step 3: Configure Firebase (5 min)

1. Open your live site: https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker
2. Follow `FIRESTORE_SETUP.md`:
   - Create Firebase project
   - Get web config
   - Update `config.js`
   - Create Firestore database
   - Set security rules to `allow read, write: if true;`
   - Seed 6 participants via browser console
3. Commit and push:
   ```bash
   git add config.js
   git commit -m "Add Firebase config"
   git push
   ```
4. Site auto-redeploys in 1-2 minutes ✅

---

## Share With Friends

Your live link:
```
https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker
```

Send this to your 5 friends! They can:
- Log workouts
- Record weigh-ins
- See live leaderboard
- Place friendly bets (coming soon)

---

## Future Updates

To update the site:

```bash
# Make changes to any file
git add .
git commit -m "Update: description of what changed"
git push
```

Site redeploys automatically in 1-2 minutes.

---

## Troubleshooting

**Site shows 404?**
- Hard refresh: `Ctrl+Shift+R`
- Wait 2 more minutes if just enabled
- Check Settings → Pages for "Published" status

**Firebase not initializing?**
- Open console: `F12`
- Look for "Firebase initialized successfully"
- If not, check `config.js` has real credentials

**Changes not showing?**
- Hard refresh: `Ctrl+Shift+R`
- Wait 2+ minutes for auto-deploy
- Check GitHub Actions tab for deployment status

---

## What's Inside

Your project includes:

```
Bear-Paws-Fitness-Tracker/
├── index.html              ← Main app
├── config.js               ← Firebase config (ADD YOUR CREDENTIALS HERE)
├── css/style.css           ← Responsive design
├── js/                     ← Application logic
│   ├── app.js              ← Initialization
│   ├── firebase-init.js    ← Firebase connection
│   ├── state.js            ← App state
│   ├── store.js            ← Data operations
│   └── pages/              ← 5 pages (dashboard, checkin, profiles, leaderboard, bets)
├── data/participants.json  ← 6 friends seed data
├── README.md               ← Documentation
└── .github/workflows/deploy.yml ← Auto-deploy config (no changes needed)
```

---

## Quick Facts

✅ **Deployed to**: GitHub Pages  
✅ **Data Storage**: Firebase Cloud Firestore  
✅ **Framework**: Vanilla JavaScript (no build needed)  
✅ **Responsive**: Mobile-first design  
✅ **Fair Comparison**: Ranked by % body weight lost  
✅ **Automatic Updates**: Real-time data syncing  

---

## Next Steps

1. ✅ Follow Step 1: Push code
2. ✅ Follow Step 2: Enable Pages (wait for green checkmark)
3. ✅ Follow Step 3: Configure Firebase
4. 🎉 Share link with friends

---

## Support

- **GitHub Pages issues**: https://docs.github.com/en/pages
- **Firebase help**: See `FIRESTORE_SETUP.md`
- **App documentation**: See `README.md`

---

**Your site will be live in 15 minutes!** 🚀🐾
