import { createCommand } from '@/commands/utils';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { getIntegrationMetadata } from '@/utils/metadata';
import { type WebSocketHandler } from 'bun';
import mime from 'mime/lite';
import { cyan } from 'yoctocolors';
import { type IntegrationMetadata } from '@xentom/integration/schema';
import { createIntegrationBuilder } from '../build';
import { getPlaygroundFiles } from './embed' with { type: 'macro' };

export function createDevCommand() {
  return createCommand()
    .name('dev')
    .description('Start the integration development server')
    .option(
      '-p, --port <port>',
      'The port to run the server on',
      parseInt,
      4444,
    )
    .action(actionErrorHandler(dev));
}

export interface DevOptions {
  port: number;
}

export async function dev(options: DevOptions) {
  const listeners = new Set<WebSocketData>();
  createIntegrationBuilder({
    watch: true,
    onBuildSuccess() {
      listeners.forEach((listener) => {
        listener.onBuildSuccess();
      });
    },
    onBuildError(message) {
      console.error(message);
      listeners.forEach((listener) => {
        listener.onBuildError(message);
      });
    },
  })
    .then(() => {
      throw new ActionError('Integration builder stopped');
    })
    .catch(() => {
      throw new ActionError('Integration builder failed');
    });

  const metadata = await getIntegrationMetadata();
  const router = createPlaygroundRouter(metadata);
  const server = Bun.serve({
    port: options.port,
    websocket: createWebSocketHandler(metadata.name, listeners),
    async fetch(req, server) {
      if (server.upgrade(req)) return;
      return router.handle(req);
    },
  });

  console.log(
    `Playground server running at ${cyan(`http://localhost:${server.port}`)}`,
  );
}

function createPlaygroundRouter(metadata: IntegrationMetadata) {
  const files = Object.fromEntries(getPlaygroundFiles());
  return {
    async handle(req: Request) {
      const { pathname } = new URL(req.url);
      switch (pathname) {
        case '/': {
          return new Response(files['/index.html'], {
            headers: {
              'Content-Type': 'text/html',
            },
          });
        }

        case '/integration/logo': {
          if (!metadata.logo) {
            return new Response(null, { status: 404 });
          }

          return new Response(await Bun.file(metadata.logo).arrayBuffer(), {
            headers: {
              'Content-Type':
                mime.getType(metadata.logo) ?? 'application/octet-stream',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        case '/integration/browser.js': {
          return new Response(await Bun.file('dist/browser.js').text(), {
            headers: {
              'Content-Type': 'application/javascript',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        case '/integration/browser.css': {
          let content = '';
          try {
            content = await Bun.file('dist/browser.css').text();
          } catch {
            // file is optional and may not exist
          }

          return new Response(content, {
            headers: {
              'Content-Type': 'text/css',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        case '/integration/declarations.json': {
          return new Response(
            await Bun.file('dist/declarations.json').arrayBuffer(),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            },
          );
        }

        default: {
          const content = files[pathname];
          if (content) {
            return new Response(content, {
              headers: { 'Content-Type': Bun.file(pathname).type },
            });
          }
        }
      }

      return new Response(null, {
        status: 404,
      });
    },
  };
}

interface WebSocketData {
  emit: (type: string, data?: unknown) => void;
  onBuildSuccess: () => void;
  onBuildError: (message: string) => void;
}

function createWebSocketHandler(
  id: string,
  listeners: Set<WebSocketData>,
): WebSocketHandler<WebSocketData> {
  return {
    open(ws) {
      function emit(type: string, data?: unknown) {
        ws.send(JSON.stringify({ type, data }));
      }

      ws.data = {
        emit,
        onBuildSuccess() {
          emit('build:success');
        },
        onBuildError(message) {
          console.error(message);
          emit('build:error', { message });
        },
      };

      listeners.add(ws.data);
      emit('connected', { id });
    },
    message() {
      // no-op
    },
    close(ws) {
      listeners.delete(ws.data);
    },
  };
}
