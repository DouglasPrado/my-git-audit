import { describe, expect, it } from 'vitest';
import type { TreeEntry } from '@audit/contracts';
import { classifyProjectType } from '../classify';

const blob = (name: string): TreeEntry => ({ name, type: 'blob' });
const dir = (name: string): TreeEntry => ({ name, type: 'tree' });
const base = { name: 'x', topics: [], primaryLanguage: null, languages: [], rootTree: [], srcTree: [], manifest: null, releasesCount: 0 };

describe('classificação de tipo de projeto', () => {
  it('reconhece repositório docs-only, que não tem linguagem', () => {
    // Caso real: `blueprint` tem primaryLanguage null e languages vazio.
    expect(classifyProjectType({ ...base, rootTree: [dir('docs'), blob('README.md')] })).toBe('docs');
  });

  it('reconhece app desktop por tauri', () => {
    expect(classifyProjectType({ ...base, rootTree: [dir('src-tauri')], primaryLanguage: 'Rust' })).toBe('desktop');
  });

  it('reconhece CLI pelo campo bin do manifesto', () => {
    expect(classifyProjectType({ ...base, manifest: { bin: { foo: './x.js' } }, primaryLanguage: 'TypeScript' })).toBe('cli');
  });

  it('reconhece serviço por Dockerfile', () => {
    expect(classifyProjectType({ ...base, rootTree: [blob('Dockerfile')], primaryLanguage: 'Go' })).toBe('service');
  });

  it('reconhece biblioteca por releases mais manifesto', () => {
    expect(classifyProjectType({ ...base, rootTree: [blob('package.json')], releasesCount: 12, primaryLanguage: 'TypeScript' })).toBe('library');
  });

  it('cai em application quando há código e nenhum sinal mais forte', () => {
    expect(classifyProjectType({ ...base, primaryLanguage: 'TypeScript', rootTree: [blob('main.ts')] })).toBe('application');
  });
});
