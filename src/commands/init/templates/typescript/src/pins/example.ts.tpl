import { pin } from '@xentom/integration';

// You can provide a TypeScript type to the createActionPin function
// This enhances type checking and enables auto-completion within the workflow editor
export interface Example {
  message: 'Hello, World!';
}

export const example = pin.custom<Example>();
