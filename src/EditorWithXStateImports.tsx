import Editor, { EditorProps, Monaco, OnMount } from "@monaco-editor/react";
import { useInterpret } from "@xstate/react";
import type { editor } from "monaco-editor";
import { useRef } from "react";
import { assign, StateNode } from "xstate";
import { createModel } from "xstate/lib/model";
import { editorTheme } from "./editorTheme";
import { parseMachines } from "./parseMachine";
import { prettierLoader } from "./prettier";
import { detectNewImportsToAcquireTypeFor } from "./typeAcquisition";

/**
 * CtrlCMD + Enter => format => update chart
 * Click on update chart button => update chart
 * Click on save/update => save/update to registry
 * CtrlCMD + S => format => save/update to registry
 */

interface EditorWithXStateImportsProps {
  onChange?: (text: string) => void;
  onMount?: OnMount;
  onSave?: () => void;
  onFormat?: () => void;
  onCompile?: (stateNodes: StateNode[]) => void;
  // value: string;
}

// based on the logic here: https://github.com/microsoft/TypeScript-Website/blob/103f80e7490ad75c34917b11e3ebe7ab9e8fc418/packages/sandbox/src/index.ts
const withTypeAcquisition = (
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): editor.IStandaloneCodeEditor => {
  const addLibraryToRuntime = (code: string, path: string) => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(code, path);
    const uri = monaco.Uri.file(path);
    if (monaco.editor.getModel(uri) === null) {
      monaco.editor.createModel(code, "javascript", uri);
    }
  };

  const textUpdated = (code = editor.getModel()!.getValue()) => {
    detectNewImportsToAcquireTypeFor(
      code,
      addLibraryToRuntime,
      window.fetch.bind(window),
      {
        logger: {
          log: process.env.NODE_ENV !== "production" ? console.log : () => {},
          error: console.error,
          warn: console.warn,
        },
      },
    );
  };

  // to enable type acquisition for any module we can introduce a deboouncer like here:
  // https://github.com/microsoft/TypeScript-Website/blob/97a97d460d64c3c363878f11db198d0027885d8d/packages/sandbox/src/index.ts#L204-L213

  textUpdated(
    // those are modules that we actually allow when we load the code at runtime
    // this "prefetches" the types for those modules so the autoimport feature can kick in asap for them
    ["xstate", "xstate/lib/model", "xstate/lib/actions"]
      .map((specifier) => `import '${specifier}'`)
      .join("\n"),
  );

  return editor;
};

const editorCompileModel = createModel(
  {
    monacoRef: null as Monaco | null,
    standaloneEditorRef: null as editor.IStandaloneCodeEditor | null,
    mainFile: "main.ts",
  },
  {
    events: {
      EDITOR_TEXT_CHANGED: () => ({}),
      EDITOR_READY: (
        monacoRef: Monaco,
        standaloneEditorRef: editor.IStandaloneCodeEditor,
      ) => ({ monacoRef, standaloneEditorRef }),
      "done.invoke.compile": (data: Array<StateNode>) => ({ data }),
    },
  },
);

const machine = editorCompileModel.createMachine(
  {
    initial: "waitingForEditorToBeReady",
    states: {
      waitingForEditorToBeReady: {
        on: {
          EDITOR_READY: {
            target: "editorReady",
            actions: [
              assign({
                monacoRef: (_, e) => e.monacoRef,
                standaloneEditorRef: (_, e) => e.standaloneEditorRef,
              }),
            ],
          },
        },
      },
      editorReady: {
        initial: "compiling",
        on: {
          EDITOR_TEXT_CHANGED: {
            target: ".throttling",
            internal: false,
          },
        },
        states: {
          idle: {},
          throttling: {
            after: {
              200: {
                target: "compiling",
              },
            },
          },
          compiling: {
            invoke: {
              src: "compile",
              onDone: {
                target: "idle",
                actions: "onCompile",
              },
              onError: {
                target: "idle",
              },
            },
          },
        },
      },
    },
  },
  {
    services: {
      compile: async (ctx) => {
        const monaco = ctx.monacoRef!;
        const uri = monaco.Uri.parse(ctx.mainFile);
        const tsWoker = await monaco.languages.typescript
          .getTypeScriptWorker()
          .then((worker) => worker(uri));

        const syntaxErrors = await tsWoker.getSyntacticDiagnostics(
          uri.toString(),
        );

        if (syntaxErrors.length > 0) {
          return;
        }

        const compiledSource = await tsWoker
          .getEmitOutput(uri.toString())
          .then((result) => result.outputFiles[0].text);

        return parseMachines(compiledSource);
      },
    },
  },
);

export const EditorWithXStateImports = (
  props: EditorWithXStateImportsProps & EditorProps,
) => {
  const editorRef = useRef<typeof editor | null>(null);

  const service = useInterpret(machine, {
    actions: {
      onCompile: (context, e) => {
        if (e.type !== "done.invoke.compile") return;

        props.onCompile?.(e.data);
      },
    },
  });

  return (
    <Editor
      {...props}
      defaultPath="main.ts"
      defaultLanguage="typescript"
      value={props.value}
      options={{
        minimap: { enabled: false },
        tabSize: 2,
        glyphMargin: true,
      }}
      onChange={(text) => {
        if (typeof text === "string") {
          props.onChange?.(text);
        }
        service.send({
          type: "EDITOR_TEXT_CHANGED",
        });
      }}
      theme="vs-dark"
      onMount={async (editor, monaco) => {
        editorRef.current = monaco.editor;
        monaco.editor.defineTheme("xstate-viz", editorTheme);
        monaco.editor.setTheme("xstate-viz");

        service.send({
          type: "EDITOR_READY",
          monacoRef: monaco,
          standaloneEditorRef: editor,
        });

        monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
          customWorkerPath: `${new URL(window.location.origin)}ts-worker.js`,
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          moduleResolution:
            monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          strict: true,
        });

        // Prettier to format
        // Ctrl/CMD + Enter to visualize
        editor.addAction({
          id: "format",
          label: "Format",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: (editor) => {
            editor.getAction("editor.action.formatDocument").run();
          },
        });

        monaco.languages.registerDocumentFormattingEditProvider("typescript", {
          provideDocumentFormattingEdits: async (model) => {
            try {
              return [
                {
                  text: await prettierLoader.format(editor.getValue()),
                  range: model.getFullModelRange(),
                },
              ];
            } catch (err) {
              console.error(err);
            } finally {
              props.onFormat?.();
            }
          },
        });

        const wrappedEditor = withTypeAcquisition(editor, monaco);
        props.onMount?.(wrappedEditor, monaco);
      }}
    />
  );
};

export default EditorWithXStateImports;
