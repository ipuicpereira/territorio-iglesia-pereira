'use client';
import {useEffect} from 'react';
type Tool={name:string;title:string;description:string;inputSchema:Record<string,unknown>;annotations:Record<string,boolean>;execute:(input:unknown)=>unknown};
declare global{interface Document{modelContext?:{registerTool:(tool:Tool,options?:{signal?:AbortSignal})=>void|Promise<void>}}}
export default function WebMcpRegistration(){useEffect(()=>{const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const register=(tool:Tool)=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>undefined)}catch{}}
register({name:'open_route_tracker',title:'Iniciar recorrido GPS',description:'Abre el modo Runner para comenzar a registrar una ruta de evangelización con GPS.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{window.location.assign('/dashboard/tracker/');return{status:'opened'}}});
register({name:'open_manual_route_drawing',title:'Dibujar ruta',description:'Abre el mapa para marcar manualmente las cuadras ya evangelizadas.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{window.location.assign('/dashboard/draw/');return{status:'opened'}}});
return()=>lifecycle.abort()},[]);return null}

