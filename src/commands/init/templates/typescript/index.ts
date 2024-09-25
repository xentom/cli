import { getFiles } from '@/embed';

export function getTypeScriptTemplateFiles() {
  return getFiles(import.meta.dir);
}
