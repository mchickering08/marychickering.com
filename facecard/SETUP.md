# Face Card setup

About 15 minutes, once. After this, the tiny "log in" link at the bottom of marychickering.com takes people to Face Card.

## How the login works

- Everyone logs in with the group login: username `skincaregroup` plus the group password.
- Each person also picks a **player name**, which is what shows on the ladder and in duels.
- On a new phone, typing the same player name brings back that player's stats.
- The group password is stored scrambled (hashed) in Supabase. It's never in the website code, which matters because your repo is public.

## 1. Make a Supabase project

1. Go to supabase.com and click **Start your project**. Sign in with GitHub.
2. Click **New project**. Name it `facecard`, make up a database password (you won't need it again), and pick region **East US**.
3. Wait about 2 minutes while it sets up.

## 2. Create the database

1. In the left sidebar open **SQL Editor**, then click **+** / **New query**.
2. Open `facecard/schema.sql` from your repo, copy all of it, paste it in, and click **Run**.
3. It should say "Success. No rows returned."

## 3. Set the group login

1. Open another **New query** and paste this, with your real password:

```sql
select set_group_login('skincaregroup', 'PUT-THE-PASSWORD-HERE');
```

2. Click **Run**. It should say `group login set for skincaregroup`.
3. Delete that query from the SQL Editor's list, so the password isn't sitting in your query history.

To change the password later, run the same line with a new one. Nobody gets kicked out and the ladder stays.

## 4. Allow guest sessions

Face Card gives each phone a behind-the-scenes guest session, then the group login decides if it gets in.

1. Go to **Authentication**, then **Sign In / Providers** (on some dashboards it's **Providers** or **Settings**).
2. Turn ON **Allow anonymous sign-ins**. Save.
3. Go to **Authentication → Rate Limits**. The limit for anonymous sign-ins is low by default (around 30 per hour per IP address). Everyone at school shares one wifi IP, so raise it to something like 500 before a demo.

## 5. Connect the site

1. Go to **Project Settings → API Keys** (or **API**).
2. Copy the **Project URL** and the **anon / publishable** key. If there's a "Legacy API keys" tab, the `anon` key there works too.
3. Either paste both to Claude, or edit `facecard/config.js` on GitHub (click the file, then the pencil icon):

```js
SUPABASE_URL: "https://abcdefgh.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi... or sb_publishable_...",
```

Both are meant to be public. Never put the `service_role` / secret key or the group password in any file in the repo.

## 6. Go live

Merge the pull request on GitHub. After about a minute:
- marychickering.com has a small "log in" link at the bottom.
- It goes to marychickering.com/facecard/ (hidden from Google).

## 7. Test it with a friend

1. You and a friend both open marychickering.com/facecard/ and log in with the group login, each with your own player name.
2. You both go to **duel**, then **find a match**. You land in the same lobby.
3. Either of you hits **start round**: 3 second countdown, then 30 seconds to lock in.
4. The higher score wins. ELO and the ladder update for both of you.

## Things to know

- **Camera:** it needs https, which your site already has. The first scan loads Google's face mapping (a few MB), so the live score says "loading…" for a few seconds.
- **Sleeping database:** free Supabase projects pause after about a week with no use. If the site can't load the ladder, open the Supabase dashboard and click **Restore project**.
- **Log out:** logging out only signs out that device. Your player is safe and comes back when you type the same player name.
- **Shared password:** anyone with the group password can type any player name, including someone else's. That's fine inside a trusted group. Change the password (step 3) if it leaks.
- **Faked scores:** scores are calculated on each phone, then checked by the server, which enforces the timing, one lock-in per round, and 0 to 100. Someone who knows code could still send a fake score through the browser console. Scoring on a server would fix that, and that's the production plan.
- **Fresh competition:** rerun `schema.sql` to reset everything. All players, ELO and duels get wiped. The group login stays.
