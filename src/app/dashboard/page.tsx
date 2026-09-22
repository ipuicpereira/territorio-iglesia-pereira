'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, KeyRound, List, LogOut, Menu, PencilLine, Plus, Route, X } from 'lucide-react';
import AddPointForm from '@/components/forms/AddPointForm';
import ChangePasswordForm from '@/components/forms/ChangePasswordForm';
import WorshipLogForm from '@/components/forms/WorshipLogForm';
import AppDialog from '@/components/ui/AppDialog';
import Legend from '@/components/ui/Legend';
import PeoplePlacesList from '@/components/ui/PeoplePlacesList';
import Toast, { type ToastState } from '@/components/ui/Toast';
import ChurchBrand from '@/components/ui/ChurchBrand';
import RouteManager from '@/components/ui/RouteManager';
import EditPointForm from '@/components/forms/EditPointForm';
import ReportsPanel from '@/components/ui/ReportsPanel';
import AuditPanel from '@/components/ui/AuditPanel';
import StoragePanel from '@/components/ui/StoragePanel';
import UsersPanel from '@/components/ui/UsersPanel';
import {syncRoutes} from '@/lib/offlineRoutes';
import {syncPoints} from '@/lib/offlinePoints';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { deleteMapPoint, fetchMapPoints, fetchRoutes, type MapPoint, type RouteRecord } from '@/lib/mapData';

