import {
  createRequestHeaders,
  type WorkflowVersionDependency,
} from '@/lib/trpc';
import { ActionError } from '@/utils/action';

export async function fetchWorkflowDependencies(
  dependencies: WorkflowVersionDependency[],
) {
  const headers = await createRequestHeaders();
  return await Promise.all(
    dependencies.map(async (dependency) => {
      return await fetchWorkflowDependencyCode(dependency, headers);
    }),
  );
}

export async function fetchWorkflowDependencyCode(
  dependency: WorkflowVersionDependency,
  headers: Record<string, string>,
) {
  const source = findWorkflowDependencySource(dependency);
  if (!source) {
    throw new ActionError(
      `Workflow dependency '${dependency.integrationVersion.integration.slug}' does not have a source file.`,
    );
  }

  const request = await fetch(source, { headers });
  if (!request.ok) {
    throw new ActionError(
      `Failed to fetch workflow dependency '${dependency.integrationVersion.integration.slug}'. Status: ${request.status}. Response: '${await request.text()}'`,
    );
  }

  return { ...dependency, code: await request.text() };
}

export function findWorkflowDependencySource(
  dependency: WorkflowVersionDependency,
) {
  return dependency.integrationVersion.files.find(
    (f) => f.type === 'Integration.Server.Code',
  )?.source;
}

export function bundelWorkflowDependencies(
  dependencies: (WorkflowVersionDependency & { code: string })[],
) {
  return dependencies
    .map((dependency) => {
      return dependency.code.replace(
        '/* @__XENTOM_INJECT__ */',
        `const process = { 
        ...PROCESS,
        env: {
          ...PROCESS.env,
          ...(${JSON.stringify(dependency.env)})
        },
        auth: ${JSON.stringify({
          accessToken: dependency.integrationConnection?.accessToken,
        })},
      };`,
      );
    })
    .join('\n');
}
