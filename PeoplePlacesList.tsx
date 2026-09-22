'use client';

import { useMemo, useState } from 'react';
import { Church, MapPin, Phone, Search, Trash2, UserRound, UsersRound, Pencil } from 'lucide-react';
import type { MapPoint, PointType } from '@/lib/mapData';

type Filter = 'todos' | PointType;

const filters: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'hermano_verde', label: 'Hermanos' },
  { value: 'amigo_rojo', label: 'Amigos' },
  { value: 'culto_azul', label: 'Cultos' },
];

const labels: Record<PointType, string> = {
  hermano_verde: 'Hermano',
  amigo_rojo: 'Amigo',
  culto_azul: 'Lugar de culto',
};

const colors: Record<PointType, string> = {
  hermano_verde: '#20b875',
  amigo_rojo: '#e5485d',
  culto_azul: '#3478f6',
};

function TypeIcon({ type }: { type: PointType }) {
  if (type === 'culto_azul') return <Church size={20} />;
  if (type === 'amigo_rojo') return <UserRound size={20} />;
  return <UsersRound size={20} />;
}

export default function PeoplePlacesList({
  points,
  onSelect,
  onDelete,
  onEdit,
}: {
  points: MapPoint[];
  onSelect: (point: MapPoint) => void;
  onDelete: (point: MapPoint) => Promise<void>;
  onEdit: (point: MapPoint) => void;
}) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<MapPoint | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const visiblePoints = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    return points.filter((point) => {
      const matchesType = filter === 'todos' || point.tipo === filter;
      const matchesQuery = !normalizedQuery || `${point.nombre_identificador} ${point.direccion} ${point.telefono ?? ''}`.toLocaleLowerCase('es').includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [filter, points, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el registro.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f86]" size={19} />
        <input className="focus-ring min-h-12 w-full rounded-xl border border-[#cfd9e8] pl-10 pr-3" type="search" placeholder="Buscar por nombre, dirección o teléfono" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar registros">
        {filters.map((option) => {
          const count = option.value === 'todos' ? points.length : points.filter((point) => point.tipo === option.value).length;
          return <button key={option.value} role="tab" aria-selected={filter === option.value} className={`focus-ring whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold ${filter === option.value ? 'bg-[#0c2347] text-white' : 'bg-[#eef4fc] text-[#334c70]'}`} onClick={() => setFilter(option.value)}>{option.label} · {count}</button>;
        })}
      </div>

      {visiblePoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#a9bad3] px-5 py-10 text-center text-[#5f6f86]">
          <MapPin className="mx-auto mb-2" />
          <p className="font-semibold">No hay registros en esta lista.</p>
        </div>
      ) : (
        <ul className="max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
          {visiblePoints.map((point) => (
            <li key={point.id} className="flex items-center gap-3 rounded-2xl border border-[#cfd9e8] bg-white p-3">
              <button className="focus-ring flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelect(point)}>
                {point.fotos_urls[0]?<img src={point.fotos_urls[0]} alt="" className="size-11 shrink-0 rounded-xl object-cover"/>:<span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: colors[point.tipo] }}><TypeIcon type={point.tipo} /></span>}
                <span className="min-w-0">
                  <small className="font-bold uppercase tracking-wider text-[#5f6f86]">{labels[point.tipo]}</small>
                  <strong className="block truncate text-base">{point.nombre_identificador}</strong>
                  <span className="block truncate text-sm text-[#5f6f86]">{point.direccion}</span>
                  {point.telefono && <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#2f63b8]"><Phone size={14} />{point.telefono}</span>}
                </span>
              </button>
              <button className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef4fc]" onClick={()=>onEdit(point)} aria-label={`Editar ${point.nombre_identificador}`}><Pencil size={19}/></button>
              <button className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff0f2] text-[#b4233d]" onClick={() => { setPendingDelete(point); setError(''); }} aria-label={`Eliminar ${point.nombre_identificador}`}><Trash2 size={19} /></button>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <div className="rounded-2xl border border-[#f3b5bf] bg-[#fff7f8] p-4" role="alertdialog" aria-labelledby="delete-title">
          <h3 id="delete-title" className="font-black">¿Eliminar “{pendingDelete.nombre_identificador}”?</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#5f6f86]">{pendingDelete.tipo === 'culto_azul' ? 'También se eliminarán su bitácora y las fotos almacenadas.' : 'Este registro desaparecerá del mapa y del listado.'}</p>
          {error && <p className="mt-3 text-sm font-semibold text-[#b4233d]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button className="focus-ring min-h-11 rounded-xl bg-white px-4 font-bold" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancelar</button>
            <button className="focus-ring min-h-11 rounded-xl bg-[#b4233d] px-4 font-bold text-white disabled:opacity-60" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Eliminando…' : 'Sí, eliminar'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
