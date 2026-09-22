import Image from 'next/image';

interface ChurchBrandProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}

export default function ChurchBrand({ compact = false, inverse = false, className = '' }: ChurchBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`${compact ? 'size-10 rounded-xl' : 'size-16 rounded-[1.35rem]'} grid shrink-0 place-items-center bg-gradient-to-br from-[#4f7fd0] to-[#173d7c] shadow-[0_10px_26px_rgba(28,70,137,.28)]`}>
        <Image src="/logo-casa-de-oracion.png" width={3000} height={3000} alt="Logo de IPUIC Casa de Oración Pereira" className={`${compact ? 'size-8' : 'size-13'} object-contain`} priority />
      </span>
      <span className="min-w-0">
        <span className={`block text-[10px] font-extrabold uppercase tracking-[.11em] sm:text-[11px] ${inverse ? 'text-[#b8d0f7]' : 'text-[#2f63b8]'}`}>IPUIC Casa de Oración Pereira</span>
        <span className={`block font-bold leading-tight ${compact ? 'text-base' : 'text-xl'} ${inverse ? 'text-white' : 'text-[#0c2347]'}`}>Territorio de evangelización</span>
      </span>
    </div>
  );
}
