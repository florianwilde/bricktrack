import { describe, expect, it } from 'vitest';
import { changelogSection, parseReleaseMerges, tagMessage } from '../../scripts/release-tags.mjs';

describe('Release-Tags', () => {
  it('erkennt Release-Merges und dreht sie in zeitliche Reihenfolge', () => {
    const releases = parseReleaseMerges([
      'babe01f Merge: Release 1.0.0',
      'dd353d2 Merge: 1.0 vorbereiten',
      '1ca1a40 Merge: Release 0.8.0 - Ordnung im Bestand',
      'e9093d0 Merge: Phase 3 - Nice to have (v0.3.0)',
    ]);
    expect(releases).toEqual([
      { sha: '1ca1a40', version: '0.8.0', name: 'Ordnung im Bestand' },
      { sha: 'babe01f', version: '1.0.0', name: null },
    ]);
    expect(releases.map(tagMessage)).toEqual(['Bricktrack 0.8.0 - Ordnung im Bestand', 'Bricktrack 1.0.0']);
  });

  it('liest den passenden Abschnitt aus dem Changelog', () => {
    const changelog = [
      '## [Unreleased]',
      '',
      '## [1.0.0] - 2026-11-04',
      '',
      'Fertig.',
      '',
      '### Geändert',
      '',
      '- Etwas.',
      '',
      '## [0.8.0] - 2026-11-03',
      '',
      'Ordnung.',
      '',
      '[Unreleased]: https://example.test',
      '[1.0.0]: https://example.test',
    ].join('\n');
    expect(changelogSection(changelog, '1.0.0')).toBe('Fertig.\n\n### Geändert\n\n- Etwas.');
    expect(changelogSection(changelog, '0.8.0')).toBe('Ordnung.');
    expect(changelogSection(changelog, '9.9.9')).toBeNull();
  });
});
