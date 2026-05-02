#!/usr/bin/env python3
"""
SAT XML Invoice Parser — Herramienta Fiscal para Despacho de Arquitectura
Autor: Diego Rodriguez / BIM XL
Fecha: 2026-03-25

Extrae Conceptos, Impuestos y RFC de CFDIs (XML SAT 4.0 y 3.3).
Clasifica deducciones fiscales para un despacho de arquitectura.
Genera tabla resumen en español y exporta CSV para Airtable.

Uso:
    python sat_xml_parser.py ruta/a/facturas/
    python sat_xml_parser.py factura.xml
"""

import xml.etree.ElementTree as ET
import os
import sys
import csv
from pathlib import Path
from datetime import datetime

# --- Namespaces SAT CFDI 4.0 y 3.3 ---
NS = {
    'cfdi': 'http://www.sat.gob.mx/cdi/4.0',
    'cfdi33': 'http://www.sat.gob.mx/cdi/3.3',
    'tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital',
}

# --- Categorias de Deduccion Fiscal para Despacho de Arquitectura ---
CATEGORIAS_DEDUCCION = {
    'honorarios': {
        'palabras_clave': ['honorario', 'consultor', 'asesor', 'profesional',
                           'diseno', 'arquitect', 'ingenier', 'topograf'],
        'categoria': 'Honorarios Profesionales',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. III LISR',
    },
    'software': {
        'palabras_clave': ['software', 'licencia', 'autodesk', 'revit', 'autocad',
                           'bim', 'adobe', 'microsoft', 'suscripcion'],
        'categoria': 'Software y Licencias',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. IV LISR (inversiones)',
    },
    'equipo_computo': {
        'palabras_clave': ['computadora', 'laptop', 'monitor', 'servidor',
                           'impresora', 'plotter', 'escaner', 'disco duro'],
        'categoria': 'Equipo de Computo',
        'deducible': True,
        'fundamento': 'Art. 33 Frac. II LISR (30% anual)',
    },
    'oficina': {
        'palabras_clave': ['renta', 'alquiler', 'oficina', 'coworking',
                           'mantenimiento', 'limpieza', 'electricidad',
                           'agua', 'internet', 'telefon'],
        'categoria': 'Gastos de Oficina',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. III LISR',
    },
    'transporte': {
        'palabras_clave': ['gasolina', 'combustible', 'caseta', 'peaje',
                           'estacionamiento', 'uber', 'avion', 'vuelo',
                           'hospedaje', 'hotel', 'viatico'],
        'categoria': 'Transporte y Viaticos',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. III LISR / Art. 28 Frac. V',
    },
    'papeleria': {
        'palabras_clave': ['papeleria', 'impresion', 'plano', 'copiado',
                           'toner', 'papel', 'ploteo', 'maqueta'],
        'categoria': 'Papeleria e Impresion',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. III LISR',
    },
    'capacitacion': {
        'palabras_clave': ['curso', 'capacitacion', 'diplomado', 'maestria',
                           'certificacion', 'seminario', 'congreso', 'taller'],
        'categoria': 'Capacitacion y Desarrollo',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. III LISR',
    },
    'seguros': {
        'palabras_clave': ['seguro', 'poliza', 'prima', 'fianza'],
        'categoria': 'Seguros y Fianzas',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. XI LISR',
    },
    'subcontratacion': {
        'palabras_clave': ['subcontrat', 'outsourcing', 'obra', 'construccion',
                           'instalacion', 'mano de obra', 'estructura'],
        'categoria': 'Subcontratacion / Obra',
        'deducible': True,
        'fundamento': 'Art. 25 Frac. II LISR (costo de venta)',
    },
}


def detectar_version_cfdi(root):
    """Detecta si es CFDI 4.0 o 3.3 basado en namespace del root."""
    tag = root.tag
    if '4.0' in tag:
        return 'cfdi', '4.0'
    elif '3.3' in tag:
        return 'cfdi33', '3.3'
    for prefix, uri in NS.items():
        if uri in tag:
            return prefix, uri
    return 'cfdi', '4.0'


def clasificar_concepto(descripcion):
    """Clasifica un concepto en categoria de deduccion fiscal."""
    desc_lower = descripcion.lower()
    for key, cat in CATEGORIAS_DEDUCCION.items():
        for palabra in cat['palabras_clave']:
            if palabra in desc_lower:
                return cat['categoria'], cat['deducible'], cat['fundamento']
    return 'Sin Clasificar', False, 'Revisar manualmente'


