# IronWolves Daily

A static newsletter page for the IronWolves squad. Every morning a Claude scheduled task
researches AI news, writes a markdown digest into `digests/`, and pushes. GitHub Actions
rebuilds the site and deploys it to GitHub Pages.

```
digests/          ai-digest-YYYY-MM-DD.md   one file per day, written by the scheduler
data/events.json  squad calendar (lunches, birthdays, anniversaries, meetings)
data/config.json  team name, repo URL, site URL
memes/            meme images + memes.json (caption, ISO week, author)
assets/           logo
src/              page template, styles, client script
build.js          Node script: parses everything above, writes site/
scripts/publish.ps1  build + commit + push, called by the scheduler
site/             generated output (git-ignored, rebuilt by CI)
```

## Local preview

```bash
node build.js
python -m http.server 8765 -d site
```

Then open http://localhost:8765. No dependencies beyond Node 18+.

## Daily flow

1. The scheduler writes `digests/ai-digest-<today>.md` (format below).
2. It runs `scripts/publish.ps1`, which builds, commits and pushes.
3. The `pages.yml` workflow builds again on the runner and deploys to Pages.

Weekends and holidays need nothing. The page shows the latest digest with a "stale" notice.

## Digest format

The parser is forgiving but expects this shape:

```markdown
AI digest for 2026-09-22 — 6 items

> **Today's big item:** Two or three plain sentences. Shown as the hero banner.

## Category name

- **One-line headline**
  One sentence saying what it is and why a developer cares.
  https://primary.source/link
```

Rules the parser relies on: `##` for categories, `- **bold**` to start an item, the first
URL inside an item becomes its link, and a leading `>` blockquote becomes the hero banner.

## Calendar

Edit `data/events.json`. Fields:

| field       | required | notes                                                  |
|-------------|----------|--------------------------------------------------------|
| `title`     | yes      | shown in the tile                                      |
| `date`      | yes      | `YYYY-MM-DD`                                           |
| `type`      | yes      | `lunch`, `birthday`, `anniversary`, `meeting`, `other` |
| `recurring` | no       | `yearly` repeats on the same month/day every year      |
| `time`      | no       | free text, e.g. `12:30`                                |
| `where`     | no       | free text                                              |
| `who`       | no       | free text                                              |

The wolf logo enters "party mode" on days with a birthday or anniversary.

## Meme of the week

Two ways to add one:

- **Direct:** drop the image in `memes/` and add an entry to `memes/memes.json`
  with `file`, `caption`, `week` (ISO week like `2026-W40`) and `by`. Open a pull request
  or push to `main`.
- **Issue form:** teammates click "Submit a meme" on the page. It opens a GitHub issue
  with the image, caption and preferred week. The maintainer downloads the image into
  `memes/`, adds the JSON entry, and closes the issue.

The page shows the meme for the current ISO week, or the most recent one before it.
Older memes stay browsable with the arrows.

## First deployment

1. Create an empty GitHub repository (private is fine, Pages works on private repos with
   GitHub Enterprise or a paid plan; otherwise make it public or internal).
2. Fill `repoUrl` and `siteUrl` in `data/config.json`.
3. In the repo settings, Pages → Source → **GitHub Actions**.
4. Push:

```bash
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

The first workflow run publishes the site at the URL shown in the Actions log.

## Keyboard shortcuts

`←` / `→` previous and next digest, `/` focus search.
