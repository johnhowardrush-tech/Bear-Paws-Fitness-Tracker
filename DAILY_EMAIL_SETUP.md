# Daily Digest Email - Setup

A GitHub Actions job runs every morning, checks Firestore for the previous day, and emails everyone
who did and didn't log. No server, no cost.

**You must add three secrets before it can send anything.** Until then the job builds the email and
fails at the send step.

---

## How it works

```
GitHub Actions cron (12:00 UTC daily)
        |
        v
scripts/daily-digest.mjs
   reads projectId from config.js
   queries Firestore REST API (public read rules, no credentials)
        |
        v
digest.html + digest.txt
        |
        v
SMTP send to everyone in DIGEST_RECIPIENTS
```

Nothing is written back to Firestore. The job only reads.

---

## Step 1: Create a Gmail app password

Regular Gmail passwords won't work for SMTP. You need a 16-character app password.

1. The sending account needs **2-Step Verification** on: https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords
3. App name: `Bear Paws Tracker`
4. Click **Create**
5. Copy the 16-character code (spaces don't matter)

Use a personal Gmail, not your work account - work tenants usually block SMTP app passwords, and
this is a side project.

If you'd rather not use Gmail at all, see *Alternative: Resend* at the bottom.

---

## Step 2: Add the repo secrets

Go to
https://github.com/johnhowardrush-tech/Bear-Paws-Fitness-Tracker/settings/secrets/actions
and click **New repository secret** three times:

| Secret name | Value |
|---|---|
| `MAIL_USERNAME` | The Gmail address that sends the digest |
| `MAIL_PASSWORD` | The 16-character app password from Step 1 |
| `DIGEST_RECIPIENTS` | All six email addresses, comma-separated, no spaces |

Example for `DIGEST_RECIPIENTS`:

```
john@example.com,howie@example.com,tyler@example.com,will@example.com,michael@example.com,jimmy@example.com
```

**Why a secret and not a config file:** the repo is public. Committing six email addresses to a
public repo hands them to every scraper on the internet. Secrets stay private and are masked in the
run logs.

---

## Step 3: Test it before trusting the schedule

1. Go to the **Actions** tab
2. Pick **Daily digest email** in the left sidebar
3. Click **Run workflow**
4. Check **Build the email but do not send it** for a safe first run, then **Run workflow**
5. Open the run and expand **Preview** - you'll see exactly what the email says
6. Happy with it? Run it again with dry-run unchecked to actually send

You can also set **Date to report on** to any past `YYYY-MM-DD` to re-run an old day.

Every run also uploads `digest.html` as a downloadable artifact, so you can open the real email in a
browser.

---

## Timing

The cron is `0 12 * * *` (12:00 UTC), which lands at:

- **7:00 AM Central** during daylight saving (Mar-Nov)
- **6:00 AM Central** during standard time (Nov-Mar)

GitHub cron is always UTC and doesn't follow DST, so it shifts by an hour twice a year. To change
the time, edit the cron line in `.github/workflows/daily-digest.yml`:

| You want (Central, summer) | Use |
|---|---|
| 6:00 AM | `0 11 * * *` |
| 7:00 AM | `0 12 * * *` |
| 8:00 AM | `0 13 * * *` |
| 9:00 AM | `0 14 * * *` |

Two things to know about GitHub's scheduler:

- **It can run late.** Scheduled jobs queue behind everything else on the shared runners, so 5-20
  minutes of drift is normal. Occasionally more. It is not a precise alarm clock.
- **It pauses after 60 days of no repo activity.** If nobody pushes for two months, GitHub disables
  the schedule and emails you. Any push re-enables it.

---

## What the email contains

Subject is always **Bear Paws Fitness Tracker Update**.

Three sections, in this order:

1. **The slacker list** - everyone who logged nothing the previous day, followed by a jab telling
   them to get off their ass. The section header and the jab rotate daily so it doesn't read like
   the same email every morning.
   - If *everyone* logged, this flips to a "Nobody Slacked" note instead.
   - If *nobody* logged, the jab goes plural and harder.
2. **Actually Showed Up** - who logged, plus what they did: weight, workout minutes, drinks, BP
   reading with MAP.
3. **Where Everyone Stands** - each person's current weight, change from start, goal weight, pounds
   to go, and how much of their goal they've closed. Sorted by who's furthest along.

Then a button straight to the check-in page.

"Logged" means they have *any* record for that day: a daily log, a weigh-in, or a BP reading.

### The trash talk

It lives in three arrays near the top of `scripts/daily-digest.mjs`:

- `SLACKER_HEADERS` - the section title
- `SLACKER_JABS` - the line under the names
- `CLEAN_SWEEP` / `TOTAL_FAILURE` - the all-logged and nobody-logged cases

Add, remove, or rewrite lines freely. Selection is keyed off the date, so it rotates predictably and
a given day always produces the same email (which makes re-running a past date reproducible).

### The "Done" column

How much of the gap between your starting weight and your goal you've closed:

| Shown | Means |
|---|---|
| `17%` | closed 17% of the distance to your goal |
| `not started` | no movement yet |
| `wrong way` | moving away from your goal |
| `done` | goal reached |
| `--` | no goal set |

---

## Troubleshooting

**`Invalid login: 535-5.7.8 Username and Password not accepted`**
The app password is wrong or 2-Step Verification isn't on. Regenerate it at
https://myaccount.google.com/apppasswords and update `MAIL_PASSWORD`.

**`config.js has no real projectId`**
`config.js` still has the `YOUR_...` placeholders. Commit your real Firebase config.

**`Firestore read of "participants" failed: 403`**
Your Firestore rules no longer allow public read. Check
Firebase Console -> Firestore -> Rules for `allow read, write: if true;`.

**`No participants found in Firestore`**
The `participants` collection is empty. Seed it (see `FIRESTORE_SETUP.md`).

**Email lands in spam**
First few sends from a new address often do. Have everyone mark it "not spam" once and add the
sender to their contacts.

**The job didn't run at all**
Check the Actions tab. If the schedule shows as disabled, push any commit to re-enable it.

---

## Alternative: Resend instead of Gmail

If Gmail app passwords are blocked for you, [Resend](https://resend.com) has a free tier (100
emails/day) and works over SMTP with no domain setup if you send from their test address.

1. Sign up, create an API key
2. Add secrets: `MAIL_USERNAME` = `resend`, `MAIL_PASSWORD` = your API key
3. In `.github/workflows/daily-digest.yml`, change the send step:
   ```yaml
   server_address: smtp.resend.com
   server_port: 465
   from: Bear Paws Fitness Tracker <onboarding@resend.dev>
   ```

Everything else stays the same.

---

## Turning it off

Comment out the `schedule:` block in `.github/workflows/daily-digest.yml` and push. The manual
**Run workflow** button keeps working.
