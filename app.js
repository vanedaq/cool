/* ===== utilidades ===== */
const fmt = (v) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(v||0);

function parsePctComma(str){
  const s = String(str||"").trim().replace(".",",");
  if(!/^\d+(,\d{1,3})?$/.test(s)) return NaN;
  const [ent,dec=""]=s.split(",");
  const n = Number(ent) + (dec? Number(dec)/Math.pow(10,dec.length):0);
  return n/100;
}

function formatPctComma(frac,decimals=2){
  const p=(Number(frac||0)*100).toFixed(decimals);
  return p.replace(".",",");
}

/* ===== App ===== */
class Finanzas {
  constructor(){
    this.key="organizadorFinanciero";
    this.selKey="organizadorFinanciero_mesesel";
    this.iniYM="2025-08";
    this.mes = localStorage.getItem(this.selKey) || this.iniYM;
    this.data = this.load();

    this.cacheEls();
    this.bindUI();
    this.buildMonths();
    this.renderAll();
  }

  cacheEls(){
    this.tabs=[...document.querySelectorAll(".tab")];
    this.panels=[...document.querySelectorAll(".panel")];
    this.toastEl=document.getElementById("toast");
    this.sel=document.getElementById("mesSelector");
    this.btns={
      addIngreso: document.getElementById("addIngreso"),
      addFijo: document.getElementById("addFijo"),
      addTarjeta: document.getElementById("addTarjeta"),
      addCredito: document.getElementById("addCredito"),
      addCompra: document.getElementById("addCompra"),
      addAhorro2: document.getElementById("addAhorro2"),
      export: document.getElementById("exportBtn"),
      reset: document.getElementById("resetBtn"),
      modal: document.getElementById("modal"),
      modalForm: document.getElementById("modalForm"),
      modalTitle: document.getElementById("modalTitle"),
      closeModal: document.getElementById("closeModal"),
    };
  }

  bindUI(){
    this.tabs.forEach(t=>t.addEventListener("click",()=>this.showTab(t.dataset.tab)));
    if(this.sel) this.sel.addEventListener("change",(e)=>{ this.mes=e.target.value; localStorage.setItem(this.selKey,this.mes); this.ensureMonth(this.mes); this.renderAll(); this.toast("Mes cambiado"); });
    
    Object.entries(this.btns).forEach(([k,el])=>{
      if(!el) return;
      if(k==="addIngreso") el.onclick=()=>this.openForm("ingreso");
      if(k==="addFijo") el.onclick=()=>this.openForm("fijo");
      if(k==="addTarjeta") el.onclick=()=>this.openForm("tarjeta");
      if(k==="addCredito") el.onclick=()=>this.openForm("credito");
      if(k==="addCompra") el.onclick=()=>this.openForm("compra");
      if(k==="addAhorro2") el.onclick=()=>this.openForm("ahorro");
      if(k==="export") el.onclick=()=>this.export();
      if(k==="reset") el.onclick=()=>this.reset();
      if(k==="closeModal") el.onclick=()=>this.closeModal();
    });

    document.body.addEventListener("click",(ev)=>{
      const a = ev.target.closest("a[data-action], button[data-action]");
      if(!a) return;
      ev.preventDefault();
      const act=a.dataset.action, key=a.dataset.key, id=parseInt(a.dataset.id);
      if(act==="edit") this.edit(key,id);
      if(act==="del") this.del(key,id);
      if(act==="paid") this.togglePaid(key,id);
      if(act==="addsave") this.addAhorroMonto(id);
    });

    this.btns.modal.addEventListener("click",(e)=>{ if(e.target.id==="modal") this.closeModal(); });
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") this.closeModal(); });

    document.body.addEventListener("change",(e)=>{
      const el=e.target;
      if(!el) return;
      if(el.dataset.normalize==="coma"){
        el.value = el.value.replace(/\./g,",");
      }
    });
  }

  showTab(name){
    this.tabs.forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
    this.panels.forEach(p=>p.classList.toggle("hidden",p.id!==name));
  }

  uid(){ return Date.now()+Math.floor(Math.random()*1e6); }

  load(){
    try{ 
      const raw=localStorage.getItem(this.key); 
      if(raw) return JSON.parse(raw); 
    } catch(e) {}
    
    const seed={}; 
    seed[this.iniYM]={
      ingresos:[{id:this.uid(),nombre:"Salario",monto:3500000,categoria:"Trabajo",fecha:`${this.iniYM}-01`}],
      gastosFijos:[{id:this.uid(),nombre:"Arriendo",monto:1200000,categoria:"Vivienda",fecha:`${this.iniYM}-01`,paid:false}],
      tarjetas:[],
      creditos:[],
      gastosCompras:[{id:this.uid(),nombre:"Supermercado",monto:400000,categoria:"Alimentación",fecha:`${this.iniYM}-10`,paid:false}],
      ahorros:[{id:this.uid(),nombre:"Emergencias",meta:5000000,actual:1200000,fecha:`${this.iniYM}-01`}]
    };
    return seed;
  }
  
