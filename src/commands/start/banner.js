import { randomUUID as uuid } from 'node:crypto';

// Polyfills
BigInt.prototype.toJSON = () => this.toString();

Error.prepareStackTrace = () => '';

process.on('uncaughtException', async (error) => {
  console.error(error.message);
  await shutdown();
  process.exit(1);
});

const templateString = (() => {
  function createTransformer(pinType, template) {
    const parts = template.split(new RegExp(/{{([\s\S]*?)}}/g));

    // String only
    if (parts.length === 1) {
      return () => {
        return parse(pinType, template);
      };
    }

    // Variable only
    if (parts.length === 3 && !parts[0] && !parts[2]) {
      return (data) => {
        return parse(pinType, evaluate(parts[1], data));
      };
    }

    const isObject =
      pinType === 'object' &&
      ((template.startsWith('{') && template.endsWith('}')) ||
        (template.startsWith('[') && template.endsWith(']')));

    // String with variables
    return (data) => {
      const results = parts.map((part, index) => {
        if (!(index % 2)) {
          return part;
        }

        const result = evaluate(part, data);
        return typeof result === 'string' && isObject ? `"${result}"` : result;
      });

      return parse(pinType, results.join(''));
    };
  }

  function parse(pinType, value) {
    if (pinType === 'object' && typeof value === 'string') {
      return JSON.parse(value);
    }

    return value;
  }

  function evaluate(expression, data) {
    return Function(
      'data',
      `with (data) { return eval('(${expression})') }`,
    )(data);
  }

  const transformers = new Map();
  return (pinType, template) => {
    const id = `__${pinType}:${template}`;
    if (transformers.has(id)) {
      return transformers.get(id);
    }

    const transformer = createTransformer(pinType, template.trim());
    transformers.set(id, transformer);
    return transformer;
  };
})();

async function middleware(node, next, context) {
  const { inputs, outputs, execution } = context;

  if (!execution) {
    return await next(context);
  }

  const id = uuid();
  self.postMessage({
    action: 'log:execution',
    data: {
      id,
      status: 'running',
      node: { id: node, inputs: JSON.parse(JSON.stringify(inputs)) },
      trigger: {
        execution: { id: execution.id },
        node: { id: execution.trigger.node },
      },
    },
  });

  try {
    let isNextFunctionCalled = false;
    await next({
      ...context,
      next(pin, outputs = {}) {
        isNextFunctionCalled = true;
        self.postMessage({
          action: 'log:execution',
          data: {
            id,
            status: 'completed',
            node: { id: node, outputs: JSON.parse(JSON.stringify(outputs)) },
            trigger: {
              execution: { id: execution.id },
              node: { id: execution.trigger.node },
            },
          },
        });

        return context.next(pin, outputs);
      },
    });

    if (!isNextFunctionCalled) {
      self.postMessage({
        action: 'log:execution',
        data: {
          id,
          status: 'completed',
          node: { id: node, outputs: JSON.parse(JSON.stringify(outputs)) },
          trigger: {
            execution: { id: execution.id },
            node: { id: execution.trigger.node },
          },
        },
      });
    }
  } catch (error) {
    console.error(error);
    self.postMessage({
      action: 'log:execution',
      data: {
        id,
        status: 'failed',
        node: { id: node, error: JSON.parse(JSON.stringify(error)) },
        trigger: {
          execution: { id: execution.id },
          node: { id: execution.trigger.node },
        },
      },
    });
  }
}

self.addEventListener('message', async (event) => {
  switch (event.data.action) {
    case 'terminate':
      await shutdown();
      break;
  }
});

const cleanups = [];
async function shutdown() {
  console.log('Gracefully shutting down. Please wait...');

  await Promise.all(cleanups.map((cleanup) => cleanup()));

  console.log('Shutdown complete.');
  process.exit();
}

function createHttpServer() {
  const listeners = {};
  const server = Bun.serve({
    port: process.env.PORT || 3333,
    async fetch(request) {
      const url = new URL(request.url);
      console.log(`${request.method} ${url.pathname}`);

      const callbacks = listeners[`${request.method}:${url.pathname}`];
      if (!callbacks?.length) {
        return new Response('Not found', { status: 404 });
      }

      const [response] = await Promise.all(
        callbacks.map((listener) => {
          return listener(request);
        }),
      );

      return response ?? new Response('OK', { status: 200 });
    },
    websocket: {
      message() {},
    },
  });

  cleanups.push(() => {
    server.stop();
  });

  const baseUrl =
    process.env.XENTOM_EXTERNAL_URL ||
    process.env.XEN_EXTERNAL_URL ||
    server.url;

  console.log(`Webhook URL: ${baseUrl}`);
  return {
    server,
    createNamespace(basePath) {
      const url = new URL(basePath, baseUrl);
      return {
        baseUrl: url.href,
        get(path, callback) {
          (listeners[`GET:${url.pathname}/${path.slice(1)}`] ||= []).push(
            callback,
          );
        },
        head(path, callback) {
          (listeners[`HEAD:${url.pathname}/${path.slice(1)}`] ||= []).push(
            callback,
          );
        },
        post(path, callback) {
          (listeners[`POST:${url.pathname}/${path.slice(1)}`] ||= []).push(
            callback,
          );
        },
        put(path, callback) {
          (listeners[`PUT:${url.pathname}/${path.slice(1)}`] ||= []).push(
            callback,
          );
        },
        delete(path, callback) {
          (listeners[`DELETE:${url.pathname}/${path.slice(1)}`] ||= []).push(
            callback,
          );
        },
      };
    },
  };
}

const http = createHttpServer();
const PROCESS = process;
