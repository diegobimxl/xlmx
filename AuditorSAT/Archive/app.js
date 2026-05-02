// SAT Auditor — Conciliacion Fiscal CFDI
// itera.design

let xmlFiles=[], emitidos=[], recibidos=[], conciliacion={}, resumenFiscal={};
const CFDI4='http://www.sat.gob.mx/cfd/4', CFDI3='http://www.sat.gob.mx/cfd/3';
const TFD='http://www.sat.gob.mx/TimbreFiscalDigital';
const RFC_GEN=new Set(['XAXX010101000','XEXX010101000']);
const TIPO={I:'Ingreso',E:'Egreso',P:'Pago',T:'Traslado',N:'Nomina'};
const fmt=n=>{if(n==null||isNaN(n))return'$0.00';return'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};

function parseCFDI(xml,file,origen){
  const c={uuid:'',version:'',fecha:null,fechaStr:'',tipo:'',tipoNombre:'',
    rfcEmisor:'',nombreEmisor:'',rfcReceptor:'',nombreReceptor:'',
    usoCfdi:'',subtotal:0,descuento:0,total:0,moneda:'MXN',tipoCambio:1,
    ivaTrasladado:0,ivaRetenido:0,isrRetenido:0,ieps:0,
    esPago:false,origen,archivo:file,periodo:'',esDeducible:true,notas:[]};
  let doc;
  try{doc=new DOMParser().parseFromString(xml,'text/xml')}catch(e){c.notas.push('XML malformado');return c}
  if(doc.querySelector('parsererror')){c.notas.push('XML malformado');return c}
  const root=doc.documentElement;
  let ns;
  if(root.namespaceURI&&root.namespaceURI.includes('cfd/4')){ns=CFDI4;c.version='4.0'}
  else if(root.namespaceURI&&root.namespaceURI.includes('cfd/3')){ns=CFDI3;c.version='3.3'}
  else{c.notas.push('Version no reconocida');return c}
  const q=(p,n)=>{let e=p.getElementsByTagNameNS(ns,n);if(e.length)return e[0];e=p.getElementsByTagName('cfdi:'+n);return e.length?e[0]:null};
  const qAll=(p,u,n)=>{let e=p.getElementsByTagNameNS(u,n);return e.length?e:p.getElementsByTagName('cfdi:'+n)};
  c.fechaStr=root.getAttribute('Fecha')||'';
  if(c.fechaStr){try{c.fecha=new Date(c.fechaStr);c.periodo=c.fecha.getFullYear()+'-'+String(c.fecha.getMonth()+1).padStart(2,'0')}catch(e){}}
  c.tipo=root.getAttribute('TipoDeComprobante')||'';
  c.tipoNombre=TIPO[c.tipo]||'Desconocido';
  c.subtotal=parseFloat(root.getAttribute('SubTotal'))||0;  c.descuento=parseFloat(root.getAttribute('Descuento'))||0;
  c.total=parseFloat(root.getAttribute('Total'))||0;
  c.moneda=root.getAttribute('Moneda')||'MXN';
  c.tipoCambio=parseFloat(root.getAttribute('TipoCambio'))||1;
  const em=q(root,'Emisor');
  if(em){c.rfcEmisor=em.getAttribute('Rfc')||'';c.nombreEmisor=em.getAttribute('Nombre')||''}
  const rec=q(root,'Receptor');
  if(rec){c.rfcReceptor=rec.getAttribute('Rfc')||'';c.nombreReceptor=rec.getAttribute('Nombre')||'';c.usoCfdi=rec.getAttribute('UsoCFDI')||''}
  const imp=q(root,'Impuestos');
  if(imp){
    const tr=qAll(imp,ns,'Traslado');for(let i=0;i<tr.length;i++){const t=tr[i],im=t.getAttribute('Impuesto')||'',amt=parseFloat(t.getAttribute('Importe'))||0;if(im==='002')c.ivaTrasladado+=amt;else if(im==='003')c.ieps+=amt}
    const rt=qAll(imp,ns,'Retencion');for(let i=0;i<rt.length;i++){const r=rt[i],im=r.getAttribute('Impuesto')||'',amt=parseFloat(r.getAttribute('Importe'))||0;if(im==='002')c.ivaRetenido+=amt;else if(im==='001')c.isrRetenido+=amt}
  }
  const tfd=doc.getElementsByTagNameNS(TFD,'TimbreFiscalDigital');
  if(tfd.length)c.uuid=(tfd[0].getAttribute('UUID')||'').toUpperCase();
  const contra=origen==='emitido'?c.rfcReceptor:c.rfcEmisor;
  if(RFC_GEN.has(contra)){c.esDeducible=false;c.notas.push('RFC generico')}
  if(!c.uuid)c.notas.push('Sin UUID');
  return c;
}

function runConciliacion(em,rec){
  const uE={},uR={},disc=[],dE=[],dR=[],rfc={};
  em.forEach(c=>{if(c.uuid){if(uE[c.uuid])dE.push([c,uE[c.uuid]]);else uE[c.uuid]=c}});
  rec.forEach(c=>{if(c.uuid){if(uR[c.uuid])dR.push([c,uR[c.uuid]]);else uR[c.uuid]=c}});
  const all=new Set([...Object.keys(uE),...Object.keys(uR)]);
  all.forEach(u=>{
    const inE=u in uE,inR=u in uR;
    if(inE&&!inR){const c=uE[u];disc.push({uuid:u,tipo:'Solo en emitidos',descripcion:'Sin contrapartida en recibidos',rfc:c.rfcReceptor,nombre:c.nombreReceptor,total:c.total,fecha:c.fechaStr,severidad:'MEDIA'})}
    else if(inR&&!inE){const c=uR[u];disc.push({uuid:u,tipo:'Solo en recibidos',descripcion:'Sin contrapartida en emitidos',rfc:c.rfcEmisor,nombre:c.nombreEmisor,total:c.total,fecha:c.fechaStr,severidad:'MEDIA'})}
    else{const ce=uE[u],cr=uR[u];if(Math.abs(ce.total-cr.total)>0.01)disc.push({uuid:u,tipo:'Diferencia monto',descripcion:'Em: '+fmt(ce.total)+' vs Rec: '+fmt(cr.total),rfc:ce.rfcReceptor,nombre:ce.nombreReceptor,total:Math.abs(ce.total-cr.total),fecha:ce.fechaStr,severidad:'ALTA'})}
  });  dE.forEach(([a,b])=>disc.push({uuid:a.uuid,tipo:'UUID duplicado (em)',descripcion:a.archivo+' / '+b.archivo,rfc:a.rfcReceptor,nombre:a.nombreReceptor,total:a.total,fecha:a.fechaStr,severidad:'ALTA'}));
  dR.forEach(([a,b])=>disc.push({uuid:a.uuid,tipo:'UUID duplicado (rec)',descripcion:a.archivo+' / '+b.archivo,rfc:a.rfcEmisor,nombre:a.nombreEmisor,total:a.total,fecha:a.fechaStr,severidad:'ALTA'}));
  rec.forEach(c=>{if(!c.esDeducible)disc.push({uuid:c.uuid,tipo:'No deducible',descripcion:'RFC generico ('+c.rfcEmisor+')',rfc:c.rfcEmisor,nombre:c.nombreEmisor,total:c.total,fecha:c.fechaStr,severidad:'BAJA'})});
  const addR=(r,n,f,a,iv,iva)=>{if(!rfc[r])rfc[r]={nombre:'',emitido:0,recibido:0,ivaTrasl:0,ivaAcred:0,numEm:0,numRec:0};if(n)rfc[r].nombre=n;rfc[r][f]+=a;if(iv)rfc[r][iv]+=iva;rfc[r][f==='emitido'?'numEm':'numRec']++};
  em.forEach(c=>{if(c.tipo==='I'||c.tipo==='E')addR(c.rfcReceptor,c.nombreReceptor,'emitido',c.total,'ivaTrasl',c.ivaTrasladado)});
  rec.forEach(c=>{if(c.tipo==='I'||c.tipo==='E')addR(c.rfcEmisor,c.nombreEmisor,'recibido',c.total,'ivaAcred',c.ivaTrasladado)});
  const sv={ALTA:0,MEDIA:1,BAJA:2};disc.sort((a,b)=>(sv[a.severidad]||3)-(sv[b.severidad]||3));
  return{discrepancias:disc,resumenRfc:rfc};
}

function calcResumen(em,rec){
  const m={};
  const g=p=>{if(!m[p])m[p]={ingresos:0,gastos:0,ivaTrasladado:0,ivaAcreditable:0,ivaRetEm:0,ivaRetRec:0,isrRetEm:0,isrRetRec:0,ivaPorPagar:0,noDeducible:0,numEm:0,numRec:0};return m[p]};
  em.forEach(c=>{if(!c.periodo)return;const x=g(c.periodo);x.numEm++;if(c.tipo==='I'){x.ingresos+=c.total;x.ivaTrasladado+=c.ivaTrasladado}x.ivaRetEm+=c.ivaRetenido;x.isrRetEm+=c.isrRetenido});
  rec.forEach(c=>{if(!c.periodo)return;const x=g(c.periodo);x.numRec++;if(c.tipo==='I'){x.gastos+=c.total;if(c.esDeducible)x.ivaAcreditable+=c.ivaTrasladado;else x.noDeducible+=c.total}x.ivaRetRec+=c.ivaRetenido;x.isrRetRec+=c.isrRetenido});
  Object.values(m).forEach(x=>{x.ivaPorPagar=x.ivaTrasladado-x.ivaAcreditable});
  const s={};Object.keys(m).sort().forEach(k=>s[k]=m[k]);return s;
}

// RENDER
function renderKPIs(){
  const ti=Object.values(resumenFiscal).reduce((s,m)=>s+m.ingresos,0);
  const tg=Object.values(resumenFiscal).reduce((s,m)=>s+m.gastos,0);
  const tv=Object.values(resumenFiscal).reduce((s,m)=>s+m.ivaPorPagar,0);
  const tn=Object.values(resumenFiscal).reduce((s,m)=>s+m.noDeducible,0);
  const al=conciliacion.discrepancias.filter(d=>d.severidad==='ALTA').length;
  const kpis=[{l:'Ingresos',v:fmt(ti)},{l:'Gastos',v:fmt(tg)},{l:'Utilidad',v:fmt(ti-tg)},{l:'IVA por Pagar',v:fmt(tv)},{l:'No Deducible',v:fmt(tn)},{l:'Discrepancias',v:conciliacion.discrepancias.length,a:al>0}];
  document.getElementById('kpiGrid').innerHTML=kpis.map(k=>`<div class="kpi-card${k.a?' alert':''}"><div class="label">${k.l}</div><div class="value">${k.v}</div></div>`).join('');
}
function renderResumen(per){
  const data=per?{[per]:resumenFiscal[per]}:resumenFiscal;
  if(!data||!Object.keys(data).length){document.getElementById('tab-resumen').innerHTML='<p style="padding:20px;color:#666">Sin datos</p>';return}
  let h='<table><thead><tr>';
  ['Periodo','Em.','Rec.','Ingresos','Gastos','IVA Trasl.','IVA Acred.','IVA x Pagar','IVA Ret.','ISR Ret.','No Ded.','Utilidad'].forEach(x=>h+=`<th>${x}</th>`);
  h+='</tr></thead><tbody>';
  let t={i:0,g:0,it:0,ia:0,ip:0,ir:0,is:0,nd:0,u:0};
  Object.entries(data).forEach(([p,m])=>{if(!m)return;const u=m.ingresos-m.gastos,ir=m.ivaRetEm+m.ivaRetRec,is=m.isrRetEm+m.isrRetRec;
    t.i+=m.ingresos;t.g+=m.gastos;t.it+=m.ivaTrasladado;t.ia+=m.ivaAcreditable;t.ip+=m.ivaPorPagar;t.ir+=ir;t.is+=is;t.nd+=m.noDeducible;t.u+=u;
    h+=`<tr><td>${p}</td><td class="text-center">${m.numEm}</td><td class="text-center">${m.numRec}</td><td class="text-right">${fmt(m.ingresos)}</td><td class="text-right">${fmt(m.gastos)}</td><td class="text-right">${fmt(m.ivaTrasladado)}</td><td class="text-right">${fmt(m.ivaAcreditable)}</td><td class="text-right">${fmt(m.ivaPorPagar)}</td><td class="text-right">${fmt(ir)}</td><td class="text-right">${fmt(is)}</td><td class="text-right">${fmt(m.noDeducible)}</td><td class="text-right">${fmt(u)}</td></tr>`});
  if(!per)h+=`<tr style="color:#fff"><td>TOTAL</td><td></td><td></td><td class="text-right">${fmt(t.i)}</td><td class="text-right">${fmt(t.g)}</td><td class="text-right">${fmt(t.it)}</td><td class="text-right">${fmt(t.ia)}</td><td class="text-right">${fmt(t.ip)}</td><td class="text-right">${fmt(t.ir)}</td><td class="text-right">${fmt(t.is)}</td><td class="text-right">${fmt(t.nd)}</td><td class="text-right">${fmt(t.u)}</td></tr>`;
  h+='</tbody></table>';document.getElementById('tab-resumen').innerHTML=h;
}

function renderEmitidos(per){
  const data=per?emitidos.filter(c=>c.periodo===per):emitidos;
  let h='<table><thead><tr>';['UUID','Fecha','Tipo','RFC','Nombre','Subtotal','IVA','IVA Ret','ISR Ret','Total','Moneda'].forEach(x=>h+=`<th>${x}</th>`);
  h+='</tr></thead><tbody>';
  data.forEach(c=>{h+=`<tr><td title="${c.uuid}">${c.uuid.slice(0,8)}</td><td>${c.fechaStr.slice(0,10)}</td><td>${c.tipoNombre}</td><td>${c.rfcReceptor}</td><td>${c.nombreReceptor}</td><td class="text-right">${fmt(c.subtotal)}</td><td class="text-right">${fmt(c.ivaTrasladado)}</td><td class="text-right">${fmt(c.ivaRetenido)}</td><td class="text-right">${fmt(c.isrRetenido)}</td><td class="text-right">${fmt(c.total)}</td><td>${c.moneda}</td></tr>`});
  h+='</tbody></table>';document.getElementById('tab-emitidos').innerHTML=h;
}

function renderRecibidos(per){
  const data=per?recibidos.filter(c=>c.periodo===per):recibidos;
  let h='<table><thead><tr>';['UUID','Fecha','Tipo','RFC','Nombre','Subtotal','IVA','IVA Ret','ISR Ret','Total','Ded.'].forEach(x=>h+=`<th>${x}</th>`);
  h+='</tr></thead><tbody>';
  data.forEach(c=>{const cl=c.esDeducible?'':' class="row-alert"';h+=`<tr${cl}><td title="${c.uuid}">${c.uuid.slice(0,8)}</td><td>${c.fechaStr.slice(0,10)}</td><td>${c.tipoNombre}</td><td>${c.rfcEmisor}</td><td>${c.nombreEmisor}</td><td class="text-right">${fmt(c.subtotal)}</td><td class="text-right">${fmt(c.ivaTrasladado)}</td><td class="text-right">${fmt(c.ivaRetenido)}</td><td class="text-right">${fmt(c.isrRetenido)}</td><td class="text-right">${fmt(c.total)}</td><td class="text-center"><span class="badge ${c.esDeducible?'badge-baja':'badge-alta'}">${c.esDeducible?'SI':'NO'}</span></td></tr>`});
  h+='</tbody></table>';document.getElementById('tab-recibidos').innerHTML=h;
}
function renderConciliacion(){
  let h='<table><thead><tr>';['Sev.','Tipo','UUID','RFC','Nombre','Total','Fecha','Descripcion'].forEach(x=>h+=`<th>${x}</th>`);
  h+='</tr></thead><tbody>';
  conciliacion.discrepancias.forEach(d=>{const cl=d.severidad==='ALTA'?' class="row-alert"':d.severidad==='MEDIA'?' class="row-warn"':'';const bg=d.severidad==='ALTA'?'badge-alta':d.severidad==='MEDIA'?'badge-media':'badge-baja';
    h+=`<tr${cl}><td><span class="badge ${bg}">${d.severidad}</span></td><td>${d.tipo}</td><td title="${d.uuid}">${d.uuid.slice(0,8)}</td><td>${d.rfc}</td><td>${d.nombre}</td><td class="text-right">${fmt(d.total)}</td><td>${d.fecha.slice(0,10)}</td><td>${d.descripcion}</td></tr>`});
  h+='</tbody></table>';document.getElementById('tab-conciliacion').innerHTML=h;
}

function renderRFC(){
  const sorted=Object.entries(conciliacion.resumenRfc).sort((a,b)=>(b[1].emitido+b[1].recibido)-(a[1].emitido+a[1].recibido));
  let h='<table><thead><tr>';['RFC','Nombre','Emitido','Recibido','Neto','IVA Trasl.','IVA Acred.','Em.','Rec.'].forEach(x=>h+=`<th>${x}</th>`);
  h+='</tr></thead><tbody>';
  sorted.forEach(([r,v])=>{h+=`<tr><td>${r}</td><td>${v.nombre}</td><td class="text-right">${fmt(v.emitido)}</td><td class="text-right">${fmt(v.recibido)}</td><td class="text-right">${fmt(v.emitido-v.recibido)}</td><td class="text-right">${fmt(v.ivaTrasl)}</td><td class="text-right">${fmt(v.ivaAcred)}</td><td class="text-center">${v.numEm}</td><td class="text-center">${v.numRec}</td></tr>`});
  h+='</tbody></table>';document.getElementById('tab-rfc').innerHTML=h;
}

function renderAll(p){renderKPIs();renderResumen(p);renderEmitidos(p);renderRecibidos(p);renderConciliacion();renderRFC()}

async function processFiles(files){
  const status=document.getElementById('statusBar');
  status.classList.remove('hidden');status.textContent='Parseando...';
  emitidos=[];recibidos=[];
  for(const f of files){
    const content=f.content||await f.text();
    const origen=f.origen||(f.name.toLowerCase().includes('emitido')?'emitido':'recibido');
    const cfdi=parseCFDI(content,f.name,origen);
    if(cfdi.uuid||cfdi.notas.length){if(origen==='emitido')emitidos.push(cfdi);else recibidos.push(cfdi)}
  }
  status.textContent=`${emitidos.length} emitidos, ${recibidos.length} recibidos. Conciliando...`;
  conciliacion=runConciliacion(emitidos,recibidos);
  resumenFiscal=calcResumen(emitidos,recibidos);
  const periodos=[...new Set(Object.keys(resumenFiscal))].sort();
  const sel=document.getElementById('periodoSelect');
  sel.innerHTML='<option value="">Todos</option>';
  periodos.forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;sel.appendChild(o)});
  renderAll('');
  document.getElementById('results').style.display='block';
  document.getElementById('btnExport').classList.remove('hidden');  const al=conciliacion.discrepancias.filter(d=>d.severidad==='ALTA').length;
  status.textContent=`Auditoria completa: ${emitidos.length} emitidos, ${recibidos.length} recibidos, ${conciliacion.discrepancias.length} discrepancias${al?` (${al} criticas)`:''}`;
}

