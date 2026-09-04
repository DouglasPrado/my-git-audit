/**
 * Scan de linha de comando. Existe para validar o pipeline inteiro contra a API
 * real sem depender da interface: coleta → fatos → nota → trilha.
 *
 *   GITHUB_TOKEN=$(gh auth token) node tools/scan.ts octo-example senior-engineer
 */
import { collect, GitHubClient, messageFor } from '../packages/modules/collection/src/index.ts';
import { assertTrailBalances, rubricV1, score, validateRubric } from '../packages/modules/scoring/src/index.ts';
import { asInstant, type Clock } from '../packages/shared/kernel/src/index.ts';
import { CATEGORIES, CATEGORY_LABEL } from '../packages/shared/contracts/src/index.ts';
import { recommend } from '../packages/modules/reporting/src/index.ts';
import type { PersonaId } from '../packages/modules/scoring/src/rubric/types.ts';

const token = process.env['GITHUB_TOKEN'];
if (!token) { console.error('Defina GITHUB_TOKEN. Ex.: GITHUB_TOKEN=$(gh auth token)'); process.exit(1); }

const login = process.argv[2] ?? 'octo-example';
const persona = (process.argv[3] ?? 'general') as PersonaId;

const violations = validateRubric(rubricV1);
if (violations.length) { console.error('Rubrica inválida:', violations); process.exit(1); }

const clock: Clock = { now: () => asInstant(new Date().toISOString()) };
const client = new GitHubClient({ token });

const started = Date.now();
const facts = await collect(login, client, clock, (e) => {
  if (e.type === 'repository.analyzed') process.stdout.write(`\r  analisando ${e.index}/${e.total} — ${e.name}`.padEnd(70));
  else if (e.type === 'repositories.selected') console.log(`  ${e.selected} selecionados de ${e.total}, ${e.excluded} excluídos`);
  else if (e.type === 'scan.degraded') console.log(`  degradado em ${e.stage}: ${e.reason}`);
});
if (!facts.ok) { console.error("\n" + messageFor(facts.error)); console.error(JSON.stringify(facts.error, null, 2)); process.exit(1); }
const elapsed = Date.now() - started;
console.log(`\r  coleta concluída em ${(elapsed / 1000).toFixed(1)}s`.padEnd(70));

const out = score(facts.value, rubricV1, persona);
for (const c of CATEGORIES) assertTrailBalances(out.categories[c]);

const bar = (n: number) => '█'.repeat(Math.round(n / 10)) + '░'.repeat(10 - Math.round(n / 10));
console.log(`\n${'═'.repeat(64)}`);
console.log(`  ${facts.value.profile.name ?? login}${' '.repeat(Math.max(1, 42 - (facts.value.profile.name ?? login).length))}${out.overall.toFixed(0)} / 100`);
console.log(`  como ${out.personaLabel}`);
console.log('═'.repeat(64));
for (const c of CATEGORIES) {
  const cs = out.categories[c];
  const warn = cs.confidenceMix.low > 0.3 ? '  ⚠ parcialmente interpretado' : '';
  console.log(`  ${CATEGORY_LABEL[c].padEnd(22)} ${bar(cs.score)} ${cs.score.toFixed(0).padStart(3)}${warn}`);
}
console.log(`\n  Outras leituras: ${Object.entries(out.allPersonaOverall).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

console.log(`\n${'─'.repeat(64)}\n  Repositórios\n${'─'.repeat(64)}`);
for (const r of [...out.repoScores].sort((a, b) => b.score - a.score)) {
  console.log(`  ${r.name.padEnd(26)} ${r.score.toFixed(0).padStart(3)}  ${r.band.padEnd(7)} ${r.projectType}`);
}
if (out.excluded.length) console.log(`\n  Excluídos: ${out.excluded.slice(0, 6).map((e) => `${e.name} (${e.reason})`).join(', ')}${out.excluded.length > 6 ? ` e mais ${out.excluded.length - 6}` : ''}`);

const worst = [...CATEGORIES].sort((a, b) => out.categories[a].score - out.categories[b].score)[0]!;
console.log(`\n${'─'.repeat(64)}\n  Trilha de ${CATEGORY_LABEL[worst]} — ${out.categories[worst].score}\n${'─'.repeat(64)}`);
for (const k of out.categories[worst].contributions) {
  const sign = k.points >= 0 ? '+' : '−';
  console.log(`  ${sign}${Math.abs(k.points).toFixed(1).padStart(5)}  ${k.label.slice(0, 52)}`);
}
for (const cap of out.categories[worst].caps) {
  console.log(`  [cap ${cap.capId}] teto ${cap.ceiling}, ${cap.binding ? `limitando (−${Math.abs(cap.delta)})` : 'ativo mas não limitante'}`);
}
console.log();

const recs = recommend(facts.value, rubricV1, persona, out);
console.log(`${'─'.repeat(64)}\n  Maior impacto\n${'─'.repeat(64)}`);
for (const r of recs.highestImpact.slice(0, 6)) {
  console.log(`  +${r.estimatedGain.overallDelta.toFixed(1).padStart(4)}  [${r.effort}] ${r.action.slice(0, 66)}`);
}
if (recs.topThreeTogether) {
  const t3 = recs.topThreeTogether;
  console.log(`\n  Fazendo as três primeiras juntas: ${t3.from} → ${t3.to}  (+${t3.delta})`);
  console.log(`  A soma individual daria +${recs.highestImpact.slice(0, 3).reduce((a, r) => a + r.estimatedGain.overallDelta, 0).toFixed(1)} — ganhos não são aditivos.`);
}
console.log();
