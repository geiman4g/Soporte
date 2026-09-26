import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList, Legend,
} from "recharts";
import { Layers, Users, Hourglass, ShieldAlert, TrendingUp, Flag, Wrench, MousePointerClick, MessagesSquare } from "lucide-react";
import { TicketRecord } from "../types";
import { Selection } from "../utils/selection";
import {
  AGE_BUCKETS, ageBucketOf, INACTIVITY_BUCKETS, inactivityBucketOf, lastFromOf, isClosed, isUnanswered, ownerOf, priorityOf, statusColor,
  statusOf, statusRank, weekOf,
} from "../utils/ticketHelpers";

interface Props {
  filteredTickets: TicketRecord[];
  onSelect: (s: Selection) => void;
}

const tooltipStyle = { backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px", border: "none" };
const tooltipItem = { color: "#fff" };

function Card({ icon: Icon, title, subtitle, accent, children, className = "" }: {
  icon: any; title: string; subtitle: string; accent: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-xs ${className}`}>
      <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-100 gap-2">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded ${accent}`}><Icon className="w-4 h-4" /></div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-100 whitespace-nowrap">
          <MousePointerClick className="w-3 h-3" /> Clic para ver detalle
        </span>
      </div>
      {children}
    </div>
  );
}

/** Recharts entrega el registro en `payload` (v3) o directamente (v2). */
const P = (r: any) => (r && r.payload ? r.payload : r) || {};

const Empty = () => <div className="h-full flex items-center justify-center text-xs text-gray-400">Sin datos</div>;

const PRIORITY_COLORS: Record<string, string> = {
  "Crítica": "#991b1b", "Critica": "#991b1b", "Urgente": "#991b1b",
  "Alta": "#dc2626", "Media": "#f2994a", "Baja": "#005bbf", "Sin Prioridad": "#94a3b8",
};
const SLA_COLORS: Record<string, string> = {
  "Ninguna": "#10b981",
  "Respuesta vencida": "#f59e0b",
  "Resolución vencida": "#f2994a",
  "Respuesta y resolución vencidas": "#dc2626",
};
const AGE_COLORS = ["#10b981", "#84cc16", "#f59e0b", "#f2994a", "#dc2626", "#7f1d1d"];

const countBy = <K extends string>(list: TicketRecord[], key: (t: TicketRecord) => K | null) => {
  const m = new Map<K, number>();
  list.forEach(t => {
    const k = key(t);
    if (k !== null) m.set(k, (m.get(k) || 0) + 1);
  });
  return m;
};

