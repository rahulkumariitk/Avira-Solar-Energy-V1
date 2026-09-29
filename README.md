# Avira Solar Energy — website

Live at **https://www.avirasolarenergy.com** (GitHub Pages, published from `master`).

## Structure

```
index.html              Page markup (drawn illustrations live here too)
css/style.css           Main styles
css/decor.css           Decorative solar animations (optional)
js/solar_calculation.js Prices, subsidy slabs and calculator formulas
js/main.js              Navigation, calculator UI, lead forms → Google Sheet
js/render.js            Builds Projects gallery + Solar Guides from the JSON files
js/decor.js             Live numbers for the decorative animations (optional)
assests/projects.json   Project gallery data
assests/blog_post.json  Solar Guides data
assests/images/         Logo, favicon and project photos
```

## Common edits

**Add a project** — put the photo in `assests/images/projects/` and add an entry to `assests/projects.json`:

```json
{ "name": "5kW Rooftop Installation", "location": "Patna, Bihar", "image": "./assests/images/projects/5kw-patna.jpg", "type": "image" }
```

- The kW badge is read from the name ("5kW …"), and the city filter from the first part of `location`.
- `type` can also be `youtube` (with `youtubeId`), `video`, or `reel` (with `reelUrl` and `reelPlatform: "instagram"` or `"facebook"`).
- Please use image files rather than pasting base64 into the JSON — the page loads much faster.

**Add a guide** — add an entry to `assests/blog_post.json` (`title`, `category`, `image`, `excerpt`, `content`).

**Change prices or subsidy** — edit `ASSUMPTIONS` and `SUBSIDY` at the top of `js/solar_calculation.js`.

**Change counters (projects, kW, years, offices)** — edit the `data-count` values in the stats section of `index.html`.

**Remove the decorative animations** — delete these two lines from `index.html`:

```html
<link rel="stylesheet" href="css/decor.css">
<script src="js/decor.js" defer></script>
```

## Lead forms

All forms post to the Google Apps Script in `js/main.js` (`SHEET_URL`) using the sheet tabs
`Contact Form`, `Solar Calculator Form` and `General Inquiry Form`.

## Preview locally

The page loads its JSON with `fetch`, so open it through a local server rather than double-clicking the file:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
