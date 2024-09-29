import * as fs from 'node:fs';
import * as path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';

export interface File {
  path: string;
  content?: string;
}

export function createZipInMemory(files: File[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    const bufferChunks: any[] = [];
    const passthrough = new PassThrough();

    passthrough.on('data', (chunk) => bufferChunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(bufferChunks)));

    archive.on('error', (err) => reject(err));
    archive.pipe(passthrough);

    files.forEach((file) => {
      const prefix = path.normalize(path.dirname(file.path));
      try {
        archive.append(file.content ?? fs.createReadStream(file.path), {
          name: path.basename(file.path),
          prefix: prefix === '.' ? undefined : prefix,
        });
      } catch {}
    });

    archive.finalize();
  });
}
