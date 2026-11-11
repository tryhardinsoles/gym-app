// Helpers compartidos del módulo Asistencia y cobros
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const money = (n) => fmt.format(Math.round(n || 0));

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey(new Date());
export const mesKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dow);
  return x;
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d || 1); };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const mesLabel = (mes) => { const [y, m] = mes.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
export const shiftMes = (mes, n) => { const d = parseKey(`${mes}-01`); d.setMonth(d.getMonth() + n); return mesKeyOf(d); };
export const ddmm = (k) => k.split('-').slice(1).reverse().join('/');
