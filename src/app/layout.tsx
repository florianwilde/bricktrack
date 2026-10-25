import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/archivo';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/inter';
import '@fontsource-variable/nunito';
import '@fontsource-variable/outfit';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker';
import { Toaster } from '@/components/ui/sonner';
import { DESIGN_COOKIE, DESIGN_INFO, resolveDesign } from '@/lib/design';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bricktrack',
    template: '%s · Bricktrack',
  },
  description: 'Sammlung und Wunschlisten für Spielzeug-Sets',
  applicationName: 'Bricktrack',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Bricktrack',
    statusBarStyle: 'default',
  },
  // A private, self-hosted instance never belongs in a search index - and the
  // public wishlist links are meant to be shared, not found.
  robots: { index: false, follow: false },
};

async function currentDesign() {
  return resolveDesign((await cookies()).get(DESIGN_COOKIE)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  const design = await currentDesign();
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: DESIGN_INFO[design].themeColor,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const design = await currentDesign();

  return (
    <html
      lang="de"
      data-design={design}
      className={DESIGN_INFO[design].dark ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
