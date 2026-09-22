'use client';

import {useState} from 'react';
import {CalendarDays,Check,Map,Palette,Pencil,Trash2,X} from 'lucide-react';
import type {RouteRecord} from '@/lib/mapData';
import {deleteRoute,updateRoute} from '@/lib/mapData';
import {isInsideTerritory,totalDistance} from '@/lib/geoUtils';

export default function RouteManager({routes,onChanged}:{routes:RouteRecord[];onChanged:()=>Promise<void>}){
  const[editing,setEditing]=useState<RouteRecord|null>(null);
  const[date,setDate]=useState('');
  const[color,setColor]=useState('#eab02f');
  const[deleting,setDeleting]=useState<string|null>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  function startEdit(route:RouteRecord){setEditing(route);setDate(route.fecha_recorrido.slice(0,10));setColor(route.color);setMessage('')}
  async function save(){if(!editing)return;setBusy(true);setMessage('');try{await updateRoute(editing.id,date,color);setEditing(null);await onChanged()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo actualizar la ruta.')}finally{setBusy(false)}}
  async function remove(id:string){setBusy(true);setMessage('');try{await deleteRoute(id);setDeleting(null);await onChanged()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo eliminar la ruta.')}finally{setBusy(false)}}

  if(!routes.length)return <div className="rounded-2xl border border-dashed border-[#a9bad3] px-5 py-10 text-center text-[#5f6f86]"><Map className="mx-auto mb-2"/><p className="font-semibold">Todavía no hay rutas guardadas.</p></div>;

  return <div className="space-y-3">
    {message&&<p role="alert" className="rounded-xl bg-[#fff0f2] p-3 text-sm font-semibold text-[#a61e37]">{message}</p>}
    <ul className="max-h-[58dvh] space-y-3 overflow-y-auto pr-1">{routes.map((route,index)=><li key={route.id} className="rounded-2xl border border-[#cfd9e8] p-4">
      {editing?.id===route.id?<div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3"><label className="text-sm font-bold"><span className="flex items-center gap-1.5"><CalendarDays size={16}/>Fecha</span><input className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-[#cfd9e8] px-3" type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label><label className="text-sm font-bold"><span className="flex items-center gap-1.5"><Palette size={16}/>Color</span><input className="focus-ring mt-2 size-11 cursor-pointer rounded-xl border border-[#cfd9e8] bg-white p-1" type="color" value={color} onChange={event=>setColor(event.target.value)}/></label></div>
        <div className="flex gap-2"><button className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2f63b8] font-bold text-white disabled:opacity-60" disabled={busy||!date} onClick={save}><Check size={18}/>Guardar cambios</button><button className="focus-ring grid size-11 place-items-center rounded-xl bg-[#eef4fc]" onClick={()=>setEditing(null)} aria-label="Cancelar"><X size={19}/></button></div>
      </div>:<div className="flex items-center gap-3">
        <span className="h-2 w-12 shrink-0 rounded-full" style={{backgroundColor:route.color}}/>
        <span className="min-w-0 flex-1"><strong className="block">Ruta {index+1}</strong><small className="text-[#5f6f86]">{new Date(route.fecha_recorrido).toLocaleDateString('es-CO')} · {(totalDistance(route.path)/1000).toFixed(2)} km</small>{route.path.some(p=>!isInsideTerritory(p))&&<span className="block text-sm font-bold text-amber-800">Fuera del territorio</span>}</span>
        <button className="focus-ring grid size-10 place-items-center rounded-xl bg-[#eef4fc] text-[#2f63b8]" onClick={()=>startEdit(route)} aria-label={`Editar ruta ${index+1}`}><Pencil size={18}/></button>
        <button className="focus-ring grid size-10 place-items-center rounded-xl bg-[#fff0f2] text-[#b4233d]" onClick={()=>setDeleting(route.id)} aria-label={`Eliminar ruta ${index+1}`}><Trash2 size={18}/></button>
      </div>}
      {deleting===route.id&&<div className="mt-3 rounded-xl bg-[#fff7f8] p-3"><p className="text-sm font-semibold">¿Eliminar esta ruta definitivamente?</p><div className="mt-3 flex justify-end gap-2"><button className="min-h-10 rounded-lg bg-white px-3 font-bold" onClick={()=>setDeleting(null)} disabled={busy}>Cancelar</button><button className="min-h-10 rounded-lg bg-[#b4233d] px-3 font-bold text-white disabled:opacity-60" onClick={()=>remove(route.id)} disabled={busy}>{busy?'Eliminando…':'Sí, eliminar'}</button></div></div>}
    </li>)}</ul>
  </div>;
}
