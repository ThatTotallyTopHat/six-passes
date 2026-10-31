# Six Passes

Link two footballers through the clubs they shared and the teammates they played alongside, in as few passes as possible.

## How it plays

You start with one player and a target. Name a club the current player was at, then someone who was there in at least one of the same seasons. Keep going until you reach the target.

- **Par** is the shortest possible route.
- **Yellow cards** count wrong answers.
- **Hints** show the next step on the quickest route.
- **Daily** gives everyone the same pair each day. **Free play** lets you pick par 2, 3 or 4.

## Files

| Path | What it is |
| --- | --- |
| `data/data-*.txt` | Squad data: one player per line, `Name\|Club start-end; Club start-end`. A blank end year means they're still there. A decimal marks a mid-season move, e.g. `2022.5` for January. |
| `app.js` | Game logic: the teammate graph, puzzle picking, hints, scoring. |
| `head.html` | Page layout and styles. |
| `icon.svg`, `og.svg` | App icon and link preview image, turned into PNGs at build time. |
| `build.js` | Assembles everything into `dist/`. |

## Build

```
npm install
node build.js
```

Vercel runs this automatically on every push, using the settings in `vercel.json`.

## Adding players

Add lines to any file in `data/`. Club names must match exactly across players for teammates to link, e.g. always `Man Utd`, never `Manchester United`.
