import type { Grader } from '../rubric/types';
import { ev, findEntry, hasEntry, result } from './helpers';

/** `.env.example` e afins são legítimos. `config/credentials.yml.enc` do Rails é criptografado. */
const SECRET_ALLOW = new Set([
  '.env.example', '.env.sample', '.env.template', '.env.dist', '.env.test.example',
  'credentials.yml.enc', '.npmrc.example',
]);
// `.npmrc` e `.pypirc` ficam FORA: são configuração de registry, e a credencial
// mora no arquivo do usuário, não no do projeto. Acusá-los é falso positivo.
const SECRET_NAMES = ['.env', '.env.local', '.env.production', '.env.prod', 'id_rsa', 'id_ed25519', 'credentials.json', '.netrc'];
const SECRET_EXT = /\.(pem|p12|pfx|key|keystore|jks)$/i;

/**
 * A redação importa mais que a detecção. A ferramenta viu um NOME DE ARQUIVO na
 * árvore; ela não leu o conteúdo e não sabe se há segredo lá dentro.
 */
export const SECRETS_SUSPECTED: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'secrets');
  const hits = repo.rootTree
    .filter((e) => e.type === 'blob')
    .map((e) => e.name)
    .filter((n) => !SECRET_ALLOW.has(n.toLowerCase()))
    .filter((n) => SECRET_NAMES.includes(n.toLowerCase()) || SECRET_EXT.test(n));
  if (hits.length === 0) return result(1, 'Nenhum arquivo com nome de credencial versionado', [id]);
  return result(
    hits.length >= 2 ? 0 : 0.2,
    `Arquivo${hits.length > 1 ? 's' : ''} versionado${hits.length > 1 ? 's' : ''}: ${hits.join(', ')} — verifique se não contém segredo`,
    [id],
  );
};

/**
 * `vendor/` é legítimo em Go. `dist/` é legítimo em GitHub Pages e em extensão de
 * navegador. `.DS_Store` é sempre verdadeiro positivo.
 */
export const COMMITTED_ARTIFACTS: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'artifacts');
  const lang = (repo.primaryLanguage ?? '').toLowerCase();
  const type = repo.projectType;
  const always = ['node_modules', '.ds_store', 'thumbs.db', '.idea', '__pycache__'];
  const conditional: string[] = [];
  if (lang !== 'go') conditional.push('vendor');
  if (type !== 'docs' && type !== 'web') conditional.push('dist', 'build');
  if (lang !== 'rust') conditional.push('target');
  if (lang !== 'python') conditional.push('venv', '.venv');

  const hit = (n: string) => findEntry(repo.rootTree, n);
  const hard = always.map(hit).filter(Boolean);
  const soft = conditional.map(hit).filter(Boolean);
  if (hard.length === 0 && soft.length === 0) return result(1, 'Nenhum artefato de build versionado', [id]);
  const names = [...hard, ...soft].map((e) => e!.name);
  if (hard.length > 0) return result(soft.length > 0 ? 0.2 : 0.4, `Versionado no repositório: ${names.join(', ')}`, [id]);
  return result(0.6, `Possível artefato de build versionado: ${names.join(', ')}`, [id], { confidence: 'medium' });
};

export const GITIGNORE_PRESENT: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'gitignore');
  const found = hasEntry(repo.rootTree, '.gitignore');
  return result(found ? 1 : 0, found ? '`.gitignore` presente' : 'Sem `.gitignore`', [id]);
};

/**
 * O mais perigoso do catálogo, e o melhor anti-gaming sem clone. `author.user` é
 * null para e-mail não vinculado, o que é comuníssimo. NUNCA dispara por null.
 */
export const COMMIT_AUTHORSHIP: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'commit.stat', 'authorship');
  if (repo.isFork) return result(0.5, 'Fork — autoria não avaliada', [id], { reason: 'fork' });
  const resolved = repo.commitAuthors.filter((a): a is string => a !== null);
  if (resolved.length === 0) {
    return result(1, 'Autoria não verificável — nenhum commit tem e-mail vinculado a uma conta', [id], {
      confidence: 'low',
      reason: 'autores não resolvidos',
    });
  }
  const owner = repo.owner.toLowerCase();
  const mine = resolved.filter((a) => a.toLowerCase() === owner).length;
  const ratio = mine / resolved.length;
  if (ratio >= 0.5) return result(1, `${Math.round(ratio * 100)}% dos commits resolvidos são do dono do perfil`, [id]);
  return result(0.3, `Apenas ${Math.round(ratio * 100)}% dos commits são do dono — repositório majoritariamente de terceiros`, [id], { confidence: 'medium' });
};
