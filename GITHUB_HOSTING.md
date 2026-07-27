# Hosting on GitHub Pages

This guide walks through hosting the Fitness Tracker on GitHub Pages instead of GitLab Pages.

## Prerequisites

- GitHub account (https://github.com)
- Git installed locally
- This repository cloned and ready to push

## Step 1: Create GitHub Repository ✅ DONE

Your repo: `Bear-Paws-Fitness-Tracker`
Username: `johnhowardrush-tech`
Your GitHub repo: https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker

## Step 2: Connect Local Repository to GitHub

In your terminal, from the project directory:

```bash
git init
git add .
git commit -m "Initial commit: Bear Paws Fitness Tracker"
git branch -M main
git remote add origin https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker.git
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker
2. Click **Settings** (top right)
3. Left sidebar → **Pages**
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **root** (not /docs)
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. You'll see a message: "Your site is published at `https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker`"

## Step 4: Update GitHub Pages Settings (Optional)

If you want a custom domain:

1. In **Settings** → **Pages**
2. Under "Custom domain", enter your domain (e.g., `fitness-tracker.example.com`)
3. Add a CNAME record to your domain's DNS:
   - Type: CNAME
   - Name: (subdomain or @)
   - Value: `USERNAME.github.io`

## Step 5: Configure Firebase in Production

1. Your site is now live at: `https://johnhowardrush-tech.github.io/Bear-Paws-Fitness-Tracker`
2. Open the site in browser
3. Follow the Firebase setup from `FIRESTORE_SETUP.md`:
   - Create Firebase project
   - Copy config to `config.js`
   - Create Firestore database
   - Set security rules
   - Seed participants
   - Commit and push changes (automatic redeploy in 1-2 min)

## Step 6: Set Up Automatic Deployments

The `.github/workflows/deploy.yml` file is already in place and will:
- Automatically deploy when you push to `main` branch
- Deploy all files in the repository root
- Be live within 1-2 minutes

## Updating Your Site

To update the live site:

```bash
# Make changes to your files
git add .
git commit -m "Update: description of changes"
git push
```

GitHub Actions will automatically redeploy within 2 minutes.

## Important Notes

⚠️ **Firebase Config is Public**
- Your `config.js` contains your Firebase API key
- This is OK for development/private groups
- The API key is designed to be public (Firestore security rules protect data)
- For production apps, use additional security measures

⚠️ **GitHub Pages Limitations**
- Static files only (no backend server)
- Works perfectly for this app
- Max 100GB per repository

⚠️ **Custom Domain DNS**
- Can take 24+ hours to propagate
- Verify with your DNS provider
- GitHub will show status in Settings

## Troubleshooting

### Site won't deploy

1. Check **Actions** tab in repository
2. Look for workflow run status
3. If red (failed), click to see error logs
4. Common issues:
   - Empty repository (need to push files)
   - Wrong branch name (should be `main`)
   - Files not committed to git

### 404 errors on page

1. Go to Settings → Pages
2. Verify it shows "Your site is published at: [URL]"
3. Hard refresh browser (Ctrl+Shift+R)
4. Wait 2+ minutes if you just enabled it

### Firebase not initializing

1. Open browser console (F12)
2. Check if you see "Firebase initialized successfully"
3. If not, verify `config.js` has real Firebase credentials
4. Make sure `projectId` doesn't contain "YOUR_"

## Site Structure

Your GitHub Pages site is served from:
- Repository root `/` maps to `https://USERNAME.github.io/fitness-tracker/`
- `index.html` is the home page
- All CSS, JS, data files served as-is

## Comparison: GitLab vs GitHub Pages

| Feature | GitLab Pages | GitHub Pages |
|---------|--------------|--------------|
| Setup | .gitlab-ci.yml | GitHub Actions (auto) |
| Deploy Time | 1-5 min | 1-2 min |
| Free Tier | Unlimited | Unlimited |
| Custom Domain | ✅ Yes | ✅ Yes |
| Automatic Builds | ✅ Yes | ✅ Yes |
| Complexity | Medium | Simple |

## Next Steps

1. ✅ Push to GitHub
2. ✅ Enable GitHub Pages
3. ✅ Configure Firebase
4. ✅ Share link with friends
5. 📝 Invite friends to: `https://USERNAME.github.io/fitness-tracker`

## Support

For GitHub Pages issues: https://docs.github.com/en/pages
For Firebase issues: See `FIRESTORE_SETUP.md`
