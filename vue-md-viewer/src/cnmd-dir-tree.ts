import type { InjectionKey } from "vue";

export function normalizeDirPath(p: string): string {
  if (!p) return "/";
  let s = p;
  if (!s.startsWith("/")) s = "/" + s;
  if (!s.endsWith("/")) s += "/";
  return s.replace(/\/+/g, "/");
}

/** parentPath 与目录名拼成子目录绝对路径（尾随 /） */
export function joinDir(parentPath: string, dirName: string): string {
  const parent = normalizeDirPath(parentPath).replace(/\/+$/, "");
  return normalizeDirPath(parent + "/" + dirName + "/");
}

export type DirEntryKind = "dir" | "md" | "other";

export type DirEntry = {
  name: string;
  kind: DirEntryKind;
  sizeStr: string;
  mtimeStr: string;
};

export type CnmdDirTreeApi = {
  toggleDir: (dirPath: string) => void;
  isExpanded: (dirPath: string) => boolean;
  isLoading: (dirPath: string) => boolean;
  getError: (dirPath: string) => string | undefined;
  getChildren: (dirPath: string) => DirEntry[];
  openMd: (parentPath: string, fileName: string) => void;
};

export const CNMD_DIR_TREE_KEY: InjectionKey<CnmdDirTreeApi> =
  Symbol("cnmdDirTree");
