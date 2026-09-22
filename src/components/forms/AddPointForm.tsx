'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, ImagePlus, LoaderCircle, MapPin, Users } from 'lucide-react';
import { compressPhoto } from '@/lib/imageUtils';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PointType } from '@/lib/mapData';
import {queuePoint} from '@/lib/offlinePoints';

const MAX_PHOTOS = 6;

export default function AddPointForm({
  coordinate,
  onSaved,
}: {
  coordinate: [number, number] | null;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<PointType>('hermano_verde');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const isWorshipPlace = tipo === 'culto_azul';

  const originalSize = useMemo(
    () => photos.reduce((total, photo) => total + photo.size, 0),
    [photos],
  );

  function selectPhotos(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length > MAX_PHOTOS) {
      setStatus(`Puedes agregar máximo ${MAX_PHOTOS} fotos por registro.`);
      setPhotos(selected.slice(0, MAX_PHOTOS));
      return;
    }
    setStatus('');
    setPhotos(selected);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!coordinate) {
      setStatus('Primero selecciona un lugar en el mapa.');
      return;
    }
    if (!isSupabaseConfigured) {
      setStatus('Falta conectar Supabase. El formulario está listo, pero todavía no puede guardar datos reales.');
      return;
    }

    setBusy(true);
    setStatus(photos.length ? 'Comprimiendo fotos en este dispositivo…' : 'Guardando punto…');
    const supabase = getSupabase();
    const uploadedPaths: string[] = [];
    let newPointId: string | null = null;

    try {
      if(!navigator.onLine){
        const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Tu sesión terminó. Vuelve a ingresar.');
        const compressed:File[]=[];for(const photo of photos)compressed.push(await compressPhoto(photo));
        await queuePoint({id:crypto.randomUUID(),cultoId:crypto.randomUUID(),owner:session.user.id,tipo,name:name.trim(),address:address.trim(),phone:phone.trim(),coordinate,date,attendees:Number(attendees),notes,photos:compressed});
        setStatus('Guardado en este dispositivo. Se enviará al recuperar internet.');setName('');setAddress('');setPhone('');setPhotos([]);return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tu sesión terminó. Vuelve a ingresar.');

      const compressedPhotos: File[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        setStatus(`Comprimiendo foto ${index + 1} de ${photos.length}…`);
        compressedPhotos.push(await compressPhoto(photos[index]));
      }

      setStatus('Guardando lugar en el mapa…');
      const { data: point, error: pointError } = await supabase
        .from('puntos_mapa')
        .insert({
          tipo,
          nombre_identificador: name.trim(),
          direccion: address.trim(),
          telefono: phone.trim() || null,
          coordenada: `POINT(${coordinate[1]} ${coordinate[0]})`,
          creado_por: user.id,
        })
        .select('id')
        .single();
      if (pointError || !point) throw pointError ?? new Error('No se creó el punto.');
      newPointId = point.id;

      const photoUrls: string[] = [];
      for (let index = 0; index < compressedPhotos.length; index += 1) {
        setStatus(`Subiendo foto ${index + 1} de ${compressedPhotos.length}…`);
        const photo = compressedPhotos[index];
        const path = isWorshipPlace
          ? `${point.id}/${date}/${photo.name}`
          : `puntos/${point.id}/${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-cultos')
          .upload(path, photo, { contentType: 'image/webp', upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        photoUrls.push(supabase.storage.from('fotos-cultos').getPublicUrl(path).data.publicUrl);
      }

      if (isWorshipPlace) {
        setStatus('Guardando la información del culto…');
        const { error: worshipError } = await supabase.from('historial_cultos').insert({
          punto_id: point.id,
          fecha_culto: date,
          asistentes: Number(attendees),
          notas: notes.trim() || null,
          fotos_urls: photoUrls,
        });
        if (worshipError) throw worshipError;
      } else if (photoUrls.length) {
        setStatus('Guardando las fotos…');
        const { error: photosError } = await supabase
          .from('puntos_mapa')
          .update({ fotos_urls: photoUrls })
          .eq('id', point.id);
        if (photosError) throw photosError;
      }

      onSaved();
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from('fotos-cultos').remove(uploadedPaths);
      }
      if (newPointId) {
        await supabase.from('puntos_mapa').delete().eq('id', newPointId);
      }
      setStatus(error instanceof Error && error.message.includes('sesión')
        ? error.message
        : 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="flex items-center gap-2 rounded-xl bg-[#eef4fc] px-3 py-3 text-sm text-[#334c70]">
        <MapPin size={18} />
        {coordinate ? `${coordinate[0].toFixed(6)}, ${coordinate[1].toFixed(6)}` : 'Ubicación pendiente'}
      </div>

      <label className="block text-sm font-bold">
        Tipo
        <select
          className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] bg-white px-3"
          value={tipo}
          onChange={(event) => {
            setTipo(event.target.value as PointType);
            setStatus('');
          }}
        >
          <option value="hermano_verde">Hermano que asiste</option>
          <option value="amigo_rojo">Amigo o contacto</option>
          <option value="culto_azul">Lugar de culto</option>
        </select>
      </label>

      <label className="block text-sm font-bold">
        {isWorshipPlace ? 'Nombre del lugar o familia anfitriona' : 'Nombre o identificador'}
        <input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-3" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
      </label>

      <label className="block text-sm font-bold">
        Dirección
        <input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-3" required maxLength={180} value={address} onChange={(event) => setAddress(event.target.value)} />
      </label>

      <label className="block text-sm font-bold">
        Teléfono <span className="font-normal text-[#5f6f86]">(opcional)</span>
        <input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] px-3" type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>

      {!isWorshipPlace && (
        <label className="focus-ring flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#a9bad3] bg-[#f8faf8] px-4 text-center text-sm font-bold text-[#334c70]">
          <span className="flex items-center gap-2"><ImagePlus size={20} /> {photos.length ? `${photos.length} foto(s) seleccionada(s)` : tipo === 'hermano_verde' ? 'Agregar fotos del hermano' : 'Agregar fotos del amigo'}</span>
          <small className="font-normal text-[#5f6f86]">Se comprimen a WebP, máximo 300 KB y 1280 px</small>
          {photos.length > 0 && <small className="font-normal text-[#5f6f86]">Originales: {(originalSize / 1024 / 1024).toFixed(1)} MB</small>}
          <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => selectPhotos(event.target.files)} />
        </label>
      )}

      {isWorshipPlace && (
        <fieldset className="space-y-4 rounded-2xl border border-[#cfd9e8] bg-[#f8faf8] p-4">
          <legend className="px-2 text-sm font-black text-[#2f63b8]">Datos del primer culto</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">
              <span className="flex items-center gap-1.5"><CalendarDays size={16} /> Fecha</span>
              <input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] bg-white px-3" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="block text-sm font-bold">
              <span className="flex items-center gap-1.5"><Users size={16} /> Asistentes</span>
              <input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-[#cfd9e8] bg-white px-3" type="number" inputMode="numeric" min="0" required value={attendees} onChange={(event) => setAttendees(event.target.value)} />
            </label>
          </div>
          <label className="block text-sm font-bold">
            Notas <span className="font-normal text-[#5f6f86]">(opcional)</span>
            <textarea className="focus-ring mt-2 min-h-24 w-full resize-y rounded-xl border border-[#cfd9e8] bg-white p-3" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="focus-ring flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#a9bad3] bg-white px-4 text-center text-sm font-bold text-[#334c70]">
            <span className="flex items-center gap-2"><ImagePlus size={20} /> {photos.length ? `${photos.length} foto(s) seleccionada(s)` : 'Agregar fotos del culto'}</span>
            <small className="font-normal text-[#5f6f86]">Se comprimen a WebP, máximo 300 KB y 1280 px</small>
            {photos.length > 0 && <small className="font-normal text-[#5f6f86]">Originales: {(originalSize / 1024 / 1024).toFixed(1)} MB</small>}
            <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => selectPhotos(event.target.files)} />
          </label>
        </fieldset>
      )}

      {status && <p role="alert" aria-live="polite" className="rounded-xl bg-[#fff0f2] p-3 text-sm font-semibold text-[#a61e37]">{status}</p>}
      <button className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f63b8] px-4 font-bold text-white disabled:opacity-60" disabled={busy}>
        {busy && <LoaderCircle className="animate-spin" size={18} />}
        {busy ? 'Guardando…' : isWorshipPlace ? 'Guardar lugar y culto' : 'Guardar punto'}
      </button>
    </form>
  );
}
