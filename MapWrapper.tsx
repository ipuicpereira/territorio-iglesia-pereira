'use client';
import dynamic from 'next/dynamic';import {LoaderCircle} from 'lucide-react';import type {MapCanvasProps} from './MapCanvas';
const MapCanvas=dynamic(()=>import('./MapCanvas'),{ssr:false});
export default function MapWrapper(props:MapCanvasProps&{loading?:boolean}){return <div className="absolute inset-0" aria-label="Mapa del territorio asignado"><MapCanvas {...props}/>{props.loading&&<div className="absolute inset-0 z-[450] grid place-items-center bg-white/45 backdrop-blur-[2px]"><div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 font-semibold shadow-lg"><LoaderCircle className="animate-spin" size={20}/>Cargando territorio</div></div>}</div>}

