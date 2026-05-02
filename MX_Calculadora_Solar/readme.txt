CALCULADORA SOLAR - TOP 40 CIUDADES DE MEXICO
==============================================

ARCHIVOS
- main.html    Pagina principal con grafica comparativa + tarjetas por ciudad
- calc.html    Calculadora especifica por ciudad (lee parametros del URL)
- app.js       Calculadora standalone Saltillo (legacy)
- index.html   Calculadora standalone Saltillo (legacy)

COMO FUNCIONA
- main.html muestra las 40 ciudades mas importantes de Mexico ordenadas por ROI solar
- Click en cualquier tarjeta abre calc.html con datos de esa ciudad
- calc.html lee ciudad, estado, horas sol y latitud del URL
- Todos los calculos usan CFE Tarifa DAC ($6.50 MXN/kWh)

SUBIR AL SITIO WEB
1. Subir main.html y calc.html al mismo directorio
2. Listo. Sin build, sin dependencias, sin npm.

OPCIONES DE DEPLOY
- Netlify: arrastra la carpeta a netlify.com/drop
- GitHub Pages: push al repo, activar Pages en settings
- Vercel: vercel deploy desde la carpeta
- Cualquier servidor web: solo sirve los archivos

EMBEBER EN SITIO EXISTENTE
<iframe src="main.html" width="100%" height="800" frameborder="0"></iframe>

PERSONALIZAR
- Editar datos de ciudades en main.html (array cities en el script)
- Editar specs de paneles en calc.html (objeto D en el script)
- Tarifa: D.tar (actualmente 6.50 MXN/kWh)
- Potencia panel: D.wp (actualmente 550Wp)
- Costo instalacion: D.cost (actualmente 18 MXN/Wp)
- Eficiencia sistema: D.eff (actualmente 0.80 = 80%)

PRUEBA LOCAL
Doble click en main.html. Funciona offline, no necesita servidor.
Nota: URLs file:// pueden bloquear URLSearchParams en algunos navegadores.
Si calc.html muestra "Saltillo" para todas las ciudades, usa servidor local:
  python -m http.server 8000
  luego abre http://localhost:8000/main.html
