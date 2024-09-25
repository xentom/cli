import { ActionError } from '@/utils/action';
import { gray } from 'yoctocolors';

export const MissingBinaryError = new ActionError(
  `Xentom CLI binary not found. Please download and install the latest version from: ${gray(
    'https://xentom.com/docs/cli',
  )}`,
);

export const DownloadFailedError = new ActionError(
  `Failed to download the latest version of the Xentom CLI. Please try again later or download the latest version from: ${gray(
    'https://xentom.com/docs/cli',
  )}`,
);

export const ExtractionFailureError = new ActionError(
  `Failed to extract the latest version of the Xentom CLI. Please try again later or download the latest version from: ${gray(
    'https://xentom.com/docs/cli',
  )}`,
);
