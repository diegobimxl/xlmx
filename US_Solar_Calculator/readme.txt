US SOLAR CALCULATOR - TOP 30 US CITIES
=======================================

FILES
- main.html    Landing page with city ROI comparison chart + cards
- calc.html    City-specific calculator (reads params from URL)

HOW IT WORKS
- main.html shows top 30 US cities ranked by solar ROI
- Click any city card to open calc.html with that city's data
- calc.html reads city, state, sun hours, latitude, and electric rate from URL
- Each city has its own utility rate (EIA residential avg 2025)
- Uses sq ft for roof area (converted to m2 internally)

DEPLOY TO WEBSITE
1. Upload main.html and calc.html to the same directory
2. Done. No build step, no dependencies, no npm.

DEPLOY OPTIONS
- Netlify: drag the folder to netlify.com/drop
- GitHub Pages: push to repo, enable Pages in settings
- Vercel: vercel deploy from the folder
- Any web server: just serve the files

EMBED IN EXISTING SITE
<iframe src="main.html" width="100%" height="800" frameborder="0"></iframe>

CUSTOMIZE
- Edit city data in main.html (cities array in script)
- Edit panel specs in calc.html (D object in script)
- Panel wattage: D.wp (currently 400W)
- Install cost: D.costW (currently $2.75 USD/W)
- System efficiency: D.eff (currently 0.80 = 80%)
- Rates are per-city (EIA data)

LOCAL TESTING
Double-click main.html. Works offline, no server needed.
Note: file:// URLs may block URLSearchParams in some browsers.
If calc.html shows default city for all, use a local server:
  python -m http.server 8000
  then open http://localhost:8000/main.html
