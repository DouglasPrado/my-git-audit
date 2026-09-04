import type { Persona } from './types';

/** Absolutos, somando 100. Nenhum abaixo de 4 — nenhuma categoria some da explicação. */
export const personas: Persona[] = [
  {
    id: 'general',
    label: 'General Software Engineer',
    weights: { ENG: 20, POS: 15, CUR: 15, PRE: 15, OSS: 10, MNT: 10, HYG: 10, DIS: 5 },
    narrative: 'Avaliação equilibrada entre apresentação e engenharia.',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    weights: { ENG: 12, POS: 22, CUR: 20, PRE: 18, OSS: 6, MNT: 8, HYG: 9, DIS: 5 },
    narrative: 'Prioriza clareza, curadoria e o que se entende em trinta segundos.',
  },
  {
    id: 'senior-engineer',
    label: 'Senior Engineer',
    weights: { ENG: 30, POS: 8, CUR: 12, PRE: 12, OSS: 12, MNT: 14, HYG: 8, DIS: 4 },
    narrative: 'Prioriza testes, CI, documentação técnica e manutenção.',
  },
  {
    id: 'staff-engineer',
    label: 'Staff Engineer',
    weights: { ENG: 26, POS: 14, CUR: 14, PRE: 12, OSS: 12, MNT: 12, HYG: 6, DIS: 4 },
    narrative: 'Prioriza arquitetura, trade-offs e confiabilidade.',
  },
  {
    id: 'oss-maintainer',
    label: 'Open Source Maintainer',
    weights: { ENG: 18, POS: 6, CUR: 6, PRE: 12, OSS: 28, MNT: 20, HYG: 6, DIS: 4 },
    narrative: 'Prioriza licença, releases, processo de contribuição e continuidade.',
  },
  {
    id: 'freelancer',
    label: 'Freelancer',
    weights: { ENG: 12, POS: 24, CUR: 18, PRE: 22, OSS: 5, MNT: 8, HYG: 6, DIS: 5 },
    narrative: 'Prioriza projetos usáveis, demonstração e clareza comercial.',
  },
];
