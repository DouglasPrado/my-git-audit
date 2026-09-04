'use client';

import { Alert, AlertDescription, Button, Input, Label, ToggleGroup, ToggleGroupItem } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const PERSONAS = [
  { id: 'general', label: 'Engenheiro em geral' },
  { id: 'recruiter', label: 'Recrutador' },
  { id: 'senior-engineer', label: 'Engenheiro sênior' },
  { id: 'staff-engineer', label: 'Staff engineer' },
  { id: 'oss-maintainer', label: 'Mantenedor de OSS' },
  { id: 'freelancer', label: 'Freelancer' },
] as const;

export function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [persona, setPersona] = useState<string>('general');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ githubUrl: url, persona }),
    });
    const body = (await res.json()) as { evaluationId?: string; message?: string };
    if (!res.ok || !body.evaluationId) {
      setError(body.message ?? 'Não consegui iniciar a auditoria.');
      return;
    }
    startTransition(() => router.push(`/r/${body.evaluationId}`));
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="url" className="sr-only">
          Perfil do GitHub
        </Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/seu-usuario"
          autoComplete="off"
          spellCheck={false}
          className="figure h-12 min-w-0 flex-1 text-[0.9375rem]"
        />
        <Button
          type="submit"
          size="lg"
          disabled={pending || url.trim().length === 0}
          /* O estado desabilitado padrão fantasma o botão primário com opacidade,
             e sobre papel claro isso vira um bloco cinza com o rótulo ilegível.
             Aqui ele vira superfície neutra com texto apagado: continua legível,
             e comunica "ainda não" em vez de "quebrado". */
          className="h-12 px-7 disabled:bg-paper-sunken disabled:text-ink-faint disabled:opacity-100"
        >
          {pending ? 'Abrindo…' : 'Auditar'}
        </Button>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
          Avaliar como — altera o peso das categorias, não os fatos coletados
        </legend>
        <ToggleGroup
          type="single"
          value={persona}
          onValueChange={(v) => v && setPersona(v)}
          variant="outline"
          size="sm"
          spacing={2}
          className="flex-wrap justify-start"
        >
          {PERSONAS.map((p) => (
            <ToggleGroupItem key={p.id} value={p.id} aria-label={p.label} className="text-[0.8125rem]">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
