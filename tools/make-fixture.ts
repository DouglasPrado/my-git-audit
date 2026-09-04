/** Congela os fatos de um perfil real como fixture. Nenhum teste chama a rede. */
import { writeFileSync } from 'node:fs';
import { collect, GitHubClient } from '../packages/modules/collection/src/index.ts';
import { asInstant, canonicalJson, type Clock } from '../packages/shared/kernel/src/index.ts';

const login = process.argv[2] ?? 'octo-example';
const out = process.argv[3] ?? `packages/modules/scoring/src/__tests__/fixtures/example-profile.json`;
// Relógio FIXO: a fixture não pode envelhecer sozinha e mover as notas de recência.
const clock: Clock = { now: () => asInstant('2026-09-04T18:00:00.000Z') };
const r = await collect(login, new GitHubClient({ token: process.env['GITHUB_TOKEN']! }), clock);
if (!r.ok) { console.error(r.error); process.exit(1); }
writeFileSync(out, JSON.stringify(JSON.parse(canonicalJson(r.value)), null, 1));
console.log(`fixture: ${out} (${r.value.repositories.length} repositórios)`);
