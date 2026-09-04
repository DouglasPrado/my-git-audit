import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@/styles/global.css';

/**
 * As faces vêm do bundle da skill `resend-design`, servidas do próprio domínio.
 * Não há Google Fonts aqui de propósito: a skill entrega os arquivos e manda
 * declará-los localmente — o que também elimina uma conexão de terceiro no
 * caminho crítico e o CLS de troca de face.
 *
 * Três papéis, três famílias, nenhuma mistura fora disso:
 *   Domaine Display Narrow  manchete
 *   Inter (variável 100–900) texto de interface
 *   Commit Mono             cifra, rótulo técnico, evidência
 */
const display = localFont({
  src: [
    { path: './fonts/domaine-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/domaine-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-domaine',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

const text = localFont({
  src: [{ path: './fonts/inter-100.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
});

const mono = localFont({
  src: [{ path: './fonts/commitMono-Regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-commit',
  display: 'swap',
  // Ajuste métrico contra Arial deformaria uma monoespaçada: os dígitos deixam
  // de empilhar durante a troca de face, que é justamente o que a cifra precisa.
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export const metadata: Metadata = {
  title: 'GitHub Profile Auditor',
  description:
    'Veja o que seu GitHub diz sobre você antes que um recrutador ou um engenheiro veja. Auditoria técnica de portfólio, com evidência para cada ponto.',
};

/** Tema único e escuro — a barra do navegador acompanha a chapa. */
export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
