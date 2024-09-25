import * as fs from 'node:fs';
import * as path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';

export function createZipInMemory(files: string[]): Promise<Buffer> {
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
      const prefix = path.normalize(path.dirname(file));
      try {
        archive.append(fs.createReadStream(file), {
          name: path.basename(file),
          prefix: prefix === '.' ? undefined : prefix,
        });
      } catch {}
    });

    archive.finalize();
  });
}
