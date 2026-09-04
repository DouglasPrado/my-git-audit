declare const brand: unique symbol;

/** Tipo de marca: impede que um EvidenceId seja passado onde se espera um SignalId. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EvaluationId = Brand<string, 'EvaluationId'>;
export type EvidenceId = Brand<string, 'EvidenceId'>;
export type SignalId = Brand<string, 'SignalId'>;
export type FindingId = Brand<string, 'FindingId'>;

/** Instante ISO-8601 em UTC. Nunca `Date`, para o scoring permanecer puro e serializável. */
export type Instant = Brand<string, 'Instant'>;

export const asInstant = (iso: string): Instant => iso as Instant;
