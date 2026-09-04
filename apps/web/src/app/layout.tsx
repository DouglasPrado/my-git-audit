import type { Metadata } from 'next';
import { Archivo, Spline_Sans_Mono } from 'next/font/google';
import '@/styles/global.css';

const display = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-spline-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GitHub Profile Auditor',
  description:
    'Veja o que seu GitHub diz sobre você antes que um recrutador ou um engenheiro veja. Auditoria técnica de portfólio, com evidência para cada ponto.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
