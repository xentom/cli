import { createIntegration, env } from '@xentom/integration';

import * as actions from './actions';

declare global {
  namespace NodeJS {
    {{^empty}}
    // Add any required environment variables here,
    // which are essential for enabling autocomplete features.
    {{/empty}}
    interface ProcessEnv {
      {{^empty}}
      // TOKEN: string;
      {{/empty}}
    }
  }
}

declare module '@xentom/integration' {
  {{^empty}}
  // Add any necessary state properties in this section.
  // State properties serve to hold data that is shared across different actions.
  {{/empty}}
  interface IntegrationState {
    {{^empty}}
    // message: string;
    {{/empty}}
  }
}

export default createIntegration({
  actions,
  {{^empty}}

  // Uncomment the following section to add environment variables to your integration.
  // env: {
  //   TOKEN: env.string({
  //     description: 'Authentication token required for access',
  //     isRequired: true,
  //   }),
  // },

  // Uncomment the lines below to initialize the state of your integration.
  // This code section will be executed on the server once, the first time the integration is loaded.
  // async init({ state }) {
  //   console.log('Initializing state...');
  //   state.message = 'Hello, world!';
  // },
  {{/empty}}
});
