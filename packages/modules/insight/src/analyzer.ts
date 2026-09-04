import type { Facts, RepositoryFacts, Signal } from '@audit/contracts';
import { makeSignal } from '@audit/contracts';
import type { EvidenceId } from '@audit/kernel';
import { isOk } from '@audit/kernel';
import { inputHash, memoryCache, type InterpretationCache } from './cache';
import { buildProfilePack, buildRepositoryPack, type EvidencePack } from './pack';
import type { InterpretationResult, Interpreter, SemanticAnalyzer } from './port';
import { INTERPRETER_VERSION, PROFILE_PROMPT, REPOSITORY_PROMPT } from './prompts';
import { profileInterpretation, repositoryInterpretation } from './schema';

export interface AnalyzerOptions {
  model: string;
  cache?: InterpretationCache;
  /** Chamadas simultâneas. Baixo de propósito: previsível vale mais que rápido. */
  concurrency?: number;
}

/**
 * Converte apelidos devolvidos pelo modelo em EvidenceIds reais.
 *
 * O modelo não vê o id canônico — vê `E1..En` e o schema o restringe a esse
 * conjunto, então ele não consegue inventar referência. Se ainda assim vier
 * vazio, usamos todas as evidências do pacote: a invariante de `makeSignal`
 * exige ao menos uma, e sinal sem evidência é defeito, não caso degradado.
 */
function resolveRefs(pack: EvidencePack, refs: string[]): EvidenceId[] {
  const resolved = refs.map((r) => pack.aliases[r]).filter((x): x is EvidenceId => Boolean(x));
  return resolved.length > 0 ? resolved : Object.values(pack.aliases);
}

export function createAnalyzer(interpreter: Interpreter, opts: AnalyzerOptions): SemanticAnalyzer {
  const cache = opts.cache ?? memoryCache();
  const concurrency = opts.concurrency ?? 4;

  return {
    interpreterVersion: INTERPRETER_VERSION,

    async interpret(facts: Facts, abort?: AbortSignal): Promise<InterpretationResult> {
      const signals: Signal[] = [];
      let degraded = 0;
      let calls = 0;
      let cacheHits = 0;

      const producer = (promptId: string, promptVersion: number) =>
        ({ kind: 'llm', model: opts.model, promptId, promptVersion, temperature: 0, samples: 1 }) as const;

      // ---- Repositórios, em lotes. Uma chamada por repositório devolve os
      // quatro enums de escopo repo — 4 chamadas por repo custariam 4x sem
      // ganho, porque a evidência é a mesma.
      const repos = facts.repositories;
      for (let i = 0; i < repos.length; i += concurrency) {
        const lote = repos.slice(i, i + concurrency);
        const saidas = await Promise.all(
          lote.map(async (repo) => {
            const pack = buildRepositoryPack(repo);
            const key = inputHash(REPOSITORY_PROMPT.id, REPOSITORY_PROMPT.version, pack.sections);
            const hit = cache.get(key);
            if (hit !== undefined) { cacheHits++; return { repo, pack, raw: hit, ok: true as const }; }
            calls++;
            const res = await interpreter.interpretRepository(pack, abort);
            if (!isOk(res)) return { repo, pack, raw: null, ok: false as const };
            cache.set(key, res.value);
            return { repo, pack, raw: res.value, ok: true as const };
          }),
        );

        for (const s of saidas) {
          if (!s.ok) { degraded++; continue; }
          // Saída fora do domínio é ERRO, não algo a reparar (ADR-0004).
          const parsed = repositoryInterpretation(Object.keys(s.pack.aliases)).safeParse(s.raw);
          if (!parsed.success) { degraded++; continue; }
          const v = parsed.data;
          const ev = resolveRefs(s.pack, v.evidenceRefs);
          const subject = { kind: 'repo' as const, owner: s.repo.owner, name: s.repo.name };
          const mk = (code: string, value: string, domain: readonly string[]) =>
            signals.push(
              makeSignal({
                code: `${code}:${s.repo.name}`,
                subject,
                value: { type: 'enum', value, domain },
                confidence: 'low',
                producer: producer(REPOSITORY_PROMPT.id, REPOSITORY_PROMPT.version),
                evidenceIds: ev,
                rationale: v.rationale,
              }),
            );
          mk('README_STRUCTURE', v.structure, ['confuso', 'aceitavel', 'claro', 'exemplar']);
          mk('README_WHAT_AND_WHY', v.whatAndWhy, ['ausente', 'vago', 'claro']);
          mk('ARCHITECTURE_DOC_SUBSTANTIVE', v.architecture, ['superficial', 'componentes', 'fronteiras']);
          mk('COMMIT_MESSAGE_QUALITY', v.commitQuality, ['ruim', 'aceitavel', 'bom', 'exemplar']);
        }
      }

      // ---- Perfil: uma chamada, dois enums de nota mais a narrativa.
      let profileNarrative: InterpretationResult['profileNarrative'] = null;
      const pPack = buildProfilePack(facts);
      const pKey = inputHash(PROFILE_PROMPT.id, PROFILE_PROMPT.version, pPack.sections);
      const pHit = cache.get(pKey);
      let pRaw: unknown = pHit;
      if (pHit === undefined) {
        calls++;
        const res = await interpreter.interpretProfile(pPack, abort);
        pRaw = isOk(res) ? res.value : null;
        if (pRaw !== null) cache.set(pKey, pRaw);
      } else {
        cacheHits++;
      }

      const pParsed = pRaw === null ? null : profileInterpretation(Object.keys(pPack.aliases)).safeParse(pRaw);
      if (pParsed?.success) {
        const v = pParsed.data;
        const ev = resolveRefs(pPack, v.evidenceRefs);
        const subject = { kind: 'profile' as const, login: facts.profile.login };
        signals.push(
          makeSignal({
            code: 'PROFILE_README_SUBSTANCE',
            subject,
            value: { type: 'enum', value: v.readmeSubstance, domain: ['ausente', 'generico', 'especifico', 'diferenciado'] },
            confidence: 'low',
            producer: producer(PROFILE_PROMPT.id, PROFILE_PROMPT.version),
            evidenceIds: ev,
            rationale: v.rationale,
          }),
          makeSignal({
            code: 'PROFILE_BIO_SPECIFICITY',
            subject,
            value: { type: 'enum', value: v.bioSpecificity, domain: ['generico', 'papel', 'especializacao'] },
            confidence: 'low',
            producer: producer(PROFILE_PROMPT.id, PROFILE_PROMPT.version),
            evidenceIds: ev,
            rationale: v.rationale,
          }),
        );
        profileNarrative = {
          primaryArea: v.primaryArea,
          secondaryAreas: v.secondaryAreas,
          identityClarity: v.identityClarity,
          rationale: v.rationale,
        };
      } else {
        degraded++;
      }

      return { signals, profileNarrative, degraded, interpreterVersion: INTERPRETER_VERSION, usage: { calls, cacheHits } };
    },
  };
}

export const _unusedRepositoryFacts = null as unknown as RepositoryFacts;