  save(){ 
    try{ 
      localStorage.setItem(this.key,JSON.stringify(this.data)); 
    } catch(e) {} 
  }

  ensureMonth(key){
    if(this.data[key]) return;
    
    const [y, m] = key.split("-").map(Number);
    let prevMonth = m - 1;
    let prevYear = y;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = y - 1;
    }
    
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    
    if (this.data[prevKey]) {
      const copy = JSON.parse(JSON.stringify(this.data[prevKey]));
      
      Object.keys(copy).forEach(k => {
        if (Array.isArray(copy[k])) {
          copy[k] = copy[k].map(item => {
            const newItem = Object.assign({}, item);
            newItem.id = this.uid();
            
            if (k === "gastosFijos" || k === "tarjetas" || k === "creditos" || k === "gastosCompras") {
              newItem.paid = false;
              
              if ((k === "tarjetas" || k === "creditos") && newItem.cuotasPagadas < newItem.numeroCuotas) {
                newItem.cuotasPagadas = (newItem.cuotasPagadas || 0) + 1;
              }
            }
            
            if (newItem.fecha) {
              newItem.fecha = `${key}-01`;
            }
            
            return newItem;
          });
        }
      });
      
      this.data[key] = copy;
    } else {
      this.data[key] = {
        ingresos: [],
        gastosFijos: [],
        tarjetas: [],
        creditos: [],
        gastosCompras: [],
        ahorros: []
      };
    }
    this.save();
  }

  buildMonths(){
    const sel=this.sel; 
    if(!sel) return;
    
    sel.innerHTML="";
    const [y,m]=this.iniYM.split("-").map(Number);
    const d=new Date(y,m-1,1);
    
    for(let i=0;i<48;i++){
      const val=d.toISOString().slice(0,7);
      const txt=d.toLocaleDateString("es-CO",{month:"long",year:"numeric"});
      const opt=document.createElement("option");
      opt.value=val; 
      opt.textContent=txt; 
      if(val===this.mes) opt.selected=true;
      sel.appendChild(opt); 
      d.setMonth(d.getMonth()+1);
    }
    this.ensureMonth(this.mes);
  }

  rateFromInput(pctStr){ 
    const r=parsePctComma(pctStr); 
    return isNaN(r)?0:r; 
  }

  cuota(M,i,n,avalPct=0,ivaAvalPct=0){
    if(!n||n<=0) return 0;
    let base;
    if(!i) base = M / n;
    else {
      const f = Math.pow(1+i,n);
      base = (M * i * f) / (f - 1);
    }
    const avalMensual = (M * (avalPct||0)) / n;
    const ivaAvalMensual = avalMensual * (ivaAvalPct||0);
    return Math.round(base + avalMensual + ivaAvalMensual);
  }

  recalcDeudas(d){
    (d.tarjetas||[]).forEach(it=>{
      const nueva=this.cuota(Number(it.montoTotal||0),Number(it.tasaMensual||0),parseInt(it.numeroCuotas||0));
      if(!it.cuotaMensual || Math.abs((it.cuotaMensual||0)-nueva)>1) it.cuotaMensual=nueva;
    });
    (d.creditos||[]).forEach(it=>{
      const nueva=this.cuota(
        Number(it.montoTotal||0),
        Number(it.tasaMensual||0),
        parseInt(it.numeroCuotas||0),
        Number(it.avalPct||0),
        Number(it.ivaAvalPct||0)
      );
      if(!it.cuotaMensual || Math.abs((it.cuotaMensual||0)-nueva)>1) it.cuotaMensual=nueva;
    });
  }

  get mesData(){ 
    this.ensureMonth(this.mes); 
    return this.data[this.mes]; 
  }

  renderAll(){
    const d = this.mesData;
    this.recalcDeudas(d);
    this.save();

    this.renderList("listaIngresos", d.ingresos, i=>this.rowGeneric("💵",i,"ingresos",i.monto));
    this.renderList("listaFijos", d.gastosFijos, i=>this.rowGeneric("🏠",i,"gastosFijos",i.monto));
    this.renderList("listaTarjetas", d.tarjetas, i=>this.rowTarjeta(i,"tarjetas"));
    this.renderList("listaCreditos", d.creditos, i=>this.rowCredito(i,"creditos"));
    this.renderList("listaCompras", d.gastosCompras, i=>this.rowGeneric("🛒",i,"gastosCompras",i.monto));
    this.renderList("listaAhorros", d.ahorros, i=>this.rowAhorro(i,"ahorros"));

    const totalIng = d.ingresos.reduce((s,x)=>s+(x.monto||0),0);
    const totalFix = d.gastosFijos.reduce((s,x)=>s+(x.monto||0),0);
    const totalTar = d.tarjetas.reduce((s,x)=>s+(x.cuotaMensual||0),0);
    const totalCre = d.creditos.reduce((s,x)=>s+(x.cuotaMensual||0),0);
    const totalCom = d.gastosCompras.reduce((s,x)=>s+(x.monto||0),0);
    const totalAho = d.ahorros.reduce((s,x)=>s+(x.actual||0),0);
    const totalG = totalFix + totalTar + totalCre + totalCom;
    const libre = totalIng - totalG;

    const set=(id,val)=>{ 
      const el=document.getElementById(id); 
      if(el) el.textContent=val; 
    };
    
    set("sumIngresos",fmt(totalIng)); 
    set("sumFijos",fmt(totalFix));
    set("sumTarjetas",fmt(totalTar)); 
    set("sumCreditos",fmt(totalCre));
    set("sumCompras",fmt(totalCom)); 
    set("sumAhorros",fmt(totalAho));
    set("sumGastos",fmt(totalG)); 
    set("sumLibre",fmt(libre));

    this.renderDashboard(totalIng,totalG,libre);
    this.renderMetas(d.ahorros);
    this.renderHistorial();
    this.renderConsejos(totalIng,totalG);
  }

  renderList(id,arr,row){
    const el=document.getElementById(id); 
    if(!el) return;
    el.innerHTML = arr && arr.length ? arr.map(row).join("") : '<p class="meta">Sin registros.</p>';
  }

  rowGeneric(icon,i,key,monto){
    const paidClass = i.paid ? "is-paid" : "";
    return `<div class="item ${paidClass}">
      <div class="row">
        <div>${icon} <b>${i.nombre}</b><div class="meta">${i.categoria||""} · ${i.fecha||""}</div></div>
        <div><b>${fmt(monto)}</b></div>
      </div>
      <div class="actions">
        <a data-action="edit" data-key="${key}" data-id="${i.id}" href="#">✏️ Editar</a>
        <a data-action="del" data-key="${key}" data-id="${i.id}" href="#">🗑️ Eliminar</a>
        <button data-action="paid" data-key="${key}" data-id="${i.id}" class="pill paid">${i.paid? "✅ Pagado":"Marcar Pago"}</button>
      </div>
    </div>`;
  }

  rowTarjeta(i,key){
    const paidClass = i.paid ? "is-paid" : "";
    return `<div class="item ${paidClass}">
      <div class="row">
        <div>💳 <b>${i.nombre}</b>
          <div class="meta">Cuota ${fmt(i.cuotaMensual)} · ${i.cuotasPagadas||0}/${i.numeroCuotas} · tasa ${formatPctComma(i.tasaMensual)}%</div>
        </div>
        <div><b>Total ${fmt(i.montoTotal)}</b></div>
      </div>
      <div class="actions">
        <a data-action="edit" data-key="${key}" data-id="${i.id}" href="#">✏️ Editar</a>
        <a data-action="del" data-key="${key}" data-id="${i.id}" href="#">🗑️ Eliminar</a>
        <button data-action="paid" data-key="${key}" data-id="${i.id}" class="pill paid">${i.paid? "✅ Pagado":"Marcar Pago"}</button>
      </div>
    </div>`;
  }

  rowCredito(i,key){
    const paidClass = i.paid ? "is-paid" : "";
    return `<div class="item ${paidClass}">
      <div class="row">
        <div>🏦 <b>${i.nombre}</b>
          <div class="meta">Cuota ${fmt(i.cuotaMensual)} · ${i.cuotasPagadas||0}/${i.numeroCuotas}
            · tasa ${formatPctComma(i.tasaMensual)}%
            ${i.avalPct?` · aval ${formatPctComma(i.avalPct)}%`:``}
            ${i.ivaAvalPct?` + IVA ${formatPctComma(i.ivaAvalPct)}%`:``}
          </div>
        </div>
        <div><b>Total ${fmt(i.montoTotal)}</b></div>
      </div>
      <div class="actions">
        <a data-action="edit" data-key="${key}" data-id="${i.id}" href="#">✏️ Editar</a>
        <a data-action="del" data-key="${key}" data-id="${i.id}" href="#">🗑️ Eliminar</a>
        <button data-action="paid" data-key="${key
