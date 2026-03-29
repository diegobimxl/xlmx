AUDITOR SAT — Conciliacion Fiscal CFDI
=======================================

Herramienta web para conciliar facturas CFDI 3.3/4.0 del SAT.
Sube XMLs emitidos y recibidos, obtiene resumen fiscal,
discrepancias y exporta CSV.
Todo corre en el navegador. Cero servidores, cero dependencias.

ARCHIVOS
--------
index.html   - Aplicacion completa (HTML + CSS + JS en un solo archivo)
README.txt   - Este archivo
Archive/     - Versiones anteriores

DEPLOY
------
Opcion 1: Subfolder en itera.design
  1. Sube index.html a tu hosting en /auditor-sat/
  2. Accede: https://itera.design/auditor-sat/

Opcion 2: Netlify Drop
  1. Ve a https://app.netlify.com/drop
  2. Arrastra la carpeta AuditorSAT
  3. Para subdominio: sat.itera.design
     DNS: CNAME sat -> tu-site.netlify.app

Opcion 3: GitHub Pages
  1. Crea repo, sube index.html
  2. Settings > Pages > main branch
  3. Custom domain: sat.itera.design
Opcion 4: Vercel
  1. https://vercel.com/new > arrastra carpeta
  2. Deploy automatico, configura dominio

Opcion 5: Iframe embed
  <iframe src="/auditor-sat/index.html" width="100%" height="800" frameborder="0"></iframe>

TEST LOCAL
----------
  1. Doble click en index.html (abre en Chrome)
  2. Arrastra tus XMLs del SAT
  3. Click Auditar

COMO FUNCIONA
-------------
  Archivos con "emitido" en el nombre = emitidos, todo lo demas = recibidos.
  Concilia por UUID, detecta duplicados, diferencias de monto, RFC generico.
  Exporta discrepancias a CSV.

PERSONALIZAR
------------
  Colores: edita :root en el <style> del index.html
  Logo: agrega <img> en el div .header
  Nombre: cambia el <h1> y <title>