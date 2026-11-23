# ludwigs-assets

TV menu boards for Ludwig's Village Market & Catering (2918 Conestoga Road, Glenmoore, PA). Built on the same engine as the Rocco's boards, in its own repo so nothing crosses over.

## TV URLs (GitHub Pages)

| TV | URL |
| --- | --- |
| TV 1, Pizza | https://bcooney2026.github.io/ludwigs-assets/boards/menu.html?tv=1 |
| TV 2, Deli & Kitchen | https://bcooney2026.github.io/ludwigs-assets/boards/menu.html?tv=2 |

The TVs point at `boards/menu.html`, a forwarder. It sends them to the current board (`boards/v1/menu.html`). To roll back, change `TARGET` in the forwarder. The TV URLs never change.

## Files

| Path | What it is |
| --- | --- |
| boards/menu.html | Forwarder (the TVs' start URL) |
| boards/v1/menu.html | The board: layout, sections, window scenes |
| boards/v1/fonts/ | Self-hosted fonts (Oswald, Barlow Semi Condensed, Playfair Display) |
| boards/signage.js | Shared player: prices by Sheet ID, fallback prices, scaling, burn-in drift, 4 am reload |
| boards/img/ | Logos and photos for the window |

## Prices

Every item has a stable Sheet ID (L001 and up). The board never has prices typed into it. Until the Google Sheet + Apps Script feed is live, prices come from `FALLBACK` in `boards/signage.js`.

| IDs | Section |
| --- | --- |
| L001 to L007 | Build your own, toppings, crusts, specialty pizza price |
| L010 to L031 | Specialty pizzas (white, red, special sauces), one shared price (L007) |
| L040 to L058 | Sandwiches #1 to #17, add chicken (L057), extras (L058) |
| L060 to L078 | Strombolis: price (L060), +2.00 upcharge (L061), flavors |
| L080 to L091 | Italian Dinners (no prices on Ludwig's menus) |
| L092 to L095 | Pasta Specialties (Talluto's) |

## Debug

`&debug=1` shows the fit ("text 100%" is the goal), `&promo=ID` pins a window scene, `&test86=L040,L052` previews sold out, `&show=0` turns off full-screen reels.
