'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

export default function ChangePasswordForm({ onSaved }: { onSaved: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) { setMessage('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirmation) { setMessage('Las contraseñas no coinciden.'); return; }
    setBusy(true); setMessage('');
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage('No se pudo actualizar la contraseña. Vuelve a iniciar sesión e inténtalo nuevamente.');
    else onSaved();
  }

  const inputClass = 'focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-4 pr-12';
  return <form className="space-y-5" onSubmit={submit}>
    <p className="text-[#5f6f86]">Elige una contraseña de al menos 8 caracteres. El cambio se aplicará en tu próximo inicio de sesión.</p>
    <label className="block text-sm font-bold">Nueva contraseña<span className="relative block"><input className={inputClass} type={show?'text':'password'} autoComplete="new-password" minLength={8} required value={password} onChange={event=>setPassword(event.target.value)} /><button type="button" className="absolute bottom-0 right-0 grid size-12 place-items-center text-[#5f6f86]" onClick={()=>setShow(value=>!value)} aria-label={show?'Ocultar contraseña':'Mostrar contraseña'}>{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>
    <label className="block text-sm font-bold">Confirmar contraseña<input className={inputClass} type={show?'text':'password'} autoComplete="new-password" minLength={8} required value={confirmation} onChange={event=>setConfirmation(event.target.value)} /></label>
    {message&&<p role="alert" className="rounded-xl bg-[#fff0f2] px-4 py-3 text-sm font-semibold text-[#a61e37]">{message}</p>}
    <button className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f63b8] px-4 font-bold text-white disabled:opacity-60" disabled={busy}><KeyRound size={19}/>{busy?'Actualizando…':'Actualizar contraseña'}</button>
  </form>;
}
