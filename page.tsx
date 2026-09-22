'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {getSupabase,isSupabaseConfigured} from '@/lib/supabase';
export default function HomePage(){const router=useRouter();useEffect(()=>{if(!isSupabaseConfigured){router.replace('/dashboard/');return}void getSupabase().auth.getSession().then(({data})=>router.replace(data.session?'/dashboard/':'/login/'))},[router]);return <main className="grid min-h-dvh place-items-center bg-[#f4f7fc]"><p className="font-semibold text-[#2f63b8]">Abriendo territorio…</p></main>}

