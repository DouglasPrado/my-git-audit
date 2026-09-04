import { z } from 'zod';

/**
 * Os domínios de enum são o CONTRATO com os graders: cada valor tem uma nota
 * fixa na rubrica (`docs/rubric/rubric-v1.md` §9). Mudar um valor aqui sem mudar
 * o mapa do grader faz o sinal cair silenciosamente em 0.5.
 *
 * Nenhum campo numérico, de propósito. Um modelo nunca emite valor que entre na
 * conta — ADR-0004.
 */
export const READMR_SUBSTANCE = ['ausente', 'generico', 'especifico', 'diferenciado'] as const;
export const BIO_SPECIFICITY = ['generico', 'papel', 'especializacao'] as const;
export const README_STRUCTURE = ['confuso', 'aceitavel', 'claro', 'exemplar'] as const;
export const WHAT_AND_WHY = ['ausente', 'vago', 'claro'] as const;
export const ARCHITECTURE_DEPTH = ['superficial', 'componentes', 'fronteiras'] as const;
export const COMMIT_QUALITY = ['ruim', 'aceitavel', 'bom', 'exemplar'] as const;

/** Referência a evidência: apelido curto, restrito ao que foi enviado. */
const evidenceRef = (aliases: readonly string[]) =>
  z.array(z.enum(aliases as [string, ...string[]])).max(6).default([]);

export const repositoryInterpretation = (aliases: readonly string[]) =>
  z
    .object({
      structure: z.enum(README_STRUCTURE),
      whatAndWhy: z.enum(WHAT_AND_WHY),
      architecture: z.enum(ARCHITECTURE_DEPTH),
      commitQuality: z.enum(COMMIT_QUALITY),
      /** Prosa exibida ao usuário. NUNCA entra em cálculo. */
      rationale: z.string().max(400),
      evidenceRefs: evidenceRef(aliases),
    })
    .strict();

export const profileInterpretation = (aliases: readonly string[]) =>
  z
    .object({
      readmeSubstance: z.enum(READMR_SUBSTANCE),
      bioSpecificity: z.enum(BIO_SPECIFICITY),
      /** O "10 Second Test". Narrativa — não entra na nota. */
      primaryArea: z.string().max(60),
      secondaryAreas: z.array(z.string().max(60)).max(3).default([]),
      identityClarity: z.enum(['confusa', 'razoavel', 'clara', 'inconfundivel']),
      rationale: z.string().max(400),
      evidenceRefs: evidenceRef(aliases),
    })
    .strict();

export type RepositoryInterpretation = z.infer<ReturnType<typeof repositoryInterpretation>>;
export type ProfileInterpretation = z.infer<ReturnType<typeof profileInterpretation>>;
