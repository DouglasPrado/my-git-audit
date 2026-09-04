/** Falha inesperada, convertida na borda. Nunca carrega token nem segredo. */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }
}

/** Invariante de domínio. Lançar aqui é defeito de programação, não caso de uso. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AppError(message, 'INVARIANT_VIOLATED');
}
