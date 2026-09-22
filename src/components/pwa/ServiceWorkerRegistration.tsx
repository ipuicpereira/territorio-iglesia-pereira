'use client';
import {useEffect} from 'react';
export default function ServiceWorkerRegistration(){useEffect(()=>{if(!('serviceWorker'in navigator)||process.env.NODE_ENV!=='production')return;let refreshing=false;const handleChange=()=>{if(refreshing)return;refreshing=true;window.location.reload()};navigator.serviceWorker.addEventListener('controllerchange',handleChange);void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>registration.update());return()=>navigator.serviceWorker.removeEventListener('controllerchange',handleChange)},[]);return null}
