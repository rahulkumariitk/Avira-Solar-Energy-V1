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
js/support.js           Help & Support form (complaints, feedback, questions)
js/decor.js             Live numbers for the decorative animations (optional)
assests/projects.json   Project gallery data
assests/blog_post.json  Solar Guides data
assests/partners.json   Brand, bank, agency and sales partners
assests/careers.json    Job openings
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

**Partners** — edit `assests/partners.json` (brand groups, `banks`, `agencies`, `sales`).
To show an official logo instead of the initials tile, put the file in `assests/images/partners/`
and set `"logo": "waaree.png"` on that partner. If a logo file is missing, the initials tile shows automatically.

**Job openings** — edit `assests/careers.json` (`title`, `type`, `location`, `summary`, `points`).
Remove all entries to hide the Careers section. Applicants apply via WhatsApp or email.

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

## Help & Support form

Sends to the same Apps Script as the other forms, with `sheet_name: "Support Form"`.

**One-time setup:** in the Google Sheet, add a tab named exactly `Support Form` with this header row:

```
ticket_id | request_type | priority | name | phone | email | city | system_size | installed_on | customer_ref | issue_type | rating | message | submitted_at
```

(If your script also writes a `sheet_name` or timestamp column on the other tabs, add it here the same way.)

**Until that tab exists**, nothing is lost: if the script rejects `Support Form`, the website automatically
re-sends the request to the `Contact Form` tab, with `property_type` set to e.g. `SUPPORT – Complaint (URGENT)`
and all the details (reference number, system size, issue, message) in `message`. So you still get the email.
If the sheet can't be reached at all, the customer is offered a pre-filled WhatsApp message instead.

Each request gets a reference number like `AVS-261004-3NQG` (date + 4 random characters), shown to the customer.
Urgent requests ("System not working at all") have `priority: URGENT`.

Deep links pre-select the request type: `#support-complaint`, `#support-service`, `#support-existing`,
`#support-new`, `#support-feedback` (handy for WhatsApp replies or printed QR codes).

## Preview locally

The page loads its JSON with `fetch`, so open it through a local server rather than double-clicking the file:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
