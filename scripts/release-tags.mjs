/**
 * Creates the git tag and GitHub release for every release merge on main
 * that does not have one yet.
 *
 * Runs in GitHub Actions after each push to main (see
 * .github/workflows/release-tags.yml), so releasing is just merging a
 * "Release x.y.z" pull request - no computer with push rights needed. A
 * release is a first-parent commit on main titled "Merge: Release x.y.z" or
 * "Merge: Release x.y.z - Name"; the tag points at exactly that merge commit.
 * Safe to run any number of times: existing tags are left alone, and a tag
 * without a release page only gets the page.
 *
 *   node scripts/release-tags.mjs            create what is missing
 *   node scripts/release-tags.mjs --dry-run  only print it
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RELEASE_TITLE = /^Merge: Release (\d+\.\d+\.\d+)(?: - (.+))?$/;

/** `git log --format="%H %s"` lines -> releases, oldest first. */
export function parseReleaseMerges(logLines) {
  const releases = [];
  for (const line of logLines) {
    const space = line.indexOf(' ');
    if (space === -1) continue;
    const sha = line.slice(0, space);
    const match = RELEASE_TITLE.exec(line.slice(space + 1).trim());
    if (match) releases.push({ sha, version: match[1], name: match[2] ?? null });
  }
  return releases.reverse();
}

/** The body of `## [x.y.z] - date` in the changelog, without the heading. */
export function changelogSection(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) return null;
  const end = lines.findIndex((line, index) => index > start && /^## \[|^\[[^\]]+\]: /.test(line));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();
}

export function tagMessage(release) {
  return release.name ? `Bricktrack ${release.version} - ${release.name}` : `Bricktrack ${release.version}`;
}

function run(command, args, options = {}) {
  // With inherited stdio there is no captured output to return.
  const output = execFileSync(command, args, { encoding: 'utf8', ...options });
  return typeof output === 'string' ? output.trim() : '';
}

function hasRelease(tag) {
  try {
    run('gh', ['release', 'view', tag, '--json', 'tagName'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const log = run('git', ['log', '--first-parent', '--format=%H %s', 'HEAD']).split('\n');
  const existing = new Set(run('git', ['tag', '--list', 'v*']).split('\n').filter(Boolean));
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

  const releases = parseReleaseMerges(log);
  const newest = releases[releases.length - 1];
  let changed = 0;

  for (const release of releases) {
    const tag = `v${release.version}`;
    const needsTag = !existing.has(tag);
    // Without a token (a local dry run) the release pages cannot be checked.
    const needsRelease = needsTag || (!dryRun && !hasRelease(tag));
    if (!needsTag && !needsRelease) continue;
    changed += 1;

    console.log(
      `[release-tags] ${tag} -> ${release.sha.slice(0, 7)} (${tagMessage(release)})${needsTag ? '' : ', nur Release-Seite'}`,
    );
    if (dryRun) continue;

    if (needsTag) {
      run('git', ['tag', '-a', tag, '-m', tagMessage(release), release.sha]);
      run('git', ['push', 'origin', `refs/tags/${tag}`], { stdio: 'inherit' });
    }

    const notes = changelogSection(changelog, release.version) ?? 'Siehe CHANGELOG.md.';
    run(
      'gh',
      [
        'release',
        'create',
        tag,
        '--verify-tag',
        '--title',
        tagMessage(release),
        '--notes',
        notes,
        // Only the newest gets the "latest" badge, even when several are created at once.
        `--latest=${release === newest ? 'true' : 'false'}`,
      ],
      { stdio: 'inherit' },
    );
  }

  if (changed === 0) console.log('[release-tags] Alle Releases haben Tag und Release-Seite.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
