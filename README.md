# Palouse Chess Club website

This folder holds the club's website. Every time you save a change here on GitHub, the site updates itself, usually within **1–2 minutes**.

**Live site:** https://ericfejeran2k0.github.io/palouse-chess-club/ (will become https://palousechess.com once the domain is connected)

---

## How editing works (read this once)

You can do everything right here on github.com, with no software to install.

1. Click a file name to open it.
2. Click the **pencil icon ✏️** (top right of the file) to edit.
3. Make your change.
4. Click the green **Commit changes…** button, then **Commit changes** again in the pop-up. ("Commit" is GitHub's word for "save.")
5. Wait a minute or two, then refresh the website.

**Did it work?** Click the **Actions** tab at the top of this page. A green ✅ next to your change means it's live. A red ❌ usually means a small typo (often a missing quote mark or wrong indentation) in the file you just edited. Open that file, compare it with the examples, fix it, and save again. You can't break anything permanently: GitHub keeps every earlier version (click **History** on any file).

---

## 1. Add an event (tournament, social, cancellation)

Regular 1st & 3rd Saturday meetings show up **automatically**. You never need to add those.

For anything else, open **`_data/events.yml`**, click ✏️, and add your event at the **bottom** of the file:

```yaml
- date: 2026-11-14
  title: "Fall Quick-Play Tournament"
  time: "10:00 a.m. – 3:00 p.m."
  location: "Neill Public Library, 210 N Grand Ave, Pullman"
  description: "Four rounds, 25 minutes per player. Free entry."
  link: "https://example.com/more-info"
```

- The date is written **year-month-day**.
- Only `date` and `title` are required. Delete any lines you don't need.
- Keep the spacing exactly as shown: `- date:` at the far left, and every other line indented two spaces.
- Past events disappear from the site on their own.

**To cancel a regular meeting** (e.g. the library is closed):

```yaml
- date: 2026-12-19
  title: "No meeting — library closed for the holidays"
  cancel: yes
```

**To change the time or room of one regular meeting**, add an entry with that meeting's date and the new details (`time:` and/or `location:`). It replaces the usual details for that day only.

---

## 2. Add photos

1. Open the **`photos`** folder (in the file list above).
2. Click **Add file → Upload files**.
3. Drag your photos in (or click "choose your files").
4. Click **Commit changes**.

That's it. They'll appear on the Photos page, newest first. Behind the scenes the site automatically:

- shrinks big phone photos so pages load fast,
- converts iPhone photos (HEIC) so every browser can show them,
- removes hidden location (GPS) data from the photos it shows on the site.

Note: the original files you upload are also kept in this folder, and this folder is public. For photos taken at the library that's fine. For photos taken at someone's home, turn off location tagging in your phone's camera settings first.

**To remove a photo:** open it in the `photos` folder, click the **⋯** menu (top right), choose **Delete file**, then commit.

Tip: only post photos of kids if their parents are OK with it.

---

## 3. Change the weekly puzzle

The puzzles live in **`_data/puzzles.yml`**. The site shows one puzzle each week, working down the list in order (a new one every **Monday**), and starts over at the top when it reaches the end. There are 16 puzzles in it now, which is about four months' worth.

**To add a puzzle**, paste a new one at the **bottom** of the file:

```yaml
- title: "Back-Rank Mate"
  position: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"
  task: "White to move. Checkmate in one!"
  solution: "Rd8#"
  explanation: "Rook to d8 is checkmate. Black's own pawns trap the king."
```

- **position:** the board setup, as a "FEN" code. To get one, go to **https://lichess.org/editor**, drag pieces into place, choose whose turn it is, and copy the text from the **FEN** box.
- **solution:** the winning move(s) in chess notation. For longer puzzles, include the opponent's reply in between, e.g. `"Bxf7+ Ke7 Nd5#"`. Visitors play the moves on the board, and the site plays the replies.
- Double-check your answer: on the Lichess editor page, click **Analysis board** and turn on the engine.

**To change the puzzle showing this week:** the puzzle page shows its number (e.g. "Puzzle #3"). Edit the 3rd puzzle in the list, or swap in a different one at that spot.

If a puzzle has a typo, the puzzle page shows a message saying so instead of breaking.

---

## Other things you might want to change

All in **`_config.yml`** (the main settings file):

| What | Setting |
|---|---|
| Sign-up form | Paste your ClickUp form link into `signup_form_link: ""`. Until then, the Join page shows a "coming soon" message. |
| Contact email / Facebook page | `contact_email` and `facebook_link` (they appear in the footer once filled in) |
| Meeting time, day or location | the `meetings:` and `location:` sections |

**Getting your ClickUp form link:** in ClickUp, open your form → **Share** → copy the public form link (it starts with `https://forms.clickup.com/`).

---

## Connecting palousechess.com (do this whenever you're ready)

**Step 1: Tell GitHub the address.** In this repository go to **Settings → Pages**. Under **Custom domain**, type `palousechess.com` and click **Save**.

**Step 2: Point the domain at GitHub.** Log in where you bought the domain (GoDaddy, Namecheap, Squarespace, etc.), find **DNS settings**, and add these records. Delete any existing "A" records for `@` first.

| Type | Name / Host | Value / Points to |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | ericfejeran2k0.github.io |

**Step 3: Turn on the padlock.** DNS changes can take a few hours (occasionally up to a day). Then go back to **Settings → Pages** and tick **Enforce HTTPS**.

**Step 4: Make pullmanchess.com redirect.** At the company where you bought **pullmanchess.com**, look for **Domain forwarding** (or "URL redirect"). Forward it to `https://palousechess.com`, and choose **Permanent (301)** if asked. GitHub Pages can only host one address per site, so the redirect is handled by the domain company instead.

---

## For the technically curious

- Built with Jekyll, which GitHub Pages runs automatically. Publishing is handled by `.github/workflows/publish.yml`.
- Chessboard: [Chessground](https://github.com/lichess-org/chessground) (the board used by Lichess, GPL-3.0). Chess rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2). Copies are kept in `assets/vendor/`, so the site doesn't depend on any outside service.
- Page files: `index.html` (home), `events.html`, `puzzle.html`, `learn.html`, `photos.html`, `join.html`. Styles: `assets/css/style.css`. Calendar and gallery code: `assets/js/site.js`. Puzzle and board code: `assets/js/boards.js`.
