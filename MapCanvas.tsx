'use client';
import {useEffect,useMemo,useState} from 'react';
import {divIcon} from 'leaflet';
import {Check,Layers3,Map,Satellite} from 'lucide-react';
import {CircleMarker,GeoJSON,MapContainer,Marker,Polyline,Popup,TileLayer,useMap,useMapEvents} from 'react-leaflet';
import type {Feature,Polygon as GeoPolygon} from 'geojson';
import type {MapPoint,RouteRecord} from '@/lib/mapData';
import {PEREIRA_CENTER,TERRITORY_RING} from '@/lib/geoUtils';

export const TERRITORY:Feature<GeoPolygon>={type:'Feature',properties:{name:'Territorio asignado'},geometry:{type:'Polygon',coordinates:[TERRITORY_RING]}};
const colors={hermano_verde:'#20b875',amigo_rojo:'#e5485d',culto_azul:'#3478f6'};
const CHURCH_POSITION:[number,number]=[4.817091,-75.710991];
type BasemapId='detallado'|'satelital'|'limpio';
const basemaps:Record<BasemapId,{label:string;description:string;url:string;attribution:string;maxNativeZoom?:number}>={
  detallado:{label:'Detallado',description:'Calles, barrios y lugares',url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
  satelital:{label:'Satelital',description:'Fotografía aérea del territorio',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
  limpio:{label:'Limpio',description:'Calles con menos avisos',url:'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',attribution:'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',maxNativeZoom:16}
};
const basemapIcons={detallado:Map,satelital:Satellite,limpio:Layers3};

function createPointIcon(tipo:MapPoint['tipo']){return divIcon({className:'church-point-marker',html:`<span class="church-point-marker__badge" style="background:${colors[tipo]}"><img src="/logo-casa-de-oracion.png" alt="" /></span>`,iconSize:[42,42],iconAnchor:[21,21],popupAnchor:[0,-24]})}
const churchIcon=divIcon({className:'church-point-marker',html:'<span class="church-point-marker__church"><img src="/logo-casa-de-oracion.png" alt="" /><i></i></span>',iconSize:[62,74],iconAnchor:[31,68],popupAnchor:[0,-66]});
function MapClick({onClick}:{onClick?:(coordinate:[number,number])=>void}){useMapEvents({click:event=>onClick?.([event.latlng.lat,event.latlng.lng])});return null}
function FollowPosition({position}:{position?:[number,number]}){const map=useMap();useEffect(()=>{if(position)map.setView(position,17,{animate:true})},[map,position]);return null}

export interface MapCanvasProps{
  puntos?:MapPoint[];
  onMapClick?:(coordinate:[number,number])=>void;
  onPuntoSeleccionado?:(point:MapPoint)=>void;
  currentPath?:[number,number][];
  currentPathColor?:string;
  currentPosition?:[number,number];
  drawingPath?:[number,number][];
  drawingColor?:string;
  coveredRoutes?:RouteRecord[];
  restrictToTerritory?:boolean;
}

export default function MapCanvas({puntos=[],onMapClick,onPuntoSeleccionado,currentPath=[],currentPathColor='#f4b740',currentPosition,drawingPath=[],drawingColor='#f4b740',coveredRoutes=[],restrictToTerritory=true}:MapCanvasProps){
  const[basemapId,setBasemapId]=useState<BasemapId>('detallado');
  const[layerMenuOpen,setLayerMenuOpen]=useState(false);
  useEffect(()=>{const saved=window.localStorage.getItem('ipuic-basemap');if(saved&&saved in basemaps)setBasemapId(saved as BasemapId)},[]);
  const pointIcons=useMemo(()=>({hermano_verde:createPointIcon('hermano_verde'),amigo_rojo:createPointIcon('amigo_rojo'),culto_azul:createPointIcon('culto_azul')}),[]);
  const activeBasemap=basemaps[basemapId];
  function selectBasemap(id:BasemapId){setBasemapId(id);setLayerMenuOpen(false);window.localStorage.setItem('ipuic-basemap',id)}
  return <>
  <MapContainer center={PEREIRA_CENTER} zoom={15} minZoom={restrictToTerritory?13:2} maxZoom={19} maxBounds={restrictToTerritory?[[4.797,-75.727],[4.8335,-75.676]]:undefined} maxBoundsViscosity={restrictToTerritory?.8:0} scrollWheelZoom className="h-full w-full" zoomControl={false}>
  <TileLayer key={basemapId} attribution={activeBasemap.attribution} url={activeBasemap.url} maxNativeZoom={activeBasemap.maxNativeZoom}/>
  <GeoJSON data={TERRITORY} interactive={false} style={{color:'#2f63b8',fillColor:'#6f99e0',fillOpacity:.07,opacity:.95,weight:4,dashArray:'10 7'}}/>
  {coveredRoutes.map(route=><Polyline key={route.id} positions={route.path} pathOptions={{color:route.color,weight:5,opacity:.78}}/>)}
  <Marker position={CHURCH_POSITION} icon={churchIcon}><Popup><strong>IPUIC Casa de Oración Pereira</strong><br/>Cl. 39 #6-26, Pereira, Risaralda<br/><small>Coordenadas: 4.817091, -75.710991</small></Popup></Marker>
  {puntos.map(point=><Marker key={point.id} position={point.posicion} icon={pointIcons[point.tipo]} eventHandlers={{click:()=>onPuntoSeleccionado?.(point)}}><Popup><strong>{point.nombre_identificador}</strong><br/>{point.direccion}</Popup></Marker>)}
  {drawingPath.length>1&&<Polyline positions={drawingPath} pathOptions={{color:drawingColor,weight:7,opacity:.9}}/>}
  {currentPath.length>1&&<Polyline positions={currentPath} pathOptions={{color:currentPathColor,weight:7,opacity:.95}}/>}
  {currentPosition&&<CircleMarker center={currentPosition} radius={10} pathOptions={{color:'#fff',fillColor:'#2f63b8',fillOpacity:1,weight:4}}/>}
  <MapClick onClick={onMapClick}/><FollowPosition position={currentPosition}/>
</MapContainer>
  <div className="absolute right-3 top-20 z-[480] sm:right-5 sm:top-24">
    <button type="button" className="focus-ring flex min-h-12 items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-4 font-bold text-[#0c2347] shadow-xl backdrop-blur" onClick={()=>setLayerMenuOpen(open=>!open)} aria-label="Cambiar tipo de mapa" aria-expanded={layerMenuOpen}><Layers3 size={20}/><span className="hidden sm:inline">{activeBasemap.label}</span></button>
    {layerMenuOpen&&<div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[#cfd9e8] bg-white p-2 shadow-2xl" role="menu" aria-label="Tipos de mapa">{(Object.keys(basemaps) as BasemapId[]).map(id=>{const option=basemaps[id];const Icon=basemapIcons[id];return <button key={id} type="button" role="menuitemradio" aria-checked={basemapId===id} className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${basemapId===id?'bg-[#eaf1fc] text-[#1b4484]':'hover:bg-[#f4f7fc]'}`} onClick={()=>selectBasemap(id)}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4fc]"><Icon size={21}/></span><span className="min-w-0 flex-1"><strong className="block">{option.label}</strong><small className="block text-xs font-normal text-[#5f6f86]">{option.description}</small></span>{basemapId===id&&<Check size={19}/>}</button>})}</div>}
  </div>
  </>}
