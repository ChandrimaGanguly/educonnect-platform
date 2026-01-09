/**
 * File utility functions
 */

import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
  /**
   * Check if a file exists
   */
  static exists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  static readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Write content to file
   */
  static writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Ensure directory exists
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Get filename without extension
   */
  static getBasename(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Resolve path relative to current working directory
   */
  static resolve(filePath: string): string {
    return path.resolve(filePath);
  }

  /**
   * Check if path is a directory
   */
  static isDirectory(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * List files in directory matching pattern
   */
  static listFiles(dirPath: string, pattern?: RegExp): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        if (!pattern || pattern.test(entry.name)) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory()) {
        files.push(...this.listFiles(fullPath, pattern));
      }
    }

    return files;
  }
}
