import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, CheckCircle2, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Misma idea de datos que la variante anterior: en tu app esto sale de la
// API de componentes filtrada por categoría.
// ---------------------------------------------------------------------------
type Componente = {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
};

// Catálogo con varias decenas de ítems por categoría, a propósito, para
// probar que la lista escala (esto es lo que rompía la variante de tarjetas).
const CATALOGO: Componente[] = [
  { id: "r1", nombre: "Rueda 50mm negra", categoria: "rueda", stock: 75, stockMinimo: 38 },
  { id: "r2", nombre: "Rueda 50mm común", categoria: "rueda", stock: 1479, stockMinimo: 100 },
  { id: "r3", nombre: "Rueda 60mm reforzada", categoria: "rueda", stock: 12, stockMinimo: 20 },
  { id: "r4", nombre: "Rueda 50mm cromada", categoria: "rueda", stock: 210, stockMinimo: 50 },
  { id: "r5", nombre: "Rueda 40mm silenciosa", categoria: "rueda", stock: 88, stockMinimo: 40 },
  { id: "r6", nombre: "Rueda 50mm freno", categoria: "rueda", stock: 33, stockMinimo: 30 },
  { id: "e1", nombre: "Estrella Aria", categoria: "estrella", stock: 100, stockMinimo: 50 },
  { id: "e2", nombre: "Estrella Nylon reforzada", categoria: "estrella", stock: 40, stockMinimo: 25 },
  { id: "e3", nombre: "Estrella cromada", categoria: "estrella", stock: 15, stockMinimo: 20 },
  { id: "c1", nombre: "Cilindro Gala", categoria: "cilindro", stock: 30, stockMinimo: 15 },
  { id: "c2", nombre: "Cilindro Clase 3", categoria: "cilindro", stock: 18, stockMinimo: 10 },
  { id: "c3", nombre: "Cilindro Clase 4 reforzado", categoria: "cilindro", stock: 5, stockMinimo: 10 },
  { id: "ch1", nombre: "Chapón Vita", categoria: "chapon", stock: 45, stockMinimo: 20 },
  { id: "ch2", nombre: "Chapón reforzado", categoria: "chapon", stock: 9, stockMinimo: 15 },
  { id: "f1", nombre: "Fuelle Kutz Alto", categoria: "fuelle", stock: 8, stockMinimo: 20 },
  { id: "f2", nombre: "Fuelle Kutz Bajo", categoria: "fuelle", stock: 60, stockMinimo: 20 },
  { id: "m1", nombre: "Mecanismo reclinable", categoria: "mecanismo", stock: 60, stockMinimo: 25 },
  { id: "m2", nombre: "Mecanismo contacto permanente", categoria: "mecanismo", stock: 14, stockMinimo: 20 },
  { id: "es1", nombre: "Espuma alta densidad", categoria: "espuma", stock: 40, stockMinimo: 20 },
  { id: "es2", nombre: "Espuma inyectada", categoria: "espuma", stock: 25, stockMinimo: 20 },
  { id: "t1", nombre: "Tapizado símil cuero negro", categoria: "tapizado", stock: 90, stockMinimo: 30 },
  { id: "t2", nombre: "Tapizado tela gris", categoria: "tapizado", stock: 55, stockMinimo: 30 },
  { id: "t3", nombre: "Tapizado malla transpirable", categoria: "tapizado", stock: 6, stockMinimo: 25 },
  { id: "as1", nombre: "Asiento moldeado", categoria: "asiento", stock: 22, stockMinimo: 15 },
  { id: "re1", nombre: "Respaldo malla", categoria: "respaldo", stock: 18, stockMinimo: 15 },
  { id: "re2", nombre: "Respaldo tapizado", categoria: "respaldo", stock: 4, stockMinimo: 15 },
  { id: "to1", nombre: "Kit tornillería std", categoria: "tornilleria", stock: 500, stockMinimo: 100 },
  { id: "to2", nombre: "Kit tornillería reforzado", categoria: "tornilleria", stock: 80, stockMinimo: 100 },
];

// Pasos del wizard: cada uno agrupa las categorías que se arman juntas.
const PASOS: { titulo: string; ayuda: string; categorias: { key: string; label: string }[] }[] = [
  {
    titulo: "Base y rodamiento",
    ayuda: "Elegí las piezas que sostienen y mueven la silla",
    categorias: [
      { key: "rueda", label: "Rueda" },
      { key: "estrella", label: "Estrella" },
      { key: "cilindro", label: "Cilindro" },
      { key: "chapon", label: "Chapón" },
    ],
  },
  {
    titulo: "Mecanismo",
    ayuda: "Cómo reclina y se ajusta la silla",
    categorias: [
      { key: "fuelle", label: "Fuelle" },
      { key: "mecanismo", label: "Mecanismo" },
    ],
  },
  {
    titulo: "Confort",
    ayuda: "Relleno, tapizado y zona de apoyo",
    categorias: [
      { key: "espuma", label: "Espuma" },
      { key: "tapizado", label: "Tapizado" },
      { key: "asiento", label: "Asiento" },
      { key: "respaldo", label: "Respaldo" },
    ],
  },
  {
    titulo: "Herrajes",
    ayuda: "Fijación y terminación",
    categorias: [{ key: "tornilleria", label: "Tornillería" }],
  },
];

type Seleccion = Record<string, string>; // categoria -> componenteId

function estadoStock(c: Componente) {
  if (c.stock < c.stockMinimo) return "critico" as const;
  if (c.stock < c.stockMinimo * 2) return "ajustado" as const;
  return "ok" as const;
}

