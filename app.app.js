ensureMonth(key) {
  if (this.data[key]) return;
  
  // Buscar el mes anterior más cercano que tenga datos
  const [y, m] = key.split("-").map(Number);
  let prevMonth = m - 1;
  let prevYear = y;
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = y - 1;
  }
  
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  
  if (this.data[prevKey]) {
    // Copiar datos del mes anterior pero mantener solo la estructura básica
    const copy = JSON.parse(JSON.stringify(this.data[prevKey]));
    
    Object.keys(copy).forEach(k => {
      if (Array.isArray(copy[k])) {
        copy[k] = copy[k].map(item => {
          const newItem = Object.assign({}, item);
          newItem.id = this.uid();
          
          // Para gastos, reiniciar el estado de pagado
          if (k === "gastosFijos" || k === "tarjetas" || k === "creditos" || k === "gastosCompras") {
            newItem.paid = false;
            
            // Para deudas, incrementar cuotas pagadas si corresponde
            if ((k === "tarjetas" || k === "creditos") && newItem.cuotasPagadas < newItem.numeroCuotas) {
              newItem.cuotasPagadas = (newItem.cuotasPagadas || 0) + 1;
            }
          }
          
          // Actualizar fecha al nuevo mes
          if (newItem.fecha) {
            newItem.fecha = `${key}-01`;
          }
          
          return newItem;
        });
      }
    });
    
    this.data[key] = copy;
  } else {
    // Si no hay mes anterior, crear estructura vacía
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