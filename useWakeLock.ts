'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export function useWakeLock(){
 const sentinel=useRef<WakeLockSentinel|null>(null),wanted=useRef(false),pending=useRef(false);
 const[active,setActive]=useState(false),[supported,setSupported]=useState(false);
 useEffect(()=>setSupported('wakeLock'in navigator),[]);
 const request=useCallback(async()=>{wanted.current=true;if(!('wakeLock'in navigator)||document.visibilityState!=='visible')return false;if(sentinel.current)return true;if(pending.current)return false;pending.current=true;try{const lock=await navigator.wakeLock.request('screen');if(!wanted.current){await lock.release();return false}sentinel.current=lock;setActive(true);lock.addEventListener('release',()=>{if(sentinel.current===lock){sentinel.current=null;setActive(false)}},{once:true});return true}catch{return false}finally{pending.current=false}},[]);
 const release=useCallback(async()=>{wanted.current=false;const lock=sentinel.current;sentinel.current=null;setActive(false);try{await lock?.release()}catch{}},[]);
 useEffect(()=>{const resume=()=>{if(document.visibilityState==='visible'&&wanted.current&&!sentinel.current)void request()};document.addEventListener('visibilitychange',resume);return()=>{document.removeEventListener('visibilitychange',resume);wanted.current=false;void sentinel.current?.release().catch(()=>{})}},[request]);
 return{supported,active,request,release};
}
