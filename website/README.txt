XLMX Website - Deployment Guide
================================

This is a single HTML file. No dependencies. No build step.

FREE HOSTING OPTIONS (zero cost):
---------------------------------

OPTION 1: GitHub Pages (recommended)
1. Create a GitHub account if you don't have one (github.com)
2. Create a new repository called "xlmx" (or whatever you want)
3. Upload index.html to the repository
4. Go to Settings > Pages > Source: Deploy from branch > main > / (root)
5. Your site will be live at: https://yourusername.github.io/xlmx/
6. To use a custom domain later, add a CNAME file with your domain

OPTION 2: Cloudflare Pages (also free, faster)
1. Create a Cloudflare account (cloudflare.com)
2. Go to Workers & Pages > Create > Pages > Upload assets
3. Upload index.html
4. Done. Free subdomain: yourproject.pages.dev

OPTION 3: Netlify Drop (drag and drop)
1. Go to app.netlify.com/drop
2. Drag the website folder there
3. Done. Free subdomain: random-name.netlify.app

OPTION 4: Blogger/Blogspot (if you want Google)
1. Go to blogger.com, create a blog
2. Edit the HTML template, paste the full index.html content
3. Not ideal but works and is 100% free

AIRTABLE CONNECTION:
-------------------
The form posts directly to Airtable base XLMX (appvh3o5xm1BZZ9k6)
Table: Requests (tblt4OBSxf3GGWtdy)
Token is embedded in the HTML (PAT with full access)

TABLES IN AIRTABLE:
- Requests: incoming form submissions from the website
- Projects: when you accept a request, move it here to track
- Clients: contact database

NOTES:
- The Airtable PAT is visible in the HTML source. This is fine for
  a write-only form. The token creates records but someone would need
  to know your base structure to do anything weird.
- If you want more security later, you can put a Cloudflare Worker
  or Netlify Function in front of the Airtable API.
- Site is pure HTML/CSS/JS, no frameworks, loads instantly.
- Courier New font, white background, zero design = the brand.