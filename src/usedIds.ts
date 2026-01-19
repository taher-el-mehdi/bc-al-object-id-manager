import * as vscode from 'vscode';
import { AlObject, SUPPORTED_OBJECT_TYPES } from './types';

export class UsedIdScanner {
  private usedIds = new Set<number>();
  private usedIdsByType = new Map<string, Set<number>>();
  private objectsByFile = new Map<string, AlObject[]>();

  getUsedIds(type?: string): Set<number> {
    if (!type) return this.usedIds;
    const key = type.toLowerCase();
    return this.usedIdsByType.get(key) ?? new Set<number>();
  }

  getAllObjects(): AlObject[] {
    const arr: AlObject[] = [];
    for (const list of this.objectsByFile.values()) arr.push(...list);
    return arr;
  }

  async scanWorkspace(): Promise<void> {
    this.usedIds.clear();
    this.usedIdsByType.clear();
    this.objectsByFile.clear();
    const files = await vscode.workspace.findFiles('**/*.al');
    await Promise.all(files.map((f) => this.scanUri(f)));
  }

  async scanUri(uri: vscode.Uri): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      this.scanDocument(doc);
    } catch {
      // ignore
    }
  }

  scanDocument(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'al' && !doc.fileName.toLowerCase().endsWith('.al')) return;
    const text = doc.getText();
    const typesAlt = SUPPORTED_OBJECT_TYPES.join('|');
    const regex = new RegExp(`(^|\\n)\\s*(?:${typesAlt})\\s+(\\d+)\\b`, 'gmi');

    const list: AlObject[] = [];
    for (let m; (m = regex.exec(text)); ) {
      const idx = m.index + m[0].lastIndexOf(m[2]);
      const start = doc.positionAt(idx);
      const end = doc.positionAt(idx + m[2].length);
      const id = Number(m[2]);

      // determine type by reading the word at start of line after whitespace
      const lineStart = doc.positionAt(m.index + m[1].length);
      const line = doc.lineAt(lineStart.line).text;
      const typeMatch = new RegExp(`^\\s*(${typesAlt})\\b`, 'i').exec(line);

      const type = typeMatch ? typeMatch[1].toLowerCase() : 'unknown';

      // name (best-effort): token(s) after the numeric id
      const afterId = line.slice(line.indexOf(m[2]) + m[2].length).trim();
      const nameMatch = /^("[^"]+"|\w[\w\s\'\-\"]*)/.exec(afterId);
      const name = nameMatch ? nameMatch[1] : undefined;

      list.push({ type, id, name, uri: doc.uri, idRange: new vscode.Range(start, end), lineStart: lineStart.line });
    }

    // Update caches: replace for this file
    this.objectsByFile.set(doc.uri.toString(), list);

    // Recompute usedIds for the whole workspace efficiently
    this.usedIds.clear();
    this.usedIdsByType.clear();
    for (const arr of this.objectsByFile.values()) {
      for (const o of arr) {
        this.usedIds.add(o.id);
        const t = o.type.toLowerCase();
        let set = this.usedIdsByType.get(t);
        if (!set) {
          set = new Set<number>();
          this.usedIdsByType.set(t, set);
        }
        set.add(o.id);
      }
    }
  }

  registerListeners(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((d) => this.scanDocument(d)),
      vscode.workspace.onDidSaveTextDocument((d) => this.scanDocument(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.scanDocument(e.document))
    );
  }
}
