import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import WebMcpRegistration from '@/components/pwa/WebMcpRegistration';

export const metadata: Metadata = {
  title: { default: 'IPUIC Casa de Oración Pereira · Territorio', template: '%s · IPUIC Casa de Oración Pereira' },
  description: 'Gestión privada del territorio de evangelización de IPUIC Casa de Oración Pereira.',
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}<ServiceWorkerRegistration /><WebMcpRegistration /></body>
    </html>
  );
}