const MapWrapper = dynamic(() => import('@/components/map/MapWrapper'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'point'|'worship'|'list'|'routes'|'password'|'edit'|'reports'|'audit'|'storage'|'users'|null>(null);
  const [draftCoordinate, setDraftCoordinate] = useState<[number,number]|null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint|null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function loadPoints(){setLoading(true);try{const[loadedPoints,loadedRoutes]=await Promise.all([fetchMapPoints(),fetchRoutes()]);setPoints(loadedPoints);setRoutes(loadedRoutes)}catch(error){setToast({kind:'error',message:error instanceof Error?error.message:'No se pudo cargar el mapa.'})}finally{setLoading(false)}}
  useEffect(()=>{const sync=()=>{if(navigator.onLine)void Promise.all([syncRoutes(),syncPoints()]).then(counts=>{const count=counts.reduce((a,b)=>a+b,0);if(count){void loadPoints();setToast({kind:'success',message:`${count} registro(s) pendiente(s) sincronizado(s).`})}}).catch(()=>setToast({kind:'error',message:'No se completó la sincronización. Los pendientes se conservan en este dispositivo.'}))};sync();window.addEventListener('online',sync);return()=>window.removeEventListener('online',sync)},[]);
  useEffect(()=>{if(!isSupabaseConfigured){setLoading(false);setToast({kind:'info',message:'Modo de muestra: conecta Supabase para guardar información.'});return}void getSupabase().auth.getSession().then(({data})=>{if(!data.session)router.replace('/login/');else void loadPoints()})},[router]);
  const worshipPoints=useMemo(()=>points.filter(point=>point.tipo==='culto_azul'),[points]);
  function requestPointAt(coordinate:[number,number]){setDraftCoordinate(coordinate);setDialog('point')}
  async function signOut(){if(isSupabaseConfigured)await getSupabase().auth.signOut();router.replace('/login/')}

  return <main className="relative h-dvh min-h-[34rem] overflow-hidden bg-[#dde7f4]">
    <MapWrapper puntos={points} coveredRoutes={routes} loading={loading} onMapClick={requestPointAt} onPuntoSeleccionado={setSelectedPoint}/>
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between p-3 sm:p-5">
      <div className="pointer-events-auto rounded-2xl border border-white/70 bg-white/95 px-3 py-2 shadow-[0_14px_40px_rgba(12,35,71,.18)] backdrop-blur"><ChurchBrand compact /></div>
      <button className="focus-ring pointer-events-auto grid size-12 place-items-center rounded-2xl border border-white/70 bg-white/95 shadow-lg" onClick={()=>setMenuOpen(v=>!v)} aria-label="Abrir menú" aria-expanded={menuOpen}>{menuOpen?<X/>:<Menu/>}</button>
    </header>
    {menuOpen&&<nav className="absolute right-3 top-20 z-[600] max-h-[calc(100dvh-7rem)] w-72 overflow-y-auto rounded-2xl border border-[#cfd9e8] bg-white p-2 shadow-2xl sm:right-5" aria-label="Menú principal">
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>router.push('/dashboard/tracker/')}><Crosshair size={20}/>Iniciar recorrido GPS</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>router.push('/dashboard/draw/')}><PencilLine size={20}/>Dibujar ruta cubierta</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('routes');setMenuOpen(false)}}><Route size={20}/>Editar o eliminar rutas</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('list');setMenuOpen(false)}}><List size={20}/>Ver hermanos, amigos y cultos</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('reports');setMenuOpen(false)}}><List size={20}/>Estadísticas y respaldos</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('audit');setMenuOpen(false)}}><List size={20}/>Historial de cambios</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('storage');setMenuOpen(false)}}><List size={20}/>Almacenamiento de fotos</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('users');setMenuOpen(false)}}><List size={20}/>Usuarios y roles</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('worship');setMenuOpen(false)}}><Plus size={20}/>Registrar culto</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold hover:bg-[#eef4fc]" onClick={()=>{setDialog('password');setMenuOpen(false)}}><KeyRound size={20}/>Cambiar contraseña</button>
      <button className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-[#b4233d] hover:bg-[#fff0f2]" onClick={signOut}><LogOut size={20}/>Cerrar sesión</button>
    </nav>}
    <div className="absolute bottom-5 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-2"><button className="focus-ring flex min-h-12 items-center gap-2 rounded-full bg-[#0c2347] px-5 font-bold text-white shadow-xl" onClick={()=>setToast({kind:'info',message:'Toca el mapa en el lugar que deseas registrar.'})}><Plus size={20}/>Agregar punto</button><button className="focus-ring grid size-12 place-items-center rounded-full bg-[#f4b740] text-[#0c2347] shadow-xl" onClick={()=>router.push('/dashboard/tracker/')} aria-label="Iniciar recorrido"><Route/></button></div>
    <Legend counts={{hermanos:points.filter(p=>p.tipo==='hermano_verde').length,amigos:points.filter(p=>p.tipo==='amigo_rojo').length,cultos:worshipPoints.length}}/>
    {selectedPoint&&<aside className="absolute bottom-24 right-3 z-[500] w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur sm:right-5"><button className="absolute right-3 top-3 text-[#5f6f86]" onClick={()=>setSelectedPoint(null)} aria-label="Cerrar detalle"><X size={20}/></button><p className="mb-1 text-[13px] font-bold uppercase tracking-wider text-[#2f63b8]">{selectedPoint.tipo==='hermano_verde'?'Hermano':selectedPoint.tipo==='amigo_rojo'?'Amigo':'Lugar de culto'}</p><h2 className="pr-8 text-xl font-bold">{selectedPoint.nombre_identificador}</h2><p className="mt-1 text-[#5f6f86]">{selectedPoint.direccion}</p>{selectedPoint.telefono&&<a className="mt-3 inline-block font-semibold text-[#2f63b8]" href={`tel:${selectedPoint.telefono}`}>{selectedPoint.telefono}</a>}{selectedPoint.fotos_urls.length>0&&<div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Fotos del registro">{selectedPoint.fotos_urls.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0"><img src={url} alt={`Foto ${index+1} de ${selectedPoint.nombre_identificador}`} className="size-24 rounded-xl object-cover"/></a>)}</div>}{selectedPoint.tipo==='culto_azul'&&<button className="mt-4 w-full rounded-xl bg-[#2f63b8] px-4 py-3 font-bold text-white" onClick={()=>setDialog('worship')}>Registrar culto aquí</button>}</aside>}
    <AppDialog open={dialog==='point'} title="Agregar punto al territorio" onClose={()=>setDialog(null)}><AddPointForm coordinate={draftCoordinate} onSaved={()=>{setDialog(null);void loadPoints();setToast({kind:'success',message:'Punto guardado en el mapa.'})}}/></AppDialog>
    <AppDialog open={dialog==='worship'} title="Registrar un culto" onClose={()=>setDialog(null)}><WorshipLogForm points={worshipPoints} initialPointId={selectedPoint?.tipo==='culto_azul'?selectedPoint.id:undefined} onSaved={()=>{setDialog(null);setToast({kind:'success',message:'Culto registrado correctamente.'})}}/></AppDialog>
    <AppDialog open={dialog==='list'} title="Personas y lugares" onClose={()=>setDialog(null)}><PeoplePlacesList points={points} onEdit={point=>{setSelectedPoint(point);setDialog('edit')}} onSelect={(point)=>{setSelectedPoint(point);setDialog(null)}} onDelete={async(point)=>{await deleteMapPoint(point);setPoints(current=>current.filter(item=>item.id!==point.id));if(selectedPoint?.id===point.id)setSelectedPoint(null);setToast({kind:'success',message:'Registro eliminado correctamente.'})}}/></AppDialog>
    <AppDialog open={dialog==='edit'} title="Editar registro" onClose={()=>setDialog(null)}>{selectedPoint&&<EditPointForm key={selectedPoint.id} point={selectedPoint} onSaved={()=>{setDialog(null);setSelectedPoint(null);void loadPoints();setToast({kind:'success',message:'Registro actualizado.'})}}/>}</AppDialog>
    <AppDialog open={dialog==='reports'} title="Estadísticas y respaldos" onClose={()=>setDialog(null)}><ReportsPanel points={points} routes={routes}/></AppDialog>
    <AppDialog open={dialog==='audit'} title="Historial de cambios" onClose={()=>setDialog(null)}><AuditPanel/></AppDialog>
    <AppDialog open={dialog==='storage'} title="Almacenamiento de fotos" onClose={()=>setDialog(null)}><StoragePanel/></AppDialog>
    <AppDialog open={dialog==='users'} title="Usuarios y roles" onClose={()=>setDialog(null)}><UsersPanel/></AppDialog>
    <AppDialog open={dialog==='routes'} title="Rutas evangelizadas" onClose={()=>setDialog(null)}><RouteManager routes={routes} onChanged={async()=>{const loaded=await fetchRoutes();setRoutes(loaded)}}/></AppDialog>
    <AppDialog open={dialog==='password'} title="Cambiar contraseña" onClose={()=>setDialog(null)}><ChangePasswordForm onSaved={()=>{setDialog(null);setToast({kind:'success',message:'Contraseña actualizada correctamente.'})}}/></AppDialog>
    <Toast value={toast} onClose={()=>setToast(null)}/>
  </main>;
}
