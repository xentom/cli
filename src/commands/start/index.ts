import { createCommand } from '@/commands/utils';
import { api, type WorkflowVersionDependency } from '@/lib/trpc';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cyan } from 'yoctocolors';
import {
  bundelWorkflowDependencies,
  fetchWorkflowDependencies,
} from './dependencies';

export function createStartCommand() {
  const command = createCommand()
    .name('start')
    .description('Starts a workflow')
    .requiredOption(
      '-o, --org <org>',
      'Specifies the name of the organization where the workflow is located',
    )
    .requiredOption(
      '-w, --workflow <workflow>',
      'Specifies the name of the workflow to start',
    )
    .option(
      '-b, --branch <branch>',
      'Specifies the branch of the workflow to start',
    )
    .option(
      '-v, --version <version>',
      'Specifies the version of the workflow to start',
      parseInt,
    )
    .option(
      '-e, --external-url <url>',
      'Specifies the external URL to use for the workflow',
    )
    .action(actionErrorHandler(start));

  return command;
}

export interface StartOptions {
  org: string;
  workflow: string;
  branch?: string;
  version?: number;
  externalUrl?: string;
}

export async function start(options: StartOptions) {
  const version = await api.workflow.version.findBySlugs.query({
    organization: options.org,
    workflow: options.workflow,
    branch: options.branch,
    version: options.version,
    credentials: true,
  });

  if (!version) {
    throw new ActionError(
      `The workflow '${options.workflow}' could not be found in the organization '${options.org}'.` +
        `\n\nPlease verify the following:` +
        `\n- The organization name '${options.org}' is correct.` +
        `\n- The workflow name '${options.workflow}' is correct.` +
        `\n- The branch is specified correctly.` +
        `\n- The version is correct, if applicable.` +
        `\n\nIf you continue to experience issues, refer to the documentation or contact support.`,
    );
  }

  console.log(
    `Start workflow ${cyan(options.workflow)} (organization: ${cyan(options.org)})${options.branch ? ` (branch: ${cyan(options.branch)})` : ''} (version: ${cyan(version.number.toString())})`,
  );

  const [workflowCode, dependencies] = await Promise.all([
    api.workflow.version.code.query({ id: version.id }),
    fetchWorkflowDependencies(version.dependencies),
  ]);

  if (!workflowCode) {
    throw new ActionError(
      `Workflow '${options.org}/${options.workflow}' does not have any code associated with it.`,
    );
  }

  if (!dependencies.length) {
    throw new ActionError(
      `Workflow '${options.org}/${options.workflow}' does not have any dependencies associated with it.`,
    );
  }

  run({ dependencies, workflowCode, externalUrl: options.externalUrl });
}

interface RunOptions {
  dependencies: (WorkflowVersionDependency & { code: string })[];
  workflowCode: string;
  externalUrl?: string;
}

function run(options: RunOptions) {
  const scriptUrl = URL.createObjectURL(
    new Blob(
      [
        [
          '// @node',
          options.externalUrl
            ? `process.env.XENTOM_EXTERNAL_URL = ${JSON.stringify(options.externalUrl)};`
            : '',
          options.workflowCode.replace(
            '/*<XENTOM_WORKFLOW_DEPENDENCIES>*/',
            bundelWorkflowDependencies(options.dependencies),
          ),
        ].join('\n'),
      ],
      {
        type: 'application/javascript',
      },
    ),
  );

  const worker = new Worker(scriptUrl, {
    type: 'module',
  });

  worker.addEventListener('message', () => {
    // TODO: Handle worker messages
  });

  worker.addEventListener('error', (error) => {
    console.error(error.message);
  });

  process.on('SIGINT', () => {
    worker.postMessage({
      action: 'terminate',
    });
  });
}
