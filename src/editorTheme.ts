import type { editor } from "monaco-editor";

export type EditorThemeDefinition = editor.IStandaloneThemeData & {
  name: string;
};

export const editorTheme: EditorThemeDefinition = {
  base: "vs-dark",
  inherit: true,
  name: "XState Viz",
  rules: [],
  colors: { "editor.background": "#151618" },
};
