import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bricktrack',
    template: '%s · Bricktrack',
  },
  description: 'Sammlung und Wunschlisten für Spielzeug-Sets',
  applicationName: 'Bricktrack',
  // A private, self-hosted instance never belongs in a search index - and the
  // public wishlist links are meant to be shared, not found.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