def parsear_xml(filepath):
    """Parsea un CFDI XML y extrae RFC, Conceptos e Impuestos."""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"  [ERROR] No se pudo parsear {filepath}: {e}")
        return None

    ns_prefix, version = detectar_version_cfdi(root)
    ns = NS.get(ns_prefix, NS['cfdi'])

    datos = {
        'archivo': os.path.basename(filepath),
        'version': root.attrib.get('Version', 'N/A'),
        'fecha': root.attrib.get('Fecha', 'N/A'),
        'tipo_comprobante': root.attrib.get('TipoDeComprobante', 'N/A'),
        'subtotal': float(root.attrib.get('SubTotal', 0)),
        'total': float(root.attrib.get('Total', 0)),
        'moneda': root.attrib.get('Moneda', 'MXN'),
        'forma_pago': root.attrib.get('FormaPago', 'N/A'),
        'metodo_pago': root.attrib.get('MetodoPago', 'N/A'),
    }

    emisor = root.find(f'{{{ns}}}Emisor')
    receptor = root.find(f'{{{ns}}}Receptor')

    if emisor is not None:
        datos['rfc_emisor'] = emisor.attrib.get('Rfc', 'N/A')
        datos['nombre_emisor'] = emisor.attrib.get('Nombre', 'N/A')
        datos['regimen_fiscal'] = emisor.attrib.get('RegimenFiscal', 'N/A')
    else:
        datos['rfc_emisor'] = 'N/A'
        datos['nombre_emisor'] = 'N/A'
        datos['regimen_fiscal'] = 'N/A'

    if receptor is not None:
        datos['rfc_receptor'] = receptor.attrib.get('Rfc', 'N/A')
        datos['nombre_receptor'] = receptor.attrib.get('Nombre', 'N/A')
        datos['uso_cfdi'] = receptor.attrib.get('UsoCFDI', 'N/A')
    else:
        datos['rfc_receptor'] = 'N/A'
        datos['nombre_receptor'] = 'N/A'
        datos['uso_cfdi'] = 'N/A'

    conceptos = []
    conceptos_node = root.find(f'{{{ns}}}Conceptos')
    if conceptos_node is not None:
        for c in conceptos_node.findall(f'{{{ns}}}Concepto'):
            descripcion = c.attrib.get('Descripcion', '')
            cat, deducible, fundamento = clasificar_concepto(descripcion)
            concepto = {
                'clave_prod_serv': c.attrib.get('ClaveProdServ', 'N/A'),
                'cantidad': float(c.attrib.get('Cantidad', 0)),
                'clave_unidad': c.attrib.get('ClaveUnidad', 'N/A'),
                'descripcion': descripcion,
                'valor_unitario': float(c.attrib.get('ValorUnitario', 0)),
                'importe': float(c.attrib.get('Importe', 0)),
                'categoria_deduccion': cat,
                'deducible': deducible,
                'fundamento_legal': fundamento,
            }
            conceptos.append(concepto)
    datos['conceptos'] = conceptos

    impuestos = {'traslados': [], 'retenciones': []}
    imp_node = root.find(f'{{{ns}}}Impuestos')
    if imp_node is not None:
        datos['total_impuestos_trasladados'] = float(
            imp_node.attrib.get('TotalImpuestosTrasladados', 0))
        datos['total_impuestos_retenidos'] = float(
            imp_node.attrib.get('TotalImpuestosRetenidos', 0))
        traslados = imp_node.find(f'{{{ns}}}Traslados')
        if traslados is not None:
            for t in traslados.findall(f'{{{ns}}}Traslado'):
                impuestos['traslados'].append({
                    'impuesto': t.attrib.get('Impuesto', 'N/A'),
                    'tipo_factor': t.attrib.get('TipoFactor', 'N/A'),
                    'tasa_cuota': t.attrib.get('TasaOCuota', 'N/A'),
                    'importe': float(t.attrib.get('Importe', 0)),
                })
        retenciones = imp_node.find(f'{{{ns}}}Retenciones')
        if retenciones is not None:
            for r in retenciones.findall(f'{{{ns}}}Retencion'):
                impuestos['retenciones'].append({
                    'impuesto': r.attrib.get('Impuesto', 'N/A'),
                    'importe': float(r.attrib.get('Importe', 0)),
                })
    else:
        datos['total_impuestos_trasladados'] = 0
        datos['total_impuestos_retenidos'] = 0

    datos['impuestos'] = impuestos
    return datos


