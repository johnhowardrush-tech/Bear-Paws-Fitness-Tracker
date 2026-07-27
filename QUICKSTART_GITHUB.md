# Quick Start: Host on GitHub Pages in 5 Minutes

## The 5-Step Process

### 1️⃣ Create GitHub Repo (1 min) ✅ DONE

Repository: `Bear-Paws-Fitness-Tracker`
Username: `johnhowardrush-tech`
Your site will be at: `https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker`

### 2️⃣ Push Code (1 min)

In terminal, from your project directory:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker.git
git push -u origin main
```

### 3️⃣ Enable GitHub Pages (1 min)

1. Go to your repo on GitHub
2. **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **root**
5. **Save**
6. Wait for green checkmark ✅

### 4️⃣ Configure Firebase (2 min)

1. Follow steps in `FIRESTORE_SETUP.md`
2. Create Firebase project
3. Copy config to `config.js`
4. Set up Firestore database
5. Seed participants via browser console

### 5️⃣ Share Your Link ✅ YOUR URL

Your site is live at:
```
https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker
```

Share this link with your friends! 🎉

---

## What Happens Automatically

- ✅ GitHub Pages builds your site
- ✅ All files deployed from `/root`
- ✅ Live within 1-2 minutes
- ✅ Updates automatically when you push

## Future Updates

To update the site:

```bash
# Make changes to files
git add .
git commit -m "Update: whatever changed"
git push
```

Done! Live in 1-2 minutes.

## Troubleshooting

**Site shows 404?**
- Hard refresh (Ctrl+Shift+R)
- Check Actions tab for failed deployment
- Wait 2+ minutes if just enabled

**Firebase not working?**
- Open console (F12)
- Check for "Firebase initialized successfully"
- Verify `config.js` has real credentials

**Page looks broken?**
- CSS/JS files loaded? Check Network tab (F12)
- All files committed to git? `git status`
- Correct branch deployed? Settings → Pages

## Need More Help?

- GitHub Pages setup: `GITHUB_HOSTING.md`
- Firebase setup: `FIRESTORE_SETUP.md`  
- Architecture overview: `README.md`

---

## Your Setup Commands

```bash
# 1. Initialize git (one-time)
git init
git add .
git commit -m "Initial commit"
git branch -M main

# 2. Push to GitHub
git remote add origin https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker.git
git push -u origin main

# 3. Enable GitHub Pages
# → Go to https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker
# → Settings → Pages → Deploy from main branch

# 4. Your live site
# → https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker

# 5. Add Firebase config (in browser console)
# → Copy/paste seed script from FIRESTORE_SETUP.md

# 6. Future updates
git add .
git commit -m "Update: description"
git push
```

That's it! Your **Bear Paws Fitness Tracker** is now hosted on GitHub Pages. 🎉🐾
