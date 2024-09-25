import { yellow } from 'yoctocolors';
import { version } from '../package.json';

const GITHUB_SHA_SHORT = getCommitSha()?.substring(0, 7) ?? 'unknown';

export function getVersion() {
  return version;
}

export function getRevision() {
  return isCanary()
    ? `${version}-canary+${GITHUB_SHA_SHORT}`
    : `${version}+${GITHUB_SHA_SHORT}`;
}

export function getCommitSha() {
  if (!process.env.GITHUB_SHA) {
    console.warn(
      yellow(
        'Unable to retrieve the revision. Ensure the script is running in a CI environment with the GITHUB_SHA environment variable set.',
      ),
    );
  }

  return process.env.GITHUB_SHA;
}

export function isCanary() {
  return process.env.GITHUB_REF_TYPE === 'branch';
}

export function isRelease() {
  return process.env.GITHUB_REF_TYPE === 'tag';
}
