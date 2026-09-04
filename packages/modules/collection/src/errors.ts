export type CollectError =
  | { kind: 'user_not_found'; login: string }
  | { kind: 'is_organization'; login: string }
  | { kind: 'no_public_repos'; login: string }
  | { kind: 'invalid_url'; input: string }
  | { kind: 'rate_limited'; resetAt: string | null }
  | { kind: 'token_invalid' }
  | { kind: 'upstream_unavailable'; status: number; detail?: string | undefined };

/**
 * `is_organization` e `no_public_repos` são RESULTADOS legítimos do domínio, não
 * falhas. Perfil de organização não tem bio e a categoria Positioning inteira
 * perde sentido — pontuar uma casca vazia seria pior que recusar.
 */
export const messageFor = (e: CollectError): string => {
  switch (e.kind) {
    case 'user_not_found': return `Não existe a conta \`${e.login}\` no GitHub.`;
    case 'is_organization': return `\`${e.login}\` é uma organização. Por enquanto só avaliamos perfis de pessoa.`;
    case 'no_public_repos': return `\`${e.login}\` não tem nenhum repositório público para avaliar.`;
    case 'invalid_url': return `Não reconheci "${e.input}" como um perfil do GitHub.`;
    case 'rate_limited': return `Limite da API do GitHub atingido${e.resetAt ? `, liberado em ${e.resetAt}` : ''}.`;
    case 'token_invalid': return 'A conexão com o GitHub expirou. Entre novamente para continuar.';
    case 'upstream_unavailable': return `O GitHub respondeu ${e.status}. Tente de novo em instantes.`;
  }
};

export const isRetryable = (e: CollectError): boolean =>
  e.kind === 'rate_limited' || e.kind === 'upstream_unavailable';
