import type { Instant } from './brand';

/**
 * Capacidades ambientais são injetadas — nunca `new Date()` nem `crypto.randomUUID()`
 * em domínio ou aplicação. Regra 11 de CLAUDE.md. É o que torna o motor de
 * pontuação testável por arquivo golden.
 */
export interface Clock {
  now(): Instant;
}

export interface Ids {
  next(): string;
}
