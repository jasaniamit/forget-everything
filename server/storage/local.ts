import fs from 'fs';
import path from 'path';

export interface IStorageDriver {
  saveFile(buffer: Buffer, family: string, style: string, filename: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
}

export class LocalDriver implements IStorageDriver {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'data', 'fonts');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, family: string, style: string, filename: string): Promise<string> {
    const dir = path.join(this.baseDir, family, style);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fullPath = path.join(dir, filename);
    await fs.promises.writeFile(fullPath, buffer);
    return path.relative(process.cwd(), fullPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}
