import { evidenceId, subjectKey } from '@audit/contracts';
import type { Grader } from '../rubric/types';
import { band, bandDesc, readmeMetrics, result } from './helpers';

const pKey = (login: string) => subjectKey({ kind: 'profile', login });
const pev = (login: string, kind: Parameters<typeof evidenceId>[1], sel: string) =>
  evidenceId(pKey(login), kind, sel);

/**
 * A armadilha mais grave do catálogo. O coletor resolve o README a partir da
 * árvore, case-insensitive — `README.MD` maiúsculo existe e é comum. Se o
 * repositório de perfil nem existe, a mensagem é outra: "não há repositório de
 * Profile README", nunca "README ausente". Situações diferentes, ações diferentes.
 */
export const PROFILE_README_PRESENT: Grader = ({ facts }) => {
  const p = facts.profile;
  const id = pev(p.login, 'tree.entry', 'profile-readme');
  if (p.profileReadme) {
    return result(1, `Profile README em \`${p.profileReadme.path}\``, [id]);
  }
  if (!p.profileReadmeRepoExists) {
    return result(0, `Não existe o repositório de perfil \`${p.login}/${p.login}\``, [id]);
  }
  return result(0, `O repositório \`${p.login}/${p.login}\` existe, mas não tem README`, [id]);
};

export const PROFILE_README_STRUCTURE: Grader = ({ facts }) => {
  const p = facts.profile;
  const id = pev(p.login, 'derived.metric', 'profile-readme.structure');
  if (!p.profileReadme) return result(0, 'Sem Profile README para avaliar', [id]);
  const m = readmeMetrics(p.profileReadme);
  let g = 0;
  if (m.words >= 40) g += 0.35;
  if (m.headings >= 2) g += 0.25;
  if (m.links >= 3) g += 0.25;
  if (m.proseParagraphs >= 1) g += 0.15;
  return result(
    Math.min(1, g),
    `${m.words} palavras, ${m.headings} títulos, ${m.links} links`,
    [id],
  );
};

export const PROFILE_BIO_PRESENT: Grader = ({ facts }) => {
  const p = facts.profile;
  const id = pev(p.login, 'profile.field', 'bio');
  if (!p.bio) return result(0, 'Sem bio', [id]);
  return result(p.bio.trim().length >= 20 ? 1 : 0.5, `Bio com ${p.bio.trim().length} caracteres`, [id]);
};

/** Identidade profissional visível. Avatar padrão NÃO é detectável no Quick Scan. */
export const PROFILE_IDENTITY_COMPLETE: Grader = ({ facts }) => {
  const p = facts.profile;
  const present = [p.name, p.location, p.company].filter(Boolean).length;
  return result(
    present / 3,
    `${present} de 3 campos de identidade preenchidos (nome, localização, empresa)`,
    [pev(p.login, 'profile.field', 'identity')],
  );
};

export const PROFILE_CONTACT_CHANNELS: Grader = ({ facts }) => {
  const p = facts.profile;
  const n = (p.websiteUrl ? 1 : 0) + p.socialAccounts + (p.email ? 1 : 0);
  return result(
    bandDesc(n, [[2, 1], [1, 0.5], [0, 0]]),
    `${n} canal(is) de contato público(s)`,
    [pev(p.login, 'profile.field', 'contact')],
  );
};

/**
 * Coerência é DETERMINÍSTICA de propósito: índice de concentração sobre topics e
 * linguagens. O modelo escreve a narrativa; o índice dá a nota. Sem isso o peso
 * de LLM em POS estouraria o teto de 40%.
 */
export const PORTFOLIO_COHERENCE: Grader = ({ facts }) => {
  const { topicConcentration: t, languageConcentration: l } = facts.portfolio;
  const c = t * 0.6 + l * 0.4;
  const id = evidenceId(subjectKey({ kind: 'portfolio', login: facts.profile.login }), 'derived.metric', 'coherence');
  return result(
    Math.min(1, c / 0.45),
    `Concentração de topics ${t.toFixed(2)}, de linguagens ${l.toFixed(2)}`,
    [id],
    { confidence: facts.repositories.length >= 3 ? 'high' : 'medium' },
  );
};

/** Slots interpretativos: sem sinal de LLM, viram neutro de baixa confiança. */
function interpretive(code: string, enumToGrade: Record<string, number>, label: string): Grader {
  return ({ facts, signals }) => {
    const id = pev(facts.profile.login, 'derived.metric', code.toLowerCase());
    const s = signals.get(code);
    if (!s || s.value.type !== 'enum') {
      return result(0.5, `${label} não avaliado — análise semântica indisponível`, [id], {
        confidence: 'low',
        reason: 'sem análise semântica',
      });
    }
    return result(enumToGrade[s.value.value] ?? 0.5, `${label}: ${s.value.value}`, s.evidenceIds.length ? s.evidenceIds : [id], {
      confidence: 'low',
    });
  };
}

export const PROFILE_README_SUBSTANCE = interpretive(
  'PROFILE_README_SUBSTANCE',
  { ausente: 0, generico: 0.3, especifico: 0.75, diferenciado: 1 },
  'Substância do Profile README',
);

export const PROFILE_BIO_SPECIFICITY = interpretive(
  'PROFILE_BIO_SPECIFICITY',
  { generico: 0.25, papel: 0.6, especializacao: 1 },
  'Especificidade da bio',
);

export const _band = band;
