import type { Predicate } from './types';

const type = (...ts: string[]): Predicate => ({ repo }) => !!repo && ts.includes(repo.projectType);

export const predicates: Record<string, Predicate> = {
  always: () => true,
  isLibrary: type('library'),
  isCli: type('cli'),
  isDocs: type('docs'),
  isVisualApp: type('application', 'desktop', 'mobile', 'web'),
  isService: type('service'),
  isDesktopOrMobile: type('desktop', 'mobile'),
  isAppOrDotfiles: type('application', 'config-dotfiles', 'desktop', 'mobile'),
};
