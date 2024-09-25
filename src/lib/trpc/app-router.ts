import {
  type Procedure,
  type Router,
} from '@trpc/server/unstable-core-do-not-import';

export type UserGetProcedure = Procedure<
  'query',
  {
    input: undefined;
    output: {
      email: string;
      displayName: string;
    };
  }
>;

export type OrganizationListProcedure = Procedure<
  'query',
  {
    input:
      | {
          search?: string;
        }
      | undefined;
    output: {
      slug: string;
    }[];
  }
>;

export type WorkflowVersionFindBySlugsProcedure = Procedure<
  'query',
  {
    input: {
      organization: string;
      workflow: string;
      branch?: string;
      version?: number;
      credentials?: boolean;
    };
    output:
      | {
          id: number;
          number: number;
          dependencies: WorkflowVersionDependency[];
        }
      | undefined;
  }
>;

export interface WorkflowVersionDependency {
  id: number;
  env: Record<string, unknown>;
  workflowVersionId: number;
  integrationVersionId: number;
  integrationVersion: {
    integration: {
      slug: string;
    };
    files: {
      type: string;
      source: string;
    }[];
  };
  integrationConnectionId: number | null;
  integrationConnection?: {
    accessToken: string;
  };
  createdAt: Date;
  updatedAt: Date | null;
}

export type WorkflowVersionCodeProcedure = Procedure<
  'query',
  {
    input: {
      id: number;
    };
    output: string;
  }
>;

export type AppRouter = Router<
  {
    ctx: unknown;
    errorShape: unknown;
    meta: unknown;
    transformer: true;
  },
  {
    user: {
      get: UserGetProcedure;
    };
    organization: {
      list: OrganizationListProcedure;
    };
    workflow: {
      version: {
        findBySlugs: WorkflowVersionFindBySlugsProcedure;
        code: WorkflowVersionCodeProcedure;
      };
    };
  }
>;
