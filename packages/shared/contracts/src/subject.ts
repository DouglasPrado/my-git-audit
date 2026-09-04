export type SubjectRef =
  | { kind: 'profile'; login: string }
  | { kind: 'portfolio'; login: string }
  | { kind: 'repo'; owner: string; name: string };

/** Canônico e minúsculo. Base da gramática de EvidenceId (docs/data-model.md §3). */
export function subjectKey(s: SubjectRef): string {
  switch (s.kind) {
    case 'profile':
      return `profile:${s.login.toLowerCase()}`;
    case 'portfolio':
      return `portfolio:${s.login.toLowerCase()}`;
    case 'repo':
      return `repo:${s.owner.toLowerCase()}/${s.name.toLowerCase()}`;
  }
}
