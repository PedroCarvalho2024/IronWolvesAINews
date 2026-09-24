# IronWolves Daily

Live site: https://pedrocarvalho2024.github.io/IronWolvesAINews
Repository: https://github.com/PedroCarvalho2024/IronWolvesAINews

A static newsletter page for the IronWolves squad. Every weekday morning at 09:30 a Claude scheduled task
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
2. It runs `scripts/publish.ps1`, which pulls any edits made on GitHub, builds, commits and pushes.
3. The `pages.yml` workflow builds again on the runner and deploys to Pages.

The task runs Monday to Friday. Weekends and holidays need nothing. The page shows the latest digest with a "stale" notice.

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
| `type`      | yes      | `lunch`, `birthday`, `anniversary`, `meeting`, `nofood`, `other` |
| `end`       | no       | `YYYY-MM-DD`, inclusive; makes the event span a range   |
| `note`      | no       | free text shown under the title                        |
| `recurring` | no       | `yearly` repeats on the same month/day every year      |
| `time`      | no       | free text, e.g. `12:30`                                |
| `where`     | no       | free text                                              |
| `who`       | no       | free text                                              |

The wolf logo enters "party mode" on days with a birthday or anniversary.

`nofood` marks days when nobody is cooking at the Porto office (for example the cook's
vacation), so people bring their own lunch. Use `date` + `end` for the whole range. On
those days the masthead shows a reminder.

The cook's vacation entries come from Pulsar (employee login `mfpeixoto`, tool
`get_employee_absences`) and carry `"source": "pulsar:mfpeixoto"`. To refresh them, ask
Claude in this project to "re-sync Fátima's vacations from Pulsar": it replaces every entry
with that source and leaves hand-written events alone. Last sync: 2026-09-24, covering the
2026 reference year (through March 2027).

## Meme of the week

Two ways to add one:

- **Direct:** drop the image (PNG, JPG, GIF or WebP; animated GIFs play) in `memes/` and add an entry to `memes/memes.json`
  with `file`, `caption`, `week` (ISO week like `2026-W40`) and `by`. Open a pull request
  or push to `main`.
- **Issue form:** teammates click "Submit a meme" on the page. It opens a GitHub issue
  with the image, caption and preferred week. The maintainer downloads the image into
  `memes/`, adds the JSON entry, and closes the issue.

The page shows the meme for the current ISO week, or the most recent one before it.
Older memes stay browsable with the arrows.

## Deployment

The site deploys from the `main` branch of
https://github.com/PedroCarvalho2024/IronWolvesAINews through the `pages.yml` workflow.
Pages must be set to **Source: GitHub Actions** in the repository settings
(Settings → Pages). After that, every push to `main` republishes the site at
https://pedrocarvalho2024.github.io/IronWolvesAINews within about a minute.

To publish by hand from this machine:

```bash
powershell -ExecutionPolicy Bypass -File scripts/publish.ps1
```

## Keyboard shortcuts

`←` / `→` previous and next digest, `/` focus search.
