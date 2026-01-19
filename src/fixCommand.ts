import * as vscode from 'vscode';
import { IdRangeManager } from './idRanges';
import { UsedIdScanner } from './usedIds';
import { iterateRanges, inAnyRange } from './utils';
import { AlObject } from './types';

export function registerFixCommand(
  context: vscode.ExtensionContext,
  ranges: IdRangeManager,
  scanner: UsedIdScanner
) {
  const cmd = vscode.commands.registerCommand('alObjectIdManager.fixIds', async () => {
    const idRanges = await ranges.load();
    if (!idRanges || idRanges.length === 0) {
      vscode.window.showWarningMessage(
        'AL Object ID Manager: No idRanges found in app.json.'
      );
      return;
    }

    await scanner.scanWorkspace();
    const objects = scanner.getAllObjects();

    if (objects.length === 0) {
      vscode.window.showInformationMessage(
        'AL Object ID Manager: No AL objects found.'
      );
      return;
    }

    /**
     * Group objects by type (table, page, report, codeunit, ...)
     */
    const objectsByType = new Map<string, AlObject[]>();
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      const list = objectsByType.get(type) ?? [];
      list.push(obj);
      objectsByType.set(type, list);
    }

    type Change = { obj: AlObject; newId: number };
    const allChanges: Change[] = [];
    const summaryByType: string[] = [];

    /**
     * Process each object type independently
     */
    for (const [type, typeObjects] of objectsByType) {

      // Group by current ID to detect duplicates
      const byId = new Map<number, AlObject[]>();
      for (const o of typeObjects) {
        const list = byId.get(o.id) ?? [];
        list.push(o);
        byId.set(o.id, list);
      }

      // Stable order (important for predictable results)
      const ordered = [...typeObjects].sort((a, b) =>
        a.uri.toString().localeCompare(b.uri.toString())
      );

      const kept = new Set<AlObject>();
      const keptIds = new Set<number>();

      /**
       * Keep objects that:
       * - are inside ranges
       * - are not duplicated
       */
      for (const o of ordered) {
        const isInRange = inAnyRange(o.id, idRanges);
        const isUnique = (byId.get(o.id)?.length ?? 0) === 1;

        if (isInRange && isUnique && !keptIds.has(o.id)) {
          kept.add(o);
          keptIds.add(o.id);
        }
      }

      const needsReassign = ordered.filter(o => !kept.has(o));

      if (needsReassign.length === 0) {
        summaryByType.push(`AL Object ID Manager: Type ${type} have all IDs valid (${typeObjects.length})`);
        continue;
      }

      /**
       * Compute available IDs for this type
       */
      const freeIds: number[] = [];
      for (const id of iterateRanges(idRanges)) {
        if (!keptIds.has(id)) {
          freeIds.push(id);
        }
      }

      if (freeIds.length < needsReassign.length) {
        vscode.window.showErrorMessage(
          `AL Object ID Manager: Not enough IDs for type "${type}".`
        );
        return;
      }

      for (let i = 0; i < needsReassign.length; i++) {
        allChanges.push({
          obj: needsReassign[i],
          newId: freeIds[i]
        });
      }

      summaryByType.push(
        `${type}: ${needsReassign.length} reassigned, ${kept.size} kept`
      );
    }

    /**
     * Nothing to change
     */
    if (allChanges.length === 0) {
      vscode.window.showInformationMessage(
        'AL Object ID Manager: All object IDs are valid.\n\n' +
        summaryByType.join('\n')
      );
      return;
    }

    /**
     * Preview dialog
     */
    const preview = allChanges
      .slice(0, 20)
      .map(c =>
        `${vscode.workspace.asRelativePath(c.obj.uri)}: ` +
        `${c.obj.type} ${c.obj.id} → ${c.newId}`
      )
      .join('\n');

    const choice = await vscode.window.showWarningMessage(
      `About to reassign ${allChanges.length} object(s):\n\n` +
      summaryByType.join('\n') +
      `\n\nPreview:\n${preview}` +
      (allChanges.length > 20 ? '\n\n...more changes not shown' : ''),
      { modal: true },
      'Apply Changes',
      'Cancel'
    );

    if (choice !== 'Apply Changes') {
      vscode.window.showInformationMessage('ID fix cancelled.');
      return;
    }

    /**
     * Apply changes
     */
    const edit = new vscode.WorkspaceEdit();
    for (const c of allChanges) {
      edit.replace(c.obj.uri, c.obj.idRange, String(c.newId));
    }

    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      vscode.window.showErrorMessage(
        'AL Object ID Manager: Failed to apply edits.'
      );
      return;
    }

    await vscode.workspace.saveAll();

    vscode.window.showInformationMessage(
      `AL Object ID Manager: ${allChanges.length} object ID(s) fixed successfully.`
    );

  });

  context.subscriptions.push(cmd);
}