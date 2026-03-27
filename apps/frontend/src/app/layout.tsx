// Root layout — locale-specific layout lives in app/[locale]/layout.tsx
// This file is required by Next.js but the [locale] segment handles rendering.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navbar } from '@/components/Navbar';
import { Toaster } from '@/components/ui/Toaster';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-storm.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Brain-Storm - Blockchain Education on Stellar',
    template: '%s | Brain-Storm',
  },
  description:
    'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: 'Brain-Storm',
    type: 'website',
    title: 'Brain-Storm - Blockchain Education on Stellar',
    description:
      'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brain-Storm - Blockchain Education on Stellar',
    description:
      'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
