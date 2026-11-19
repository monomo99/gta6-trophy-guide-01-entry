# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![GTA 6 Trophy Guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01/)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/monomo99/gta6-trophy-guide-01-entry/rank.svg)](https://make.fun/c/gta6-trophy-guide-01/)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/monomo99/gta6-trophy-guide-01-entry/reward.svg)](https://make.fun/c/gta6-trophy-guide-01/)

**Leonida Ledger** is the complete offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI — 1 Platinum, 2 Gold, 6 Silver, 46 Bronze — with a guide in our own words for every trophy, a four-phase roadmap to the Platinum, and a checklist that saves in your browser.

No account, no network, no tracking. Open `app/index.html` and it just works — even with the network off.

## What's inside

- **All 55 trophies**, each with its official name, description and grade as PlayStation publishes them, plus a guide (what to do, where and how, when it can be missed) that cites its sources.
- **Platinum roadmap in four phases** — Story → Collectibles → Activities → Cleanup — each with its own progress bar, so you always know what to do next.
- **Stats dashboard** — overall %, per-kind progress bars, and a **Next-up suggestion** that points at the smartest trophy to chase next (the missable one first, while it still can be earned).
- **Checklist tracker** — tick trophies off, progress saves in `localStorage`, and you can **export it to a file and import it back**.
- **Difficulty rating (1–5) + time estimate on every trophy**, shown as badges, sortable by grade, name or difficulty.
- **Per-trophy personal notes**, saved in `localStorage` alongside your ticks.
- **Filters by kind** — story, missable, collectibles, activities, online (empty on purpose: GTA VI has no online trophies at launch) — plus full-text **search**.
- **Missable-alert banner** — one trophy in the whole list can be lost forever.
- **Spoiler setting** — hides the names and descriptions of story trophies until you earn them.
- **Light / dark theme toggle** — Vice-neon dark by default, paper-ledger light.

## The one trophy you can miss

**Positive Mental Attitude** (meditate at every spot across Leonida) is the list's only missable trophy: a meditation spot in Chapter 1 disappears when the chapter ends, and GTA VI has **no mission replay**. The banner at the top of the guide says so loudly, the trophy carries a ⚠ Missable flag, and the Next-up box suggests it first. Keep a manual save at the start of every chapter — the guide's save-tips section explains the rotation.

> v2 rebuild note: this entry was rebuilt from scratch after the first submission was rejected on transcript coverage (only 8.3% of its lines were authored in-session). Every file here was written fresh in the recorded session — same title, new code, plus the difficulty/time badges, phased roadmap, stats dashboard, notes fields, search + sort, missable banner and theme toggle.

## The roadmap

1. **Story** — play chapters 1 to the finale in order; every story trophy pops as you go.
2. **Collectibles** — meditation spots, card sets, WAiNK It locations, vehicles, full map exploration.
3. **Activities** — races, drone races, the shooting range (42 gold medals), robberies, fishing, arcade games, money.
4. **Cleanup** — A Long Road (100% completion) and the Platinum, **Vice Got a Price!**

Expect around **200 hours** for the Platinum. It is long, not hard — the only Golds are the finale and 100% completion.

## Sources

Trophy names, descriptions and grades as published on PlayStation, via **Exophase** and **PSNProfiles** (18 Nov 2026), cross-checked with **TrueAchievements**. Every guide is written in our own words and names its sources beside it. Further reading: PowerPyx GTA 6 Trophy Guide · KeenGamer GTA 6 Trophy Guide · Output Lag GTA 6 Trophy List · GTABase GTA 6 Achievements & Trophies · GTA BOOM trophy list · Planet GTA 6 trophy list.

A few one-off trophies with deliberately cryptic official descriptions (The Truth Is Out There, Personal Best, Bad Luck, I Guess) had no confirmed unlock method at launch — those guides say so honestly and point at the community guides confirming the trigger, instead of inventing one.

## Run it

```sh
# Serve the app locally (any static server works)
cd app && python3 -m http.server 8080
# then open http://127.0.0.1:8080/
```

Hand in (writes the submission bundle to `out/`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

```text
main.ts                  # hand-in program: copies app/ + screenshots/, writes dossier.json
app/
  index.html             # the guide
  style.css              # Vice-neon dark / paper-ledger light, no images
  app.js                 # tracker: filters, search, sort, notes, export/import, spoiler mode
  data/trophies.json     # all 55 trophies: official name/description/grade + our guide
screenshots/             # 4 real renders of this app (see shots.json)
shots.json               # screenshot manifest
```

## Disclaimer

Unofficial fan guide. Not affiliated with, endorsed by, or connected to Rockstar Games, Take-Two Interactive, Sony Interactive Entertainment, or PlayStation. Grand Theft Auto and GTA are trademarks of Take-Two Interactive. No Rockstar logo, official artwork, box art, or game screenshots are used anywhere in this entry.

## License

MIT — see [LICENSE](LICENSE).