function exportCSV(){
  const hd=['Severidad','Tipo','UUID','RFC','Nombre','Total','Fecha','Descripcion'];
  let csv=hd.join(',')+'\n';
  conciliacion.discrepancias.forEach(d=>{csv+=[d.severidad,'"'+d.tipo+'"',d.uuid,d.rfc,'"'+(d.nombre||'')+'"',d.total,d.fecha,'"'+d.descripcion+'"'].join(',')+'\n'});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sat_conciliacion_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// EVENT HANDLERS
const uploadZone=document.getElementById('uploadZone');
const fileInput=document.getElementById('fileInput');
const fileCount=document.getElementById('fileCount');
const btnAudit=document.getElementById('btnAudit');
const btnExport=document.getElementById('btnExport');

uploadZone.addEventListener('click',()=>fileInput.click());
uploadZone.addEventListener('dragover',e=>{e.preventDefault();uploadZone.classList.add('drag-over')});
uploadZone.addEventListener('dragleave',()=>uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop',e=>{e.preventDefault();uploadZone.classList.remove('drag-over');
  const f=[...e.dataTransfer.files].filter(f=>f.name.endsWith('.xml'));
  if(f.length){xmlFiles=f;fileCount.textContent=f.length+' archivos';fileCount.classList.remove('hidden');btnAudit.disabled=false}});
fileInput.addEventListener('change',e=>{const f=[...e.target.files].filter(f=>f.name.endsWith('.xml'));
  if(f.length){xmlFiles=f;fileCount.textContent=f.length+' archivos';fileCount.classList.remove('hidden');btnAudit.disabled=false}});
btnAudit.addEventListener('click',()=>processFiles(xmlFiles));
btnExport.addEventListener('click',exportCSV);
document.getElementById('tabBar').addEventListener('click',e=>{if(!e.target.classList.contains('tab'))return;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  e.target.classList.add('active');document.getElementById('tab-'+e.target.dataset.tab).classList.add('active')});
document.getElementById('periodoSelect').addEventListener('change',e=>{renderResumen(e.target.value);renderEmitidos(e.target.value);renderRecibidos(e.target.value)});