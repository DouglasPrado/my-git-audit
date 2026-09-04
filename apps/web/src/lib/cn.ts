import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Mesma implementação que o @gba/components expõe, mantida local de propósito:
 * `cn` é função pura, não componente, e por isso NÃO atravessa a fronteira
 * `'use client'` — importá-la de lá quebra qualquer Server Component que a use.
 * A fronteira em `components/ui.ts` exporta componentes; utilidade fica aqui.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