def imprimir_resumen(resultados):
    """Imprime tabla resumen en espanol."""
    if not resultados:
        print("\n  No se encontraron facturas XML validas.")
        return

    print("\n" + "=" * 100)
    print("  RESUMEN FISCAL -- DESPACHO DE ARQUITECTURA")
    print("  Fecha de analisis:", datetime.now().strftime("%d/%m/%Y %H:%M"))
    print("  Total de facturas procesadas:", len(resultados))
    print("=" * 100)

    header = "{:<5}{:<30}{:<16}{:>12}{:>12}{:>12} {:<5}".format(
        'No.', 'Archivo', 'RFC Emisor', 'Subtotal', 'IVA', 'Total', 'Tipo')
    print("\n" + header)
    print("-" * 100)

    total_subtotal = 0
    total_iva = 0
    total_total = 0

    for i, r in enumerate(resultados, 1):
        iva = r.get('total_impuestos_trasladados', 0)
        line = "{:<5}{:<30}{:<16}${:>11,.2f}${:>11,.2f}${:>11,.2f} {:<5}".format(
            i, r['archivo'][:28], r['rfc_emisor'],
            r['subtotal'], iva, r['total'], r['tipo_comprobante'])
        print(line)
        total_subtotal += r['subtotal']
        total_iva += iva
        total_total += r['total']

    print("-" * 100)
    print("{:>51}${:>11,.2f}${:>11,.2f}${:>11,.2f}".format(
        'TOTALES', total_subtotal, total_iva, total_total))

    # Tabla de deducciones por categoria
    print("\n\n" + "=" * 80)
    print("  CLASIFICACION DE DEDUCCIONES FISCALES")
    print("=" * 80)

    categorias_totales = {}
    sin_clasificar = []

    for r in resultados:
        for c in r.get('conceptos', []):
            cat = c['categoria_deduccion']
            if cat not in categorias_totales:
                categorias_totales[cat] = {
                    'importe': 0, 'count': 0,
                    'deducible': c['deducible'],
                    'fundamento': c['fundamento_legal']
                }
            categorias_totales[cat]['importe'] += c['importe']
            categorias_totales[cat]['count'] += 1
            if not c['deducible']:
                sin_clasificar.append(c)

    header2 = "{:<30}{:>12}{:>15}{:>12} {:<25}".format(
        'Categoria', '# Conceptos', 'Importe', 'Deducible', 'Fundamento')
    print("\n" + header2)
    print("-" * 95)

    total_deducible = 0
    total_no_deducible = 0

    for cat, info in sorted(categorias_totales.items(),
                            key=lambda x: x[1]['importe'], reverse=True):
        ded_str = "SI" if info['deducible'] else "NO"
        print("{:<30}{:>12}  ${:>12,.2f}  {:>10}  {:<25}".format(
            cat, info['count'], info['importe'], ded_str, info['fundamento']))
        if info['deducible']:
            total_deducible += info['importe']
        else:
            total_no_deducible += info['importe']

    print("-" * 95)
    print("{:<44}${:>12,.2f}".format('Total Deducible:', total_deducible))
    print("{:<44}${:>12,.2f}".format(
        'Total Sin Clasificar / No Deducible:', total_no_deducible))
    print("{:<44}${:>12,.2f}".format(
        'Potencial Ahorro ISR (35%):', total_deducible * 0.35))

    if sin_clasificar:
        print("\n\n  ALERTA: {} concepto(s) sin clasificar:".format(
            len(sin_clasificar)))
        for c in sin_clasificar[:10]:
            print("    - {}  |  ${:,.2f}".format(
                c['descripcion'][:60], c['importe']))

    print("\n" + "=" * 80 + "\n")


def exportar_csv(resultados, output_path):
    """Exporta resultados a CSV para importar a Airtable o Excel."""
    rows = []
    for r in resultados:
        for c in r.get('conceptos', []):
            rows.append({
                'Archivo': r['archivo'],
                'Fecha': r['fecha'],
                'RFC Emisor': r['rfc_emisor'],
                'Nombre Emisor': r['nombre_emisor'],
                'RFC Receptor': r['rfc_receptor'],
                'Tipo Comprobante': r['tipo_comprobante'],
                'ClaveProdServ': c['clave_prod_serv'],
                'Descripcion': c['descripcion'],
                'Cantidad': c['cantidad'],
                'Valor Unitario': c['valor_unitario'],
                'Importe': c['importe'],
                'Categoria Deduccion': c['categoria_deduccion'],
                'Deducible': 'SI' if c['deducible'] else 'NO',
                'Fundamento Legal': c['fundamento_legal'],
                'Total Factura': r['total'],
                'Moneda': r['moneda'],
            })

    if rows:
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        print("  CSV exportado: {}".format(output_path))


def main():
    if len(sys.argv) < 2:
        print("Uso: python sat_xml_parser.py <ruta_xml_o_carpeta>")
        print("Ejemplo: python sat_xml_parser.py ./facturas/")
        print("         python sat_xml_parser.py factura_001.xml")
        sys.exit(1)

    ruta = sys.argv[1]
    archivos_xml = []

    if os.path.isdir(ruta):
        for f in Path(ruta).rglob('*.xml'):
            archivos_xml.append(str(f))
        print("\n  Carpeta: {}".format(ruta))
        print("  Archivos XML encontrados: {}".format(len(archivos_xml)))
    elif os.path.isfile(ruta) and ruta.lower().endswith('.xml'):
        archivos_xml.append(ruta)
    else:
        print("  [ERROR] Ruta no valida: {}".format(ruta))
        sys.exit(1)

    if not archivos_xml:
        print("  No se encontraron archivos XML.")
        sys.exit(1)

    resultados = []
    for xml_file in sorted(archivos_xml):
        print("  Procesando: {}...".format(os.path.basename(xml_file)))
        datos = parsear_xml(xml_file)
        if datos:
            resultados.append(datos)

    # Imprimir resumen
    imprimir_resumen(resultados)

    # Exportar CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    if os.path.isfile(ruta):
        csv_dir = os.path.dirname(ruta)
    else:
        csv_dir = ruta
    csv_path = os.path.join(csv_dir, "resumen_fiscal_{}.csv".format(timestamp))
    exportar_csv(resultados, csv_path)

    print("  Listo. Revisa el CSV para importar a Airtable.")


if __name__ == '__main__':
    main()
