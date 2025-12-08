import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const STORAGE_DIR = 'app-storage';

const ensureDir = async (path: string) => {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch (e: any) {
    // ignore if exists
  }
};

export const bridgeStorageAPI = {
  async set(projectId: string, key: string, value: any): Promise<void> {
    const dir = `${STORAGE_DIR}/${projectId}`;
    await ensureDir(dir);
    const data = JSON.stringify(value);
    await Filesystem.writeFile({
      path: `${dir}/${key}.json`,
      data,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  },

  async get(projectId: string, key: string): Promise<any> {
    try {
      const result = await Filesystem.readFile({
        path: `${STORAGE_DIR}/${projectId}/${key}.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(result.data);
    } catch (e) {
      return null;
    }
  },

  async remove(projectId: string, key: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: `${STORAGE_DIR}/${projectId}/${key}.json`,
        directory: Directory.Data,
      });
    } catch (e) {
      console.warn('Remove key failed', key, e);
    }
  },

  async clear(projectId: string): Promise<void> {
    try {
      await Filesystem.rmdir({
        path: `${STORAGE_DIR}/${projectId}`,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (e) {
      console.warn('Clear storage failed', projectId, e);
    }
  },

  async keys(projectId: string): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path: `${STORAGE_DIR}/${projectId}`,
        directory: Directory.Data,
      });
      return result.files
        .filter(f => f.name.endsWith('.json'))
        .map(f => f.name.replace('.json', ''));
    } catch (e) {
      return [];
    }
  },

  async getAll(projectId: string): Promise<Record<string, any>> {
    try {
      const keys = await this.keys(projectId);
      const result: Record<string, any> = {};
      await Promise.all(keys.map(async (key) => {
        result[key] = await this.get(projectId, key);
      }));
      return result;
    } catch (e) {
      return {};
    }
  },
};