const ESTILO = {
  ok: { ring: "ring-emerald-400", badge: "bg-emerald-50 text-emerald-700", label: "Stock ok" },
  ajustado: { ring: "ring-amber-400", badge: "bg-amber-50 text-amber-700", label: "Stock ajustado" },
  critico: { ring: "ring-red-400", badge: "bg-red-50 text-red-700", label: "Bajo mínimo" },
};

export default function SillaBuilderWizard() {
  const [paso, setPaso] = useState(0);
  const [seleccion, setSeleccion] = useState<Seleccion>({});
  const [nombreSilla, setNombreSilla] = useState("");
  const [busqueda, setBusqueda] = useState<Record<string, string>>({});

  const esUltimoPaso = paso === PASOS.length;
  const grupoActual = PASOS[paso];

  const categoriasDelPaso = grupoActual?.categorias.map((c) => c.key) ?? [];
  const pasoCompleto = categoriasDelPaso.every((k) => seleccion[k]);

  const seleccionados = Object.entries(seleccion)
    .map(([categoria, id]) => ({ categoria, comp: CATALOGO.find((c) => c.id === id)! }))
    .filter((s) => s.comp);

  const maxSillas = useMemo(() => {
    if (seleccionados.length === 0) return null;
    // cantidad=1 por componente en este ejemplo; si tu modelo usa
    // cantidad por silla, multiplicá acá igual que en la variante anterior.
    return Math.min(...seleccionados.map((s) => s.comp.stock));
  }, [seleccionados]);

  function elegir(categoria: string, id: string) {
    setSeleccion((prev) => ({ ...prev, [categoria]: id }));
  }

  return (
    <div className="mx-auto max-w-2xl bg-slate-100 p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {/* Header + progreso */}
        <div className="mb-5">
          <h1 className="text-base font-semibold text-slate-800">Nuevo tipo de silla</h1>
          <div className="mt-3 flex items-center gap-1.5">
            {PASOS.map((p, i) => (
              <div key={p.titulo} className="flex flex-1 items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                    i < paso
                      ? "bg-emerald-600 text-white"
                      : i === paso
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < paso ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < PASOS.length - 1 && <div className="h-0.5 flex-1 bg-slate-100" />}
              </div>
            ))}
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                esUltimoPaso ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {!esUltimoPaso ? (
          <>
            {paso === 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500">Nombre de la silla</label>
                <input
                  value={nombreSilla}
                  onChange={(e) => setNombreSilla(e.target.value)}
                  placeholder="Ej: Silla Gerencial Aria"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
                />
              </div>
            )}

            <h2 className="text-sm font-semibold text-slate-700">{grupoActual.titulo}</h2>
            <p className="mb-4 text-xs text-slate-400">{grupoActual.ayuda}</p>

            <div className="space-y-5">
              {grupoActual.categorias.map((cat) => {
                const elegido = seleccion[cat.key] ? CATALOGO.find((c) => c.id === seleccion[cat.key]) : undefined;
                const term = busqueda[cat.key] ?? "";
                const opciones = CATALOGO.filter(
                  (c) => c.categoria === cat.key && c.nombre.toLowerCase().includes(term.toLowerCase())
                );

                return (
                  <div key={cat.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{cat.label}</span>
                      <span className="text-[11px] text-slate-400">
                        {CATALOGO.filter((c) => c.categoria === cat.key).length} disponibles
                      </span>
                    </div>

                    {elegido ? (
                      <div className={`flex items-center gap-2 rounded-md border px-3 py-2 ring-2 ${ESTILO[estadoStock(elegido)].ring} border-slate-800`}>
                        <Check className="h-3.5 w-3.5 shrink-0 text-slate-700" />
                        <span className="flex-1 truncate text-sm text-slate-700">{elegido.nombre}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${ESTILO[estadoStock(elegido)].badge}`}>
                          {elegido.stock}u
                        </span>
                        <button
                          onClick={() => elegir(cat.key, "")}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-slate-200">
                        <div className="relative border-b border-slate-100">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            value={term}
                            onChange={(e) => setBusqueda((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                            placeholder={`Filtrar ${cat.label.toLowerCase()}...`}
                            className="w-full rounded-t-md py-2 pl-8 pr-3 text-sm outline-none"
                          />
                        </div>
                        <div className="max-h-40 overflow-auto">
                          {opciones.length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-400">Sin resultados</div>
                          )}
                          {opciones.map((c) => {
                            const est = ESTILO[estadoStock(c)];
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  elegir(cat.key, c.id);
                                  setBusqueda((prev) => ({ ...prev, [cat.key]: "" }));
                                }}
                                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                              >
                                <span className="truncate text-slate-700">{c.nombre}</span>
                                <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${est.badge}`}>
                                  {c.stock}u
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-slate-700">Revisión final</h2>
            <p className="mb-4 text-xs text-slate-400">Confirmá los componentes antes de guardar</p>

            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {seleccionados.map((s) => {
                const est = ESTILO[estadoStock(s.comp)];
                return (
                  <li key={s.categoria} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-600">{s.comp.nombre}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${est.badge}`}>{s.comp.stock}u</span>
                  </li>
                );
              })}
            </ul>

            <div
              className={`mt-4 flex items-center gap-2 rounded-md p-3 text-sm ${
                maxSillas !== null && maxSillas > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {maxSillas !== null && maxSillas > 0 ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>
                Con el stock actual se pueden armar <strong>{maxSillas}</strong> silla(s) de "{nombreSilla || "sin nombre"}".
              </span>
            </div>
          </>
        )}

        {/* Navegación */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 disabled:opacity-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Atrás
          </button>

          {!esUltimoPaso ? (
            <button
              onClick={() => setPaso((p) => p + 1)}
              disabled={!pasoCompleto}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-30"
            >
              Siguiente <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Guardar tipo de silla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
