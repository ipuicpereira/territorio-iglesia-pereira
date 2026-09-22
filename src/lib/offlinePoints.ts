import {getSupabase} from './supabase';
import {PointType} from './mapData';
export interface PendingPoint {id:string;owner:string;tipo:PointType;name:string;address:string;phone:string;coordinate:[number,number];date:string;attendees:number;notes:string;photos:File[];cultoId:string}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('ipuic-pending-points',1);request.onupgradeneeded=()=>request.result.createObjectStore('points',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function queuePoint(point:PendingPoint){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('points','readwrite');tx.objectStore('points').put(point);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}
async function pending(){const db=await openDb();try{return await new Promise<PendingPoint[]>((resolve,reject)=>{const r=db.transaction('points').objectStore('points').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}}
async function remove(id:string){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('points','readwrite');tx.objectStore('points').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}
let syncing:Promise<number>|null=null;
export function syncPoints(){if(syncing)return syncing;syncing=(async()=>{const db=getSupabase();const {data:{session}}=await db.auth.getSession();if(!session)return 0;let count=0;for(const p of (await pending()).filter(p=>p.owner===session.user.id)){
 const {data:existing,error:readError}=await db.from('puntos_mapa').select('id,fotos_urls').eq('id',p.id).maybeSingle();if(readError)throw readError;
 if(!existing){const {error}=await db.from('puntos_mapa').insert({id:p.id,tipo:p.tipo,nombre_identificador:p.name,direccion:p.address,telefono:p.phone||null,coordenada:`POINT(${p.coordinate[1]} ${p.coordinate[0]})`,creado_por:p.owner});if(error)throw error}
 const urls:string[]=[];for(let i=0;i<p.photos.length;i++){const path=`${p.id}/pendiente/${i}.webp`;const {error}=await db.storage.from('fotos-cultos').upload(path,p.photos[i],{upsert:true,contentType:'image/webp'});if(error)throw error;urls.push(db.storage.from('fotos-cultos').getPublicUrl(path).data.publicUrl)}
 if(p.tipo==='culto_azul'){const {data:history,error:historyError}=await db.from('historial_cultos').select('id').eq('id',p.cultoId).maybeSingle();if(historyError)throw historyError;if(!history){const {error}=await db.from('historial_cultos').insert({id:p.cultoId,punto_id:p.id,fecha_culto:p.date,asistentes:p.attendees,notas:p.notes||null,fotos_urls:urls});if(error)throw error}}
 else if(urls.length){const {error}=await db.from('puntos_mapa').update({fotos_urls:Array.from(new Set([...(existing?.fotos_urls??[]),...urls]))}).eq('id',p.id).select('id').single();if(error)throw error}
 await remove(p.id);count++;
 }return count})().finally(()=>{syncing=null});return syncing}
