import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IdRange } from './types';
import { isNumber } from './utils';

export class IdRangeManager {
  private ranges: IdRange[] = [];
  private loadedForFolder: string | undefined;
  private warnedMissing = false;

  async load(workspaceFolder?: vscode.WorkspaceFolder): Promise<IdRange[] | undefined> {
    const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return undefined;
    }
    const root = folder.uri.fsPath;
    console.log(root);
    
    // Always read app.json fresh to reflect latest idRanges changes
    const appJsonPath = path.join(root, 'app.json');
    console.log(appJsonPath);
    
    try {
      const buf = await fs.readFile(appJsonPath, 'utf8');
      const json = JSON.parse(buf);
      console.log(json);
      const idRanges = json?.idRanges as Array<{ from: unknown; to: unknown }> | undefined;
      if (!Array.isArray(idRanges) || idRanges.length === 0) {
        if (!this.warnedMissing) {
          vscode.window.showWarningMessage('AL Object ID Manager: No idRanges found in app.json at workspace root.');
          this.warnedMissing = true;
        }
        this.ranges = [];
        this.loadedForFolder = root;
        return undefined;
      }
      const parsed: IdRange[] = [];
      for (const r of idRanges) {
        const from = (r as any).from;
        const to = (r as any).to;
        if (!isNumber(from) || !isNumber(to) || from > to) {
          throw new Error('Invalid idRanges entry. Expected { from: number, to: number } with from <= to.');
        }
        parsed.push({ from, to });
      }
      this.ranges = parsed.sort((a, b) => a.from - b.from);
      this.loadedForFolder = root;
      return this.ranges;
    } catch (err: any) {
      if (!this.warnedMissing) {
        vscode.window.showWarningMessage(`AL Object ID Manager: Could not read app.json (${err?.message ?? err}). Autocomplete and fix IDs will be disabled.`);
        this.warnedMissing = true;
      }
      this.ranges = [];
      this.loadedForFolder = root;
      return undefined;
    }
  }

  getRanges(): IdRange[] {
    return this.ranges;
  }
}
