'use client';
import {FormEvent,useEffect,useState} from 'react';
import {MapPoint,PointType} from '@/lib/mapData';
import {getSupabase} from '@/lib/supabase';
import {compressPhoto} from '@/lib/imageUtils';

export default function EditPointForm({point,onSaved}:{point:MapPoint;onSaved:()=>void}){
 const [name,setName]=useState(point.nombre_identificador),[address,setAddress]=useState(point.direccion),[phone,setPhone]=useState(point.telefono??''),[type,setType]=useState<PointType>(point.tipo);
 const [lat,setLat]=useState(String(point.posicion[0])),[lng,setLng]=useState(String(point.posicion[1]));
 const [photos,setPhotos]=useState(point.fotos_urls),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [follow,setFollow]=useState({estado:'nuevo',ultima_visita:'',proxima_visita:'',notas:''}),[followReady,setFollowReady]=useState(false);
 useEffect(()=>{let alive=true;void getSupabase().from('seguimiento_amigos').select('*').eq('punto_id',point.id).maybeSingle().then(({data,error})=>{if(!alive)return;if(error){setMessage('No se pudo cargar el seguimiento. Reabre este formulario.');return}if(data)setFollow({estado:data.estado,ultima_visita:data.ultima_visita??'',proxima_visita:data.proxima_visita??'',notas:data.notas??''});setFollowReady(true)});return()=>{alive=false}},[point.id]);
 async function save(event:FormEvent){event.preventDefault();setBusy(true);setMessage('');const db=getSupabase();const uploaded:string[]=[];let pointSaved=false;
 try{
  if(type!==point.tipo&&point.tipo==='culto_azul'){const {count,error}=await db.from('historial_cultos').select('id',{count:'exact',head:true}).eq('punto_id',point.id);if(error)throw error;if(count)throw new Error('Este lugar tiene cultos registrados; conserva su tipo para proteger la bitácora.');}
  if(photos.length+files.length>6)throw new Error('Puedes conservar máximo 6 fotos por registro.');
  const urls=[...photos];for(const file of files){const compressed=await compressPhoto(file);const path=`${point.id}/perfil/${compressed.name}`;const {error}=await db.storage.from('fotos-cultos').upload(path,compressed,{contentType:'image/webp'});if(error)throw error;uploaded.push(path);urls.push(db.storage.from('fotos-cultos').getPublicUrl(path).data.publicUrl)}
  const {data,error}=await db.from('puntos_mapa').update({tipo:type,nombre_identificador:name.trim(),direccion:address.trim(),telefono:phone.trim()||null,coordenada:`POINT(${Number(lng)} ${Number(lat)})`,fotos_urls:urls}).eq('id',point.id).select('id').single();if(error||!data)throw new Error('No se guardaron los cambios. Comprueba la conexión y tus permisos.');pointSaved=true;
  setFiles([]);setPhotos(urls);
  if(type==='amigo_rojo'){const {error}=await db.from('seguimiento_amigos').upsert({punto_id:point.id,...follow,ultima_visita:follow.ultima_visita||null,proxima_visita:follow.proxima_visita||null,actualizado_en:new Date().toISOString()});if(error)throw new Error('El registro se actualizó, pero no se guardó el seguimiento. Inténtalo nuevamente.');}
  setFiles([]);setPhotos(urls);onSaved();
 }catch(error){if(!pointSaved&&uploaded.length)await db.storage.from('fotos-cultos').remove(uploaded);setMessage(error instanceof Error?error.message:'No se pudieron guardar los cambios.')}finally{setBusy(false)}}
 const field='mt-1 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-3';
 return <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
 <label className="block font-bold">Tipo<select className={field} value={type} onChange={e=>setType(e.target.value as PointType)}><option value="hermano_verde">Hermano</option><option value="amigo_rojo">Amigo</option><option value="culto_azul">Lugar de culto</option></select></label>
 <label className="block font-bold">Nombre<input className={field} required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block font-bold">Dirección<input className={field} required maxLength={300} value={address} onChange={e=>setAddress(e.target.value)}/></label>
 <label className="block font-bold">Teléfono<input className={field} type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <div className="grid grid-cols-2 gap-3"><label>Latitud<input className={field} required type="number" min="-90" max="90" step="any" value={lat} onChange={e=>setLat(e.target.value)}/></label><label>Longitud<input className={field} required type="number" min="-180" max="180" step="any" value={lng} onChange={e=>setLng(e.target.value)}/></label></div>
 <div className="flex flex-wrap gap-3">{photos.map(url=><div key={url}><img src={url} alt="Foto del registro" className="size-20 rounded-xl object-cover"/><button type="button" className="py-2 text-sm text-red-700" onClick={()=>setPhotos(current=>current.filter(p=>p!==url))}>Quitar foto</button></div>)}</div>
 <p className="text-sm text-[#5f6f86]">Al quitar una foto se desvincula del registro. Su archivo permanece hasta limpiarlo en almacenamiento.</p>
 <label className="block font-bold">Añadir fotos<input className="mt-2 block w-full text-sm" type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files??[]))}/><small className="block mt-1 font-normal">Se comprimen antes de subir: máximo 300 KB y 1280 px.</small></label>
 {type==='amigo_rojo'&&<fieldset className="space-y-3 rounded-xl bg-[#eef4fc] p-3"><legend className="font-bold">Seguimiento de visitas</legend><label className="block">Estado<select className={field} value={follow.estado} onChange={e=>setFollow({...follow,estado:e.target.value})}>{['nuevo','visitado','interesado','integrado'].map(s=><option key={s} value={s}>{s}</option>)}</select></label><label className="block">Última visita<input className={field} type="date" value={follow.ultima_visita} onChange={e=>setFollow({...follow,ultima_visita:e.target.value})}/></label><label className="block">Próxima visita<input className={field} type="date" value={follow.proxima_visita} onChange={e=>setFollow({...follow,proxima_visita:e.target.value})}/></label><label className="block">Observaciones<textarea className={field} maxLength={3000} value={follow.notas} onChange={e=>setFollow({...follow,notas:e.target.value})}/></label></fieldset>}
 </fieldset>{message&&<p role="alert" className="text-red-700">{message}</p>}<button disabled={busy||(type==='amigo_rojo'&&!followReady)} className="min-h-12 w-full rounded-xl bg-[#2f63b8] font-bold text-white disabled:opacity-50">{busy?'Guardando…':'Guardar cambios'}</button></form>
}
