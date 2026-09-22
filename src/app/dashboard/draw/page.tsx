'use client';
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,CalendarDays,Check,Palette,RotateCcw,Undo2} from 'lucide-react';
import {getSupabase,isSupabaseConfigured} from '@/lib/supabase';
import {lineStringWkt} from '@/lib/mapData';
import {totalDistance} from '@/lib/geoUtils';

const MapWrapper=dynamic(()=>import('@/components/map/MapWrapper'),{ssr:false});

export default function DrawRoutePage(){
  const router=useRouter();const[path,setPath]=useState<[number,number][]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[color,setColor]=useState('#eab02f');
  async function save(){if(path.length<2){setMessage('Marca al menos dos puntos sobre las calles.');return}if(!isSupabaseConfigured){setMessage('Conecta Supabase para guardar la ruta.');return}setBusy(true);const supabase=getSupabase();const{data:{user}}=await supabase.auth.getUser();const{error}=user?await supabase.from('rutas_evangelizadas').insert({ruta_recorrida:lineStringWkt(path),fecha_recorrido:new Date(`${date}T12:00:00`).toISOString(),color,creado_por:user.id}):{error:new Error('Sin sesión')};setBusy(false);if(error)setMessage('No se pudo guardar la ruta.');else router.replace('/dashboard/')}
  return <main className="relative h-dvh min-h-[34rem] overflow-hidden">
    <MapWrapper drawingPath={path} drawingColor={color} onMapClick={coordinate=>setPath(current=>[...current,coordinate])}/>
    <header className="absolute inset-x-0 top-0 z-[500] flex items-center justify-between p-3 sm:p-5"><button className="grid size-12 place-items-center rounded-2xl bg-white shadow-lg" onClick={()=>router.push('/dashboard/')} aria-label="Volver al mapa principal"><ArrowLeft/></button><div className="rounded-2xl bg-[#0c2347] px-5 py-3 text-center text-white shadow-lg"><p className="text-[12px] font-bold uppercase tracking-widest text-[#f4b740]">Ruta manual</p><p className="font-bold">Toca cada esquina recorrida</p></div><span className="size-12"/></header>
    <section className="absolute inset-x-3 bottom-3 z-[500] mx-auto max-w-lg rounded-[1.75rem] bg-white/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-[12px] font-bold uppercase tracking-wider text-[#5f6f86]">Ruta marcada</p><b>{path.length} puntos · {Math.round(totalDistance(path))} m</b></div><div className="flex gap-2"><button className="grid size-11 place-items-center rounded-xl bg-[#eef4fc] disabled:opacity-40" disabled={!path.length} onClick={()=>setPath(current=>current.slice(0,-1))} aria-label="Deshacer último punto"><Undo2 size={19}/></button><button className="grid size-11 place-items-center rounded-xl bg-[#eef4fc] disabled:opacity-40" disabled={!path.length} onClick={()=>setPath([])} aria-label="Borrar ruta"><RotateCcw size={19}/></button></div></div>
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-3"><label className="text-sm font-bold"><span className="flex items-center gap-1.5"><CalendarDays size={15}/>Fecha</span><input className="mt-1 min-h-10 w-full rounded-xl border border-[#cfd9e8] px-3" type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label className="text-sm font-bold"><span className="flex items-center gap-1.5"><Palette size={15}/>Color</span><input className="mt-1 size-10 rounded-xl border border-[#cfd9e8] bg-white p-1" type="color" value={color} onChange={event=>setColor(event.target.value)}/></label></div>
      {message&&<p role="alert" className="mb-3 rounded-xl bg-[#fff0f2] p-3 text-sm font-semibold text-[#a61e37]">{message}</p>}
      <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f63b8] font-bold text-white disabled:opacity-50" disabled={busy||path.length<2} onClick={save}><Check size={20}/>{busy?'Guardando…':'Guardar ruta cubierta'}</button>
    </section>
  </main>;
}
