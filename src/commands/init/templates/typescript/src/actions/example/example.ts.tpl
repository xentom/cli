import { createAction, pin } from '@xentom/integration';
import * as customPin from '@/pins';

// You can organize actions by grouping them together using the "/" separator to establish a hierarchy.
const group = 'example';

export const firstTrigger = createAction({
  group,
  outputs: {
    exec: pin.exec(),
    example: customPin.example,
  },
  run({ next }) {
    // Implement your trigger logic here (e.g., polling, listening to events, etc.)
    // ...

    // Invoke the next function to execute the output pin 'exec', which triggers all connected actions.
    next('exec', {
      // Provide the output data for the 'example' pin
      example: {
        message: 'Hello, World!',
      },
    });
  },
});

export const firstAction = createAction({
  group,
  inputs: {
    exec: pin.exec({
      run({ next }) {
        // Implement your action logic here
        // ...

        // Invoke the next function to execute the output pin 'exec', which triggers all connected actions.
        next('exec');
      },
    }),
    example: customPin.example,
  },
  outputs: {
    exec: pin.exec(),
  },
});
