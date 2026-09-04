import type { Grader } from '../rubric/types';
import { bandDesc, ev, result } from './helpers';

export const REPO_DESCRIPTION: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'repo.field', 'description');
  const d = repo.description?.trim() ?? '';
  if (!d) return result(0, 'Sem descrição — o repositório não se explica em nenhuma listagem', [id]);
  return result(d.length >= 20 ? 1 : 0.4, `Descrição de ${d.length} caracteres`, [id]);
};

export const REPO_TOPICS: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'topic', 'list');
  const n = repo.topics.length;
  return result(bandDesc(n, [[3, 1], [1, 0.5], [0, 0]]), n === 0 ? 'Sem topics — invisível para quem filtra por tecnologia' : `${n} topic(s)`, [id]);
};

export const REPO_HOMEPAGE_URL: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'repo.field', 'homepage');
  if (repo.homepageUrl) return result(1, 'Homepage declarada', [id]);
  if (repo.projectType === 'library' && repo.releasesCount > 0) {
    return result(0.5, 'Biblioteca publicada sem homepage declarada', [id], { confidence: 'medium' });
  }
  return result(0, 'Sem homepage — nada aponta para uma demo ou documentação', [id]);
};
