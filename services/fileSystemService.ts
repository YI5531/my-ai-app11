import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Project } from '../types';

const BASE_DIR = 'projects';

const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'js':
    case 'mjs':
      return 'text/javascript';
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'text/javascript';
    case 'css':
      return 'text/css';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === 'string') {
        // data:*/*;base64,xxx -> only keep base64
        const base64 = res.split(',').pop() || '';
        resolve(base64);
      } else {
        reject(new Error('Unexpected reader result'));
      }
    };
    reader.readAsDataURL(blob);
  });

const base64ToBlob = (b64: string, mime: string) => {
  const byteCharacters = atob(b64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mime });
};

const ensureDir = async (path: string) => {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch (e: any) {
    // ignore if exists
  }
};

export const persistProjectFiles = async (project: Project) => {
  if (project.type !== 'web' || !project.files) return;
  const fileKeys = Object.keys(project.files);
  if (fileKeys.length === 0) return;

  const projectDir = `${BASE_DIR}/${project.id}`;
  await ensureDir(projectDir);

  const manifest: string[] = [];

  for (const key of fileKeys) {
    const blob = project.files[key];
    const base64 = await blobToBase64(blob);
    const dir = key.includes('/') ? key.split('/').slice(0, -1).join('/') : '';
    const targetDir = dir ? `${projectDir}/${dir}` : projectDir;
    await ensureDir(targetDir);
    await Filesystem.writeFile({
      path: `${projectDir}/${key}`,
      data: base64,
      directory: Directory.Data,
      encoding: Encoding.BASE64,
      recursive: true,
    });
    manifest.push(key);
  }

  await Filesystem.writeFile({
    path: `${projectDir}/manifest.json`,
    data: JSON.stringify({ files: manifest, entryPoint: project.entryPoint || '' }),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
};

export const loadProjectFiles = async (projectId: string): Promise<{ files: Record<string, Blob>; entryPoint?: string }> => {
  const projectDir = `${BASE_DIR}/${projectId}`;
  try {
    const manifestRes = await Filesystem.readFile({ path: `${projectDir}/manifest.json`, directory: Directory.Data, encoding: Encoding.UTF8 });
    const manifest = JSON.parse(manifestRes.data || '{}') as { files?: string[]; entryPoint?: string };
    const files: Record<string, Blob> = {};
    if (Array.isArray(manifest.files)) {
      for (const key of manifest.files) {
        try {
          const res = await Filesystem.readFile({ path: `${projectDir}/${key}`, directory: Directory.Data, encoding: Encoding.BASE64 });
          const blob = base64ToBlob(res.data, getMimeType(key));
          files[key] = blob;
        } catch (e) {
          console.warn('Missing file in filesystem', key, e);
        }
      }
    }
    return { files, entryPoint: manifest.entryPoint };
  } catch (e) {
    console.warn('No manifest for project', projectId, e);
    return { files: {}, entryPoint: undefined };
  }
};

export const removeProjectFiles = async (projectId: string) => {
  const projectDir = `${BASE_DIR}/${projectId}`;
  try {
    await Filesystem.rmdir({ path: projectDir, directory: Directory.Data, recursive: true });
  } catch (e) {
    console.warn('Remove project dir failed', projectId, e);
  }
};
