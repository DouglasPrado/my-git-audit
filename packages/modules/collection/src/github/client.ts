import { err, ok, type Result } from '@audit/kernel';
import type { CollectError } from '../errors';
import { PHASE1_DISCOVER, buildBlobs, buildDetail } from './queries';

const ENDPOINT = 'https://api.github.com/graphql';
const REST = 'https://api.github.com';

export interface GitHubClientOptions {
  token: string;
  /** Injetável para teste. */
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export class GitHubClient {
  readonly #token: string;
  readonly #fetch: typeof fetch;
  readonly #ua: string;

  constructor(opts: GitHubClientOptions) {
    this.#token = opts.token;
    this.#fetch = opts.fetchImpl ?? fetch;
    this.#ua = opts.userAgent ?? 'my-git-audit/0.1';
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<Result<T, CollectError>> {
    let res: Response;
    try {
      res = await this.#fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          // O token nunca sai daqui: não vai para log, telemetria nem prompt.
          authorization: `bearer ${this.#token}`,
          'content-type': 'application/json',
          'user-agent': this.#ua,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (cause) {
      return err({ kind: 'upstream_unavailable', status: 0, detail: String(cause) });
    }

    if (res.status === 401) return err({ kind: 'token_invalid' });
    if (res.status === 403 || res.status === 429) {
      return err({ kind: 'rate_limited', resetAt: res.headers.get('x-ratelimit-reset') });
    }
    if (!res.ok) return err({ kind: 'upstream_unavailable', status: res.status });

    const body = (await res.json()) as { data?: T; errors?: { type?: string; message: string }[] };
    if (body.errors?.length) {
      const notFound = body.errors.some((e) => e.type === 'NOT_FOUND');
      if (notFound && body.data) return ok(body.data);
      const rate = body.errors.some((e) => e.type === 'RATE_LIMITED');
      if (rate) return err({ kind: 'rate_limited', resetAt: null });
      return err({ kind: 'upstream_unavailable', status: 200, detail: body.errors[0]?.message });
    }
    if (!body.data) return err({ kind: 'upstream_unavailable', status: 200, detail: 'resposta sem data' });
    return ok(body.data);
  }

  discover(login: string, after: string | null = null) {
    return this.graphql<unknown>(PHASE1_DISCOVER, { login, after });
  }

  detail(repos: { alias: string; name: string }[], owner: string, since: string) {
    if (repos.length === 0) return Promise.resolve(ok({} as Record<string, unknown>));
    return this.graphql<Record<string, unknown>>(buildDetail(repos, owner), { since });
  }

  blobs(targets: Parameters<typeof buildBlobs>[0]) {
    if (targets.length === 0) return Promise.resolve(ok({} as Record<string, unknown>));
    return this.graphql<Record<string, unknown>>(buildBlobs(targets));
  }

  /**
   * Perfil público via REST.
   *
   * Existe por causa do e-mail: o campo `email` no GraphQL exige escopo
   * `read:user`, e pedir essa permissão só para checar "tem canal de contato"
   * é uma troca ruim — pior, a query GraphQL inteira falha sem ela. O REST
   * devolve o e-mail PÚBLICO sem escopo extra, e null para quem não publicou.
   */
  async publicProfile(login: string): Promise<Result<{ email: string | null; twitter: string | null }, CollectError>> {
    try {
      const res = await this.#fetch(`${REST}/users/${encodeURIComponent(login)}`, {
        headers: { authorization: `bearer ${this.#token}`, accept: 'application/vnd.github+json', 'user-agent': this.#ua },
      });
      if (res.status === 401) return err({ kind: 'token_invalid' });
      if (!res.ok) return ok({ email: null, twitter: null });
      const body = (await res.json()) as { email?: string | null; twitter_username?: string | null };
      return ok({ email: body.email ?? null, twitter: body.twitter_username ?? null });
    } catch {
      return ok({ email: null, twitter: null });
    }
  }

  /** `/community/profile` resolve a maior parte de OSS numa chamada barata. */
  async communityProfile(owner: string, repo: string): Promise<Result<Record<string, unknown>, CollectError>> {
    try {
      const res = await this.#fetch(`${REST}/repos/${owner}/${repo}/community/profile`, {
        headers: { authorization: `bearer ${this.#token}`, accept: 'application/vnd.github+json', 'user-agent': this.#ua },
      });
      if (res.status === 401) return err({ kind: 'token_invalid' });
      if (!res.ok) return ok({});
      return ok((await res.json()) as Record<string, unknown>);
    } catch {
      return ok({});
    }
  }
}
