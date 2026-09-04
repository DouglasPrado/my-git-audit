'use client';

import { Alert, AlertDescription, Button } from '@/components/ui';
import { useCallback, useEffect, useState } from 'react';
import { Ledger, type CategoryRow } from './Ledger';
import { PersonaReadings } from './PersonaReadings';
import { Progress } from './Progress';
import { Recommendations } from './Recommendations';
import { RepoTable } from './RepoTable';
import { Figure } from './Figure';

const CATEGORY_LABEL: Record<string, string> = {
  ENG: 'Engineering Signals',
  POS: 'Positioning',
  CUR: 'Portfolio Curation',
  PRE: 'Project Presentation',
  OSS: 'Open Source Maturity',
  MNT: 'Maintenance',
  HYG: 'Professional Hygiene',
  DIS: 'Discoverability',
};

const EVENT_COPY: Record<string, (e: Record<string, unknown>) => string> = {
  'scan.started': (e) => `Resolvendo ${String(e['login'])}`,
  'repositories.selected': (e) => `${e['selected']} repositórios selecionados de ${e['total']}`,
  'repository.analyzed': (e) => `Analisando ${e['index']}/${e['total']} — ${String(e['name'])}`,
  'profile.collected': (e) => (e['hasProfileReadme'] ? 'Profile README encontrado' : 'Perfil sem README'),
  'static.completed': (e) => `Evidências coletadas em ${e['repositories']} repositórios`,
  'scoring.completed': () => 'Calculando a nota',
  'scan.degraded': (e) => `Seguindo com menos confiança — ${String(e['reason'])}`,
};

interface ReportData {
  login: string;
  profile: { name: string | null; bio: string | null; totalRepos: number };
  scanAt: string;
  score: {
    overall: number;
    personaId: string;
    personaLabel: string;
    weights: Record<string, number>;
    categories: Record<string, CategoryRow & { math: { earned: number } }>;
    allPersonaOverall: Record<string, number>;
    repoScores: { name: string; projectType: string; score: number; band: 'Strong' | 'Solid' | 'Thin' }[];
    excluded: { name: string; reason: string }[];
  };
  recommendations: {
    highestImpact: Parameters<typeof Recommendations>[0]['highestImpact'];
    quickWins: Parameters<typeof Recommendations>[0]['quickWins'];
    topThreeTogether: Parameters<typeof Recommendations>[0]['together'];
  };
}

export function Report({ id }: { id: string }) {
  const [lines, setLines] = useState<string[]>(['Iniciando auditoria']);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [login, setLogin] = useState('');
  // Trocar de público não é um scan novo — as barras não devem re-animar como se fosse.
  const [settled, setSettled] = useState(false);

  const load = useCallback(
    async (persona?: string) => {
      const qs = persona ? `?persona=${persona}` : '';
      const res = await fetch(`/api/evaluations/${id}/report${qs}`);
      if (res.ok) {
        setData((await res.json()) as ReportData);
        return true;
      }
      if (res.status === 422) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? 'A auditoria falhou.');
        return true;
      }
      if (res.status === 404) {
        // Enquanto PERSISTENCE for um Map em processo, reiniciar o servidor
        // apaga a avaliação. Ficar girando para sempre seria pior que dizer isso.
        setError('Esta auditoria não existe mais. Rode uma nova — os resultados ainda não são guardados entre reinícios do servidor.');
        return true;
      }
      return false;
    },
    [id],
  );

  useEffect(() => {
    const es = new EventSource(`/api/evaluations/${id}/events`);
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data) as Record<string, unknown> & { type: string };
      if (e.type === 'scan.started') setLogin(String(e['login']));
      if (e.type === 'scan.failed') {
        setError(String(e['message'] ?? 'A auditoria falhou.'));
        es.close();
        return;
      }
      if (e.type === 'report.completed') {
        void load();
        es.close();
        return;
      }
      const copy = EVENT_COPY[e.type];
      if (copy) setLines((prev) => [...prev.slice(-9), copy(e)]);
    };
    es.onerror = () => {
      es.close();
      // Nunca deixar o usuário preso na tela de progresso: se o stream cai,
      // pergunta ao relatório qual é a verdade.
      void load();
    };
    return () => es.close();
  }, [id, load]);

  if (error) {
    return (
      <main className="mx-auto max-w-(--container-prose) px-5 py-24">
        <Alert variant="destructive">
          <AlertDescription className="text-[0.9375rem]">{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <a href="/">Auditar outro perfil</a>
        </Button>
      </main>
    );
  }

  if (!data) return <Progress login={login || '…'} lines={lines} />;

  const rows: CategoryRow[] = Object.entries(data.score.categories)
    .map(([key, c]) => ({ ...c, label: CATEGORY_LABEL[key] ?? key, weight: data.score.weights[key] ?? 0 }))
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));

  return (
    <main className="mx-auto max-w-(--container-sheet) px-5 py-14 sm:py-16">
      <a href="/" className="figure text-[0.75rem] uppercase tracking-[0.1em] text-ink-soft hover:text-ink">
        ← Profile Auditor
      </a>

      <header className="mt-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h1 className="text-display font-semibold tracking-[-0.02em]">{data.profile.name ?? data.login}</h1>
          <p className="figure mt-1 text-[0.875rem] text-ink-soft">
            {data.login} · <Figure value={data.profile.totalRepos} /> repositórios próprios
          </p>
        </div>
        <div className="text-left sm:text-right">
          <Figure value={data.score.overall} decimals={0} className="block text-figure font-semibold" />
          {/* Um score NUNCA aparece sem o rótulo da persona que o produziu. */}
          <p className="figure mt-1 text-[0.75rem] uppercase tracking-[0.08em] text-ink-soft">
            de 100 · como {data.score.personaLabel}
          </p>
        </div>
      </header>

      <PersonaReadings
        readings={data.score.allPersonaOverall}
        current={data.score.personaId}
        onSelect={(p) => { setSettled(true); void load(p); }}
      />

      <section className="mt-14">
        <h2 className="mb-4 text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
          Como a nota se compõe — clique numa categoria para ver a conta
        </h2>
        <Ledger rows={rows} animate={!settled} />
      </section>

      <Recommendations
        highestImpact={data.recommendations.highestImpact}
        quickWins={data.recommendations.quickWins}
        together={data.recommendations.topThreeTogether}
      />

      <RepoTable repos={data.score.repoScores} excluded={data.score.excluded} />

      <footer className="mt-20 rule-t pt-6 text-[0.75rem] text-ink-faint">
        <p>
          Rubrica v1.0.0 · auditado em {new Date(data.scanAt).toLocaleString('pt-BR')}. Esta nota mede o
          GitHub como artefato profissional, não capacidade de engenharia.
        </p>
      </footer>
    </main>
  );
}
