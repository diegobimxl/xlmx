var D={sun:5.5,wp:550,pa:2.58,eff:0.80,tar:6.50,cost:18,co2:0.435,life:25,lat:25.42};
var OF={S:1.0,SSE:0.97,SSW:0.97,SE:0.92,SW:0.92,E:0.82,W:0.82,NE:0.60,NW:0.60,N:0.50};
var OL=['S','SSE','SSW','SE','SW','E','W','NE','NW','N'];
var curO='S';
function fmt(n,d){d=d||0;return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
function fm(n){return '$'+fmt(n);}
function tiltF(p,o){
  var of2=OF[o]||1;
  var tg;
  if(o==='N'||o==='NE'||o==='NW'){tg=1.0-(0.02*p);}
  else if(p<=D.lat){tg=1.0+(0.15*(p/D.lat));}
  else{tg=1.15-(0.15*((p-D.lat)/(45-D.lat)));}
  return Math.max(0.3,tg*of2);
}
function calc(bill,roof,pitch){
  var tf=tiltF(pitch,curO);
  var sh=D.sun*tf;
  var mk=bill/D.tar,ak=mk*12,dk=ak/365;
  var kw=dk/(sh*D.eff);
  var raw=Math.ceil(kw*1000/D.wp),mx=Math.floor(roof/D.pa);
  var n=Math.min(raw,mx),akw=n*D.wp/1000;
  var gen=akw*sh*365*D.eff;
  var cov=Math.min(gen/ak*100,100);
  var inv=akw*1000*D.cost,as=gen*D.tar,ms=as/12;
  var roi=as>0?inv/as:0;
  var c2=gen*D.co2/1000,c2l=c2*D.life*0.95;
  var brk=ms>0?Math.ceil(inv/ms):0;
  var p25=as*25-inv;
  return{mk:mk,n:n,akw:akw,gen:gen,cov:cov,inv:inv,as:as,ms:ms,roi:roi,c2:c2,c2l:c2l,brk:brk,p25:p25,sh:sh,tf:tf};
}
// Fixed Y-axis max: worst-case max scenario so chart visually changes
// Max bill $30k, max roof 200m2, best tilt/orient = ~77 panels, ~$693k inv, ~$9.6M savings over 25yr
var CHART_Y_MAX=10000000;

function drawChart(inv,ms){
  var c=document.getElementById('chart');
  var ctx=c.getContext('2d');
  var W=c.parentElement.getBoundingClientRect().width;
  if(W<50)W=600;
  var H=280,dpr=window.devicePixelRatio||1;
  c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);
  c.style.width=W+'px';c.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(inv<=0||ms<=0){
    ctx.fillStyle='#aaa';ctx.font='14px sans-serif';ctx.textAlign='center';
    ctx.fillText('Adjust sliders',W/2,H/2);return;
  }
  var mo=300,brk=-1,data=[];
  for(var i=0;i<=mo;i++){var s=ms*i;data.push(s);if(brk<0&&s>=inv)brk=i;}
  var top2=CHART_Y_MAX;
  var L=62,R=18,T=28,B=38,cW=W-L-R,cH=H-T-B;
  ctx.fillStyle='#fafafa';ctx.fillRect(L,T,cW,cH);
  // Y grid + labels
  for(var i=0;i<=5;i++){
    var y=T+cH-(cH/5)*i;
    ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();
    var v=top2/5*i;ctx.fillStyle='#999';ctx.font='10px sans-serif';ctx.textAlign='right';
    ctx.fillText('$'+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'k':v.toFixed(0)),L-6,y+3);
  }
  // X labels
  ctx.textAlign='center';ctx.fillStyle='#999';
  for(var yr=0;yr<=25;yr+=5){ctx.fillText(yr+'y',L+(yr*12/mo)*cW,H-B+16);}
  // Investment dashed line
  var iy=T+cH-(inv/top2)*cH;
  ctx.strokeStyle='#d44';ctx.lineWidth=1.5;ctx.setLineDash([8,4]);
  ctx.beginPath();ctx.moveTo(L,iy);ctx.lineTo(W-R,iy);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#d44';ctx.font='11px sans-serif';ctx.textAlign='left';
  ctx.fillText('Investment '+fm(inv),L+4,iy-8);
  // Savings fill
  ctx.beginPath();ctx.moveTo(L,T+cH);
  for(var i=0;i<=mo;i++){ctx.lineTo(L+(i/mo)*cW,T+cH-(data[i]/top2)*cH);}
  ctx.lineTo(L+cW,T+cH);ctx.closePath();
  var g=ctx.createLinearGradient(0,T,0,T+cH);
  g.addColorStop(0,'rgba(34,139,34,0.15)');g.addColorStop(1,'rgba(34,139,34,0.02)');
  ctx.fillStyle=g;ctx.fill();
  // Savings line
  ctx.strokeStyle='#228b22';ctx.lineWidth=2;ctx.beginPath();
  for(var i=0;i<=mo;i++){var x=L+(i/mo)*cW,y=T+cH-(data[i]/top2)*cH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.stroke();
  // End value label
  var endY=T+cH-(data[mo]/top2)*cH;
  ctx.fillStyle='#228b22';ctx.font='11px sans-serif';ctx.textAlign='right';
  ctx.fillText(fm(data[mo]),W-R-4,endY-8);
  // Profit zone + breakeven
  if(brk>=0&&brk<=mo){
    var bx=L+(brk/mo)*cW;
    ctx.beginPath();ctx.moveTo(bx,iy);
    for(var i=brk;i<=mo;i++){ctx.lineTo(L+(i/mo)*cW,T+cH-(data[i]/top2)*cH);}
    ctx.lineTo(L+cW,iy);ctx.closePath();
    var pg=ctx.createLinearGradient(0,T,0,iy);
    pg.addColorStop(0,'rgba(34,139,34,0.2)');pg.addColorStop(1,'rgba(34,139,34,0.03)');
    ctx.fillStyle=pg;ctx.fill();
    ctx.strokeStyle='#b80';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(bx,T);ctx.lineTo(bx,T+cH);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(bx,iy,6,0,Math.PI*2);ctx.fillStyle='#b80';ctx.fill();
    ctx.beginPath();ctx.arc(bx,iy,2.5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
    ctx.fillStyle='#b80';ctx.font='11px sans-serif';ctx.textAlign='center';
    var by=Math.floor(brk/12),bm=brk%12;
    ctx.fillText((by>0?by+'y ':'')+ bm+'m',bx,T-6);
  }
}
function render(){
  var bill=Number(document.getElementById('bill').value)||5000;
  var roof=Number(document.getElementById('roof').value)||40;
  var pitch=Number(document.getElementById('pitch').value)||15;
  var r=calc(bill,roof,pitch);
  var bY=Math.floor(r.brk/12),bM=r.brk%12;
  document.getElementById('billV').textContent=fm(bill);
  document.getElementById('roofV').textContent=fmt(roof)+' m\u00B2';
  document.getElementById('pitchV').textContent=pitch+'\u00B0';
  document.getElementById('hero').innerHTML=
    '<div style="background:#fff;padding:20px;text-align:center"><div style="font-size:36px;font-weight:700">'+r.n+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:4px">Panels</div></div>'+
    '<div style="background:#fff;padding:20px;text-align:center"><div style="font-size:36px;font-weight:700">'+fmt(r.roi,1)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:4px">Years to ROI</div></div>'+
    '<div style="background:#fff;padding:20px;text-align:center"><div style="font-size:36px;font-weight:700">'+fmt(r.c2,1)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:4px">Tonnes CO2/yr</div></div>';
  document.getElementById('metrics').innerHTML=
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fm(r.ms)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">Monthly savings</div></div>'+
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fm(r.as)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">Annual savings</div></div>'+
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fm(r.inv)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">Total investment</div></div>'+
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fm(r.p25)+'</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">25-yr net profit</div></div>'+
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fmt(r.mk)+' kWh</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">Monthly consumption</div></div>'+
    '<div style="background:#fff;padding:14px 16px"><div style="font-size:20px;font-weight:600">'+fmt(r.cov,1)+'%</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:2px">Coverage</div></div>';
  document.getElementById('brkLabel').innerHTML='Breakeven at <strong>'+(bY>0?bY+'y ':'')+ bM+'m</strong> &mdash; 25yr profit: <strong>'+fm(r.p25)+'</strong>';
  var on='';
  if(curO==='S')on='Optimal';
  else if(curO==='N')on='Poor - faces away from sun';
  else if(curO==='E'||curO==='W')on='Fair - morning/afternoon only';
  else if(curO==='NE'||curO==='NW')on='Poor - minimal direct sun';
  var ds='';
  var rows=[['System size',fmt(r.akw,2)+' kWp'],['Annual generation',fmt(r.gen)+' kWh'],['Effective sun hrs',fmt(r.sh,1)+' hrs/day'],['Orientation factor',fmt(r.tf*100,0)+'% '+on],['Panel spec',D.wp+' Wp mono ('+fmt(D.pa,2)+' m\u00B2)'],['System efficiency',fmt(D.eff*100,0)+'%'],['CFE DAC tariff','$'+D.tar+' MXN/kWh'],['Install cost','$'+D.cost+' MXN/Wp'],['25yr CO2 offset',fmt(r.c2l,1)+' tonnes']];
  for(var i=0;i<rows.length;i++){
    ds+='<div style="padding:10px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between"><span style="font-size:11px;color:#888">'+rows[i][0]+'</span><span style="font-size:13px">'+rows[i][1]+'</span></div>';
  }
  document.getElementById('details').innerHTML=ds;
  drawChart(r.inv,r.ms);
}
var ow=document.getElementById('oWrap');
for(var i=0;i<OL.length;i++){
  var b=document.createElement('button');
  b.textContent=OL[i];
  b.setAttribute('data-o',OL[i]);
  var isSel=OL[i]==='S';
  b.style.cssText='padding:6px 12px;border:1px solid #ccc;background:'+(isSel?'#111':'#fff')+';color:'+(isSel?'#fff':'#111')+';font-size:12px;cursor:pointer;border-radius:3px';
  b.addEventListener('click',(function(lbl){return function(){
    curO=lbl;
    var bs=ow.querySelectorAll('button');
    for(var j=0;j<bs.length;j++){
      var sel=bs[j].getAttribute('data-o')===lbl;
      bs[j].style.background=sel?'#111':'#fff';
      bs[j].style.color=sel?'#fff':'#111';
    }
    render();
  };})(OL[i]));
  ow.appendChild(b);
}
document.getElementById('bill').addEventListener('input',render);
document.getElementById('roof').addEventListener('input',render);
document.getElementById('pitch').addEventListener('input',render);
window.addEventListener('resize',render);
render();