export function TrackingCharts({ filteredTickets, onSelect }: Props) {
  const total = filteredTickets.length;
  const openTickets = useMemo(() => filteredTickets.filter(t => !isClosed(t)), [filteredTickets]);

  // 1. Estado (Ticket)
  const statusData = useMemo(() => {
    const m = countBy(filteredTickets, statusOf);
    const unans = countBy(filteredTickets.filter(t => !isClosed(t) && isUnanswered(t)), statusOf);
    return [...m.entries()]
      .map(([name, value]) => {
        const sinRespuesta = unans.get(name) || 0;
        const pct = total ? Math.round((value / total) * 100) : 0;
        return { name, value, sinRespuesta, pct, label: `${value} · ${pct}%${sinRespuesta ? ` · ${sinRespuesta} sin rpta` : ""}` };
      })
      .sort((a, b) => statusRank(a.name) - statusRank(b.name) || b.value - a.value);
  }, [filteredTickets, total]);

  // 2. Carga por propietario apilada por estado
  const { ownerData, ownerStatuses } = useMemo(() => {
    const statuses = statusData.map(s => s.name);
    const byOwner = new Map<string, Record<string, any>>();
    filteredTickets.forEach(t => {
      const o = ownerOf(t);
      if (!byOwner.has(o)) byOwner.set(o, { name: o, total: 0 });
      const row = byOwner.get(o)!;
      row[statusOf(t)] = (row[statusOf(t)] || 0) + 1;
      row.total += 1;
    });
    return { ownerData: [...byOwner.values()].sort((a, b) => b.total - a.total), ownerStatuses: statuses };
  }, [filteredTickets, statusData]);

  // 3. Antigüedad (casos abiertos)
  const ageData = useMemo(() => {
    const m = countBy(openTickets, ageBucketOf);
    return AGE_BUCKETS.map((b, i) => ({ name: b.key, value: m.get(b.key) || 0, color: AGE_COLORS[i] }));
  }, [openTickets]);

  // 4. SLA
  const slaData = useMemo(() => {
    const m = countBy(filteredTickets, t => t["Tipo de vulneración del SLA"] || "Ninguna");
    return [...m.entries()].map(([name, value]) => ({ name, value, color: SLA_COLORS[name] || "#8b5cf6" }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);
  const slaBreachPct = useMemo(() => {
    const ok = slaData.find(s => s.name === "Ninguna")?.value || 0;
    return total ? Math.round(((total - ok) / total) * 100) : 0;
  }, [slaData, total]);

  // 5. Prioridad
  const priorityData = useMemo(() => {
    const order = ["Crítica", "Critica", "Urgente", "Alta", "Media", "Baja", "Sin Prioridad"];
    const m = countBy(filteredTickets, priorityOf);
    return [...m.entries()].map(([name, value]) => ({ name, value, color: PRIORITY_COLORS[name] || "#8b5cf6" }))
      .sort((a, b) => {
        const ra = order.indexOf(a.name), rb = order.indexOf(b.name);
        return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
      });
  }, [filteredTickets]);

  // 6. Tendencia semanal (últimas 12 semanas)
  const weekData = useMemo(() => {
    const m = countBy(filteredTickets, weekOf);
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const out: { key: string; name: string; value: number; sinRespuesta: number }[] = [];
    const unans = countBy(filteredTickets.filter(t => !isClosed(t) && isUnanswered(t)), weekOf);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(monday);
      d.setDate(d.getDate() - i * 7);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        key,
        name: d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
        value: m.get(key) || 0,
        sinRespuesta: unans.get(key) || 0,
      });
    }
    return out;
  }, [filteredTickets]);

  // 7. Ingeniero asignado (abiertos)
  const engineerData = useMemo(() => {
    const m = countBy(openTickets, t => t["Ingeniero de soporte asignado"] || "No Asignado");
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [openTickets]);

  // 8. Seguimiento de comunicación (datos de la API de Zoho Desk)
  const LAST_FROM = ["Pendiente de ECS (escribió el cliente)", "Esperando al cliente (respondió ECS)", "Sin dato"];
  const LAST_FROM_COLORS = ["#dc2626", "#10b981", "#cbd5e1"];
  const commsData = useMemo(() => {
    return INACTIVITY_BUCKETS.map(b => {
      const row: Record<string, any> = { name: b.key };
      LAST_FROM.forEach(k => (row[k] = 0));
      openTickets.forEach(t => {
        if (inactivityBucketOf(t) === b.key) row[lastFromOf(t)] += 1;
      });
      return row;
    });
  }, [openTickets]);
  const hasComms = useMemo(() => openTickets.some(t => !!t["Última actividad"]), [openTickets]);
  const pendingEcs = useMemo(() => openTickets.filter(t => t["Último mensaje de"] === "Cliente").length, [openTickets]);
  const overdueCount = useMemo(() => openTickets.filter(t => t["Vencido"] === true).length, [openTickets]);

  if (total === 0) return null;

  const statusHeight = Math.max(220, statusData.length * 34 + 30);
  const ownerHeight = Math.max(220, ownerData.length * 30 + 60);

  return (
    <div className="space-y-6">
      {/* Fila 1: Estado + Propietario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card icon={Layers} title="Casos por Estado (Ticket)" subtitle={`${total} casos · clic en una barra o en el nombre del estado`} accent="bg-blue-50 text-[#005bbf]">
          <div style={{ height: statusHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 120, left: 8, bottom: 0 }} barCategoryGap={6}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f3f5" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10, cursor: "pointer" }} stroke="#888"
                  onClick={(e: any) => e?.value && onSelect({ title: `Estado: ${e.value}`, criteria: [{ dimension: "status", value: e.value }] })} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }}
                  formatter={(v: any) => [v, "Casos"]} />
                <Bar dataKey="value" name="value" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                  onClick={(r: any) => { const d = P(r); return onSelect({ title: `Estado: ${d.name}`, subtitle: `${d.value} casos (${d.pct}% del total)`, criteria: [{ dimension: "status", value: d.name }] }); }}>
                  {statusData.map(s => <Cell key={s.name} fill={statusColor(s.name)} />)}
                  <LabelList dataKey="label" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>

              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={Users} title="Carga por Propietario y Estado" subtitle="Clic en un segmento: propietario + estado · clic en el nombre: todos sus casos" accent="bg-indigo-50 text-indigo-600">
          <div style={{ height: ownerHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerData} layout="vertical" margin={{ top: 0, right: 30, left: 8, bottom: 0 }} barCategoryGap={5}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f3f5" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, cursor: "pointer" }} stroke="#888"
                  onClick={(e: any) => e?.value && onSelect({ title: `Propietario: ${e.value}`, criteria: [{ dimension: "owner", value: e.value }] })} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }} />
                <Legend wrapperStyle={{ fontSize: "9px" }} iconSize={8} />
                {ownerStatuses.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="owner" maxBarSize={28} fill={statusColor(s)} style={{ cursor: "pointer" }}
                    radius={i === ownerStatuses.length - 1 ? [0, 4, 4, 0] : 0}
                    onClick={(r: any) => { const d = P(r); return onSelect({
                      title: `${d.name} · ${s}`,
                      criteria: [{ dimension: "owner", value: d.name }, { dimension: "status", value: s }],
                    }); }} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Fila 2: Antigüedad, SLA, Prioridad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card icon={Hourglass} title="Antigüedad de Casos Abiertos" subtitle={`${openTickets.length} abiertos · días desde la creación`} accent="bg-amber-50 text-amber-600">
          <div className="h-56">
            {openTickets.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="#888" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }} formatter={(v: any) => [v, "Casos"]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}
                    onClick={(r: any) => { const d = P(r); return d.value && onSelect({ title: `Antigüedad: ${d.name}`, subtitle: "Casos abiertos", criteria: [{ dimension: "age", value: d.name }] }); }}>
                    {ageData.map(a => <Cell key={a.name} fill={a.color} />)}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card icon={ShieldAlert} title="Cumplimiento de SLA" subtitle={`${slaBreachPct}% de los casos con alguna vulneración`} accent="bg-rose-50 text-rose-600">
          <div className="h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie isAnimationActive={false} data={slaData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} style={{ cursor: "pointer" }}
                  onClick={(r: any) => { const d = P(r); return onSelect({ title: `SLA: ${d.name}`, criteria: [{ dimension: "sla", value: d.name }] }); }}>
                  {slaData.map(s => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-gray-900">{100 - slaBreachPct}%</span>
              <span className="text-[9px] text-gray-400 uppercase font-bold">en SLA</span>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {slaData.map(s => (
              <button key={s.name} onClick={() => onSelect({ title: `SLA: ${s.name}`, criteria: [{ dimension: "sla", value: s.name }] })}
                className="w-full flex items-center gap-1.5 text-[10px] text-gray-600 hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate text-left">{s.name}</span>
                <span className="font-bold ml-auto bg-gray-100 px-1 rounded">{s.value}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card icon={Flag} title="Casos por Prioridad" subtitle="Distribución de la prioridad asignada" accent="bg-orange-50 text-orange-600">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#888" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }} formatter={(v: any) => [v, "Casos"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}
                  onClick={(r: any) => { const d = P(r); return onSelect({ title: `Prioridad: ${d.name}`, criteria: [{ dimension: "priority", value: d.name }] }); }}>
                  {priorityData.map(p => <Cell key={p.name} fill={p.color} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Fila 3: Tendencia semanal + Ingenieros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" icon={TrendingUp} title="Casos Creados por Semana (últimas 12)" subtitle="Entrada semanal de casos que siguen en el informe · rojo = aún sin primera respuesta" accent="bg-emerald-50 text-emerald-600">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#888" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }}
                  labelFormatter={(l: any) => `Semana del ${l}`}
                  formatter={(v: any, n: any) => [v, n === "value" ? "Con respuesta" : "Sin 1ª respuesta"]} />
                <Bar dataKey={(d: any) => d.value - d.sinRespuesta} name="value" stackId="w" fill="#005bbf" style={{ cursor: "pointer" }}
                  onClick={(r: any) => { const d = P(r); return d.value && onSelect({ title: `Creados la semana del ${d.name}`, criteria: [{ dimension: "week", value: d.key }] }); }} />
                <Bar dataKey="sinRespuesta" name="sinRespuesta" stackId="w" fill="#dc2626" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}
                  onClick={(r: any) => { const d = P(r); return d.sinRespuesta && onSelect({ title: `Semana del ${d.name} · sin primera respuesta`, criteria: [{ dimension: "week", value: d.key }, { dimension: "unanswered" }] }); }}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={Wrench} title="Abiertos por Ingeniero Asignado" subtitle="Top 10 · campo «Ingeniero de soporte asignado»" accent="bg-violet-50 text-violet-600">
          <div className="h-56">
            {engineerData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engineerData} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }} barCategoryGap={4}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} stroke="#888" />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }} formatter={(v: any) => [v, "Abiertos"]} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                    onClick={(r: any) => { const d = P(r); return onSelect({ title: `Ingeniero: ${d.name}`, subtitle: "Casos abiertos", criteria: [{ dimension: "engineer", value: d.name }, { dimension: "open" }] }); }}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Fila 4: Seguimiento de comunicación (API de Zoho Desk) */}
      {hasComms && (
        <Card icon={MessagesSquare} title="Seguimiento de Comunicación (abiertos)"
          subtitle={`Días sin actividad y quién escribió de último · ${pendingEcs} casos con respuesta pendiente de ECS · ${overdueCount} vencidos`}
          accent="bg-rose-50 text-rose-600">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => onSelect({ title: "Pendientes de respuesta de ECS", subtitle: "El último mensaje lo escribió el cliente", criteria: [{ dimension: "lastFrom", value: LAST_FROM[0] }] })}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 cursor-pointer">
              Pendientes de ECS: {pendingEcs}
            </button>
            <button onClick={() => onSelect({ title: "Casos vencidos (fecha de vencimiento superada)", criteria: [{ dimension: "overdue" }] })}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 cursor-pointer">
              Vencidos: {overdueCount}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commsData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="#888" />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} cursor={{ fill: "#f1f5f9" }} labelFormatter={(l: any) => `Sin actividad: ${l}`} />
                <Legend wrapperStyle={{ fontSize: "10px" }} iconSize={8} />
                {LAST_FROM.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="c" fill={LAST_FROM_COLORS[i]} style={{ cursor: "pointer" }}
                    radius={i === LAST_FROM.length - 1 ? [4, 4, 0, 0] : 0}
                    onClick={(r: any) => { const d = P(r); return d[k] && onSelect({
                      title: `Sin actividad ${d.name} · ${k}`,
                      criteria: [{ dimension: "inactivity", value: d.name }, { dimension: "lastFrom", value: k }],
                    }); }} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
