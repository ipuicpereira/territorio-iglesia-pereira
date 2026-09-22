'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import ChurchBrand from '@/components/ui/ChurchBrand';
import { getSupabase, isSupabaseConfigured, usernameToEmail } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured) void getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard/');
    });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) { router.push('/dashboard/'); return; }
    setLoading(true); setMessage('');
    const { error } = await getSupabase().auth.signInWithPassword({ email: usernameToEmail(username), password });
    setLoading(false);
    if (error) setMessage('No pudimos iniciar sesión. Revisa el usuario y la contraseña.');
    else router.replace('/dashboard/');
  }

  return <main className="relative grid min-h-dvh overflow-hidden bg-[#0c2347] px-5 py-10 sm:place-items-center">
    <div className="pointer-events-none absolute inset-0 opacity-35" style={{backgroundImage:'radial-gradient(circle at 18% 18%, #5f8dd8 0, transparent 30%), radial-gradient(circle at 88% 78%, #264f94 0, transparent 32%)'}} />
    <div className="pointer-events-none absolute -bottom-40 -right-32 size-[30rem] rounded-full border-[5rem] border-white/5" />
    <section className="relative w-full max-w-md rounded-[2rem] border border-white/30 bg-white p-6 shadow-[0_28px_90px_rgba(4,20,48,.45)] sm:p-9">
      <ChurchBrand className="mb-8" />
      <h1 className="text-3xl font-black tracking-[-.03em] text-[#0c2347]">Bienvenido</h1>
      <p className="mt-2 text-base leading-relaxed text-[#5f6f86]">Ingresa para consultar y actualizar el territorio asignado.</p>
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="block text-sm font-bold">Usuario<input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-4" type="text" autoComplete="username" autoCapitalize="none" pattern="[A-Za-z0-9._-]+" required value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label className="block text-sm font-bold">Contraseña<span className="relative mt-2 block"><input className="focus-ring min-h-12 w-full rounded-xl border border-[#cfd9e8] px-4 pr-12" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /><button type="button" className="absolute right-0 top-0 grid size-12 place-items-center text-[#5f6f86]" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>
        {message&&<p role="alert" className="rounded-xl bg-[#fff0f2] px-4 py-3 text-sm font-semibold text-[#a61e37]">{message}</p>}
        {!isSupabaseConfigured&&<p className="rounded-xl bg-[#eef4fc] px-4 py-3 text-sm font-semibold text-[#1b4484]">La app está en modo de muestra hasta conectar Supabase.</p>}
        <button className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f63b8] to-[#1b4484] px-4 font-bold text-white shadow-[0_10px_24px_rgba(47,99,184,.25)] disabled:opacity-60" disabled={loading}><KeyRound size={19}/>{loading?'Ingresando…':isSupabaseConfigured?'Ingresar':'Ver demostración'}</button>
      </form>
      <p className="mt-7 text-center text-sm text-[#5f6f86]">Acceso exclusivo para líderes y evangelizadores.</p>
    </section>
  </main>;
}
