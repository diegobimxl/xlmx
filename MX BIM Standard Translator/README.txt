BIM STANDARD TRANSLATOR — ISO 19650 en Espanol
================================================

Glosario interactivo BIM con 45+ terminos traducidos
English-Spanish, tabla LOD/LOI, fases ISO 19650,
y matriz de entregables por fase.
Todo en un solo archivo HTML. Cero dependencias.

ARCHIVOS
--------
index.html   - Aplicacion completa
README.txt   - Este archivo
Archive/     - Versiones anteriores

CONTENIDO
---------
  Glosario: 45+ terminos ISO 19650, VDC, Revit, clasificacion
  LOD/LOI: Tabla LOD 100-500 con geometria, informacion y uso
  Fases: Las 8 fases ISO 19650 (0-7) con actividades
  Matriz: Entregables por elemento y fase

DEPLOY
------
  Subfolder: sube index.html a /bim-translator/ en itera.design
  Netlify: arrastra carpeta a app.netlify.com/drop
  GitHub Pages: repo + Settings > Pages
  Iframe: <iframe src="/bim-translator/index.html" width="100%" height="800"></iframe>

TEST LOCAL: doble click en index.html

PERSONALIZAR
------------
  Agregar terminos: edita el array GLOSSARY en el <script>
  Colores: edita :root en el <style>
  Logo/nombre: edita el div .header