import * as vscode from 'vscode';

export interface IdRange {
  from: number;
  to: number;
}

export interface AlObject {
  type: string;
  id: number;
  name?: string;
  uri: vscode.Uri;
  idRange: vscode.Range;
  lineStart: number;
}

export const SUPPORTED_OBJECT_TYPES = [
  'table',
  'codeunit',
  'page',
  'report',
  'enum',
  'interface',
  'pageextension',
  'tableextension',
  'enumextension',
  'permissionset',
  'xmlport',
  'query',
  'permissionsetextension',
  'profile',
  'profileextension',
  'controladdin',
];
