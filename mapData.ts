import {getSupabase,isSupabaseConfigured} from './supabase';
export type PointType='hermano_verde'|'amigo_rojo'|'culto_azul';export interface MapPoint{id:string;tipo:PointType;nombre_identificador:string;direccion:string;telefono?:string|null;fotos_urls:string[];posicion:[number,number]}export interface RouteRecord{id:string;fecha_recorrido:string;color:string;path:[number,number][]}
type Geometry={type:string;coordinates:number[]|number[][]}|string|null;
function parseGeometry(value:Geometry):number[]|number[][]|null{if(!value)return null;if(typeof value==='object')return value.coordinates;try{return JSON.parse(value).coordinates??null}catch{return null}}
export async function fetchMapPoints():Promise<MapPoint[]>{if(!isSupabaseConfigured)return[];const{data,error}=await getSupabase().from('puntos_mapa').select('id,tipo,nombre_identificador,direccion,telefono,fotos_urls,coordenada').order('creado_en');if(error)throw new Error('No se pudieron cargar los puntos.');return(data??[]).flatMap(row=>{const coordinates=parseGeometry(row.coordenada as Geometry);if(!Array.isArray(coordinates)||typeof coordinates[0]!=='number')return[];return[{...row,fotos_urls:row.fotos_urls??[],posicion:[coordinates[1],coordinates[0]] as[number,number]}]})}
export async function fetchRoutes():Promise<RouteRecord[]>{if(!isSupabaseConfigured)return[];const{data,error}=await getSupabase().from('rutas_evangelizadas').select('id,fecha_recorrido,color,ruta_recorrida').order('fecha_recorrido',{ascending:false});if(error)throw new Error('No se pudieron cargar las rutas.');return(data??[]).flatMap(row=>{const coordinates=parseGeometry(row.ruta_recorrida as Geometry);if(!Array.isArray(coordinates)||!Array.isArray(coordinates[0]))return[];return[{id:row.id,fecha_recorrido:row.fecha_recorrido,color:row.color??'#eab02f',path:(coordinates as number[][]).map(c=>[c[1],c[0]] as[number,number])}]})}
export function lineStringWkt(path:[number,number][]){return`LINESTRING(${path.map(([lat,lng])=>`${lng} ${lat}`).join(',')})`}
export async function updateRoute(id:string,fecha:string,color:string){const{error}=await getSupabase().from('rutas_evangelizadas').update({fecha_recorrido:new Date(`${fecha}T12:00:00`).toISOString(),color}).eq('id',id);if(error)throw new Error('No se pudo actualizar la ruta.')}
export async function deleteRoute(id:string){const{error}=await getSupabase().from('rutas_evangelizadas').delete().eq('id',id);if(error)throw new Error('No tienes permiso para eliminar esta ruta.')}

function storagePathFromPublicUrl(value:string){try{const pathname=new URL(value).pathname;const marker='/storage/v1/object/public/fotos-cultos/';const index=pathname.indexOf(marker);return index>=0?decodeURIComponent(pathname.slice(index+marker.length)):null}catch{return null}}

export async function deleteMapPoint(point:MapPoint):Promise<void>{
  if(!isSupabaseConfigured)throw new Error('Falta conectar Supabase para eliminar información.');
  const supabase=getSupabase();
  let photoPaths=(point.fotos_urls??[]).map(storagePathFromPublicUrl).filter((path):path is string=>Boolean(path));
  if(point.tipo==='culto_azul'){
    const{data,error}=await supabase.from('historial_cultos').select('fotos_urls').eq('punto_id',point.id);
    if(error)throw new Error('No se pudo consultar el historial del culto.');
    photoPaths.push(...(data??[]).flatMap(row=>(row.fotos_urls as string[]??[]).map(storagePathFromPublicUrl).filter((path):path is string=>Boolean(path))));
  }
  const{error:deleteError}=await supabase.from('puntos_mapa').delete().eq('id',point.id);
  if(deleteError)throw new Error('No tienes permiso para eliminar este registro o la conexión falló.');
  if(photoPaths.length){
    const{error:storageError}=await supabase.storage.from('fotos-cultos').remove(photoPaths);
    if(storageError)console.warn('El registro se eliminó, pero algunas fotos requieren limpieza manual.',storageError);
  }
}
