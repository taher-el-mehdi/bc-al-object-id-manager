import * as vscode from 'vscode';
import { IdRangeManager } from './idRanges';
import { UsedIdScanner } from './usedIds';
import { registerFixCommand } from './fixCommand';

export async function activate(context: vscode.ExtensionContext) {
  const idRanges = new IdRangeManager();
  const scanner = new UsedIdScanner();

  scanner.registerListeners(context);
  registerFixCommand(context, idRanges, scanner);
 const watcher = vscode.workspace.createFileSystemWatcher('**/app.json');
  watcher.onDidChange(() => idRanges.load());
  watcher.onDidCreate(() => idRanges.load());
  watcher.onDidDelete(() => idRanges.load());
  context.subscriptions.push(watcher); 
}

export function deactivate() { }
