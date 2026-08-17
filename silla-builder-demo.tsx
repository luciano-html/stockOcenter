import { useMemo, useState } from "react";
import { ChevronDown, Search, Trash2, AlertTriangle, CheckCircle2, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock de datos: en tu app esto vendría de tu API (colección "componentes"
// filtrada por categoría). La forma es la misma que ya usás: nombre, stock,
// stockMinimo, y acá sumo qtyPorSilla que hoy tenés como input "Cantidad".
// ---------------------------------------------------------------------------
type Componente = {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
};

const CATALOGO: Componente[] = [
  { id: "r1", nombre: "Rueda 50mm", categoria: "rueda", stock: 75, stockMinimo: 38 },
  { id: "r2", nombre: "Rueda 50mm común", categoria: "rueda", stock: 1479, stockMinimo: 100 },
  { id: "e1", nombre: "Estrella Aria", categoria: "estrella", stock: 100, stockMinimo: 50 },
  { id: "c1", nombre: "Cilindro Gala", categoria: "cilindro", stock: 30, stockMinimo: 15 },
  { id: "ch1", nombre: "Chapón Vita", categoria: "chapon", stock: 45, stockMinimo: 20 },
  { id: "f1", nombre: "Fuelle Kutz Alto", categoria: "fuelle", stock: 8, stockMinimo: 20 },
  { id: "m1", nombre: "Mecanismo reclinable", categoria: "mecanismo", stock: 60, stockMinimo: 25 },
];

// Grupos: la clave del rediseño. En vez de 17 bloques sueltos en fila,
// se agrupan por etapa de armado (así también se ve el bug de "Respaldo"
// duplicado que tenés en la captura).
const GRUPOS: { titulo: string; categorias: { key: string; label: string }[] }[] = [
  {
    titulo: "Base y rodamiento",
    categorias: [
      { key: "rueda", label: "Rueda" },
      { key: "estrella", label: "Estrella" },
      { key: "cilindro", label: "Cilindro" },
      { key: "chapon", label: "Chapón" },
    ],
  },
  {
    titulo: "Mecanismo y estructura",
    categorias: [
      { key: "fuelle", label: "Fuelle" },
      { key: "mecanismo", label: "Mecanismo" },
      { key: "estructura", label: "Estructura" },
      { key: "contacto", label: "Contacto" },
    ],
  },
  {
    titulo: "Confort",
    categorias: [
      { key: "espuma", label: "Espuma" },
      { key: "tapizado", label: "Tapizado" },
      { key: "apoyabrazo", label: "Apoyabrazos" },
      { key: "apoyacabeza", label: "Apoyacabezas" },
      { key: "asiento", label: "Asiento" },
      { key: "respaldo", label: "Respaldo" },
      { key: "interior", label: "Interior" },
    ],
  },
  {
    titulo: "Herrajes",
    categorias: [{ key: "tornilleria", label: "Tornillería" }],
  },
];

type Seleccion = Record<string, { componenteId: string; cantidad: number }>;

function estadoStock(c: Componente) {
  if (c.stock < c.stockMinimo) return "critico" as const;
  if (c.stock < c.stockMinimo * 2) return "ajustado" as const;
  return "ok" as const;
}

const ESTILO_ESTADO = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Stock saludable" },
  ajustado: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", label: "Stock ajustado" },
  critico: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Bajo mínimo" },
};

function CategoriaSelector({
  label,
  categoria,
  seleccion,
  onSeleccionar,
  onCantidad,
  onQuitar,
}: {
  label: string;
  categoria: string;
  seleccion?: { componenteId: string; cantidad: number };
  onSeleccionar: (categoria: string, componenteId: string) => void;
  onCantidad: (categoria: string, cantidad: number) => void;
  onQuitar: (categoria: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const opciones = CATALOGO.filter(
    (c) => c.categoria === categoria && c.nombre.toLowerCase().includes(query.toLowerCase())
  );
  const elegido = seleccion ? CATALOGO.find((c) => c.id === seleccion.componenteId) : undefined;

  return (
    <div className="relative">
      <label className="text-xs font-medium text-slate-500">{label}</label>

      {!elegido ? (
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-sm outline-none focus:border-slate-400"
          />
          <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />

          {open && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {opciones.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">Sin componentes cargados en esta categoría</div>
              )}
              {opciones.map((c) => {
                const est = ESTILO_ESTADO[estadoStock(c)];
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSeleccionar(categoria, c.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{c.nombre}</span>
                    <span className={`h-2 w-2 rounded-full ${est.dot}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${ESTILO_ESTADO[estadoStock(elegido)].dot}`} />
          <span className="flex-1 truncate text-sm text-slate-700">{elegido.nombre}</span>
          <input
            type="number"
            min={1}
            value={seleccion!.cantidad}
            onChange={(e) => onCantidad(categoria, Math.max(1, Number(e.target.value) || 1))}
            className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-right text-sm"
          />
          <button onClick={() => onQuitar(categoria)} className="text-slate-400 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SillaBuilder() {
  const [nombre, setNombre] = useState("");
  const [seleccion, setSeleccion] = useState<Seleccion>({});

  const seleccionados = Object.entries(seleccion)
    .map(([categoria, s]) => ({ categoria, ...s, comp: CATALOGO.find((c) => c.id === s.componenteId)! }))
    .filter((s) => s.comp);

  // Algoritmo de ingrediente limitante: la misma lógica que ya tenés en el
  // backend, acá aplicada en vivo para mostrarle al usuario cuántas sillas
  // puede armar con el stock actual mientras arma la lista.
  const maxSillas = useMemo(() => {
    if (seleccionados.length === 0) return null;
    return Math.min(...seleccionados.map((s) => Math.floor(s.comp.stock / s.cantidad)));
  }, [seleccionados]);

  function seleccionar(categoria: string, componenteId: string) {
    setSeleccion((prev) => ({ ...prev, [categoria]: { componenteId, cantidad: prev[categoria]?.cantidad ?? 1 } }));
  }
  function cambiarCantidad(categoria: string, cantidad: number) {
    setSeleccion((prev) => ({ ...prev, [categoria]: { ...prev[categoria], cantidad } }));
  }
  function quitar(categoria: string) {
    setSeleccion((prev) => {
      const next = { ...prev };
      delete next[categoria];
      return next;
    });
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 bg-slate-100 p-6 lg:grid-cols-[1fr_320px]">
      {/* Columna principal: formulario agrupado */}
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="text-base font-semibold text-slate-800">Nuevo tipo de silla</h1>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
                placeholder="Ej: Silla Gerencial Aria"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Tipo</label>
              <select className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400">
                <option>Gerencial</option>
                <option>Operativa</option>
                <option>Visita</option>
              </select>
            </div>
          </div>
        </div>

        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">{grupo.titulo}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grupo.categorias.map((cat) => (
                <CategoriaSelector
                  key={cat.key}
                  label={cat.label}
                  categoria={cat.key}
                  seleccion={seleccion[cat.key]}
                  onSeleccionar={seleccionar}
                  onCantidad={cambiarCantidad}
                  onQuitar={quitar}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Panel lateral: resumen en vivo, siempre visible */}
      <div className="h-fit space-y-3 lg:sticky lg:top-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Resumen de la lista</h3>

          {seleccionados.length === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5" /> Elegí componentes para ver el resumen
            </p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-slate-100">
                {seleccionados.map((s) => {
                  const est = ESTILO_ESTADO[estadoStock(s.comp)];
                  return (
                    <li key={s.categoria} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="truncate text-slate-600">{s.comp.nombre}</span>
                      <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 ${est.bg} ${est.text}`}>
                        {s.comp.stock}u
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div
                className={`mt-3 flex items-center gap-2 rounded-md p-2.5 text-sm ${
                  maxSillas !== null && maxSillas > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {maxSillas !== null && maxSillas > 0 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  Con el stock actual se pueden armar <strong>{maxSillas}</strong> silla(s).
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button className="flex-1 rounded-md border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
