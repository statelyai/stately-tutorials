import { useMachine } from "@xstate/react";
import classNames from "classnames";
import type * as monaco from "monaco-editor";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/dist/client/router";
import dynamic from "next/dynamic";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { lessonMachine } from "../../lessons/lessonRunner.machine";
import { courseMeta } from "../../lessons/lessons/courses/meta";
import { CourseType } from "../../lessons/LessonType";

const Editor = dynamic(import("@monaco-editor/react"), { ssr: false });

export const getStaticPaths: GetStaticPaths = async (context) => {
  const fs = await import("fs");
  const path = await import("path");

  const lessonFolderPath = path.resolve(
    process.cwd(),
    "src/lessons/lessons/courses",
  );

  const dirs = fs.readdirSync(lessonFolderPath);

  return {
    paths: dirs.map((dir) => {
      return {
        params: {
          lessonId: dir,
        },
      };
    }),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const lessonDir = context.params?.lessonId as string;

  const fs = await import("fs");
  const path = await import("path");

  const lessonFolderPath = path.resolve(
    process.cwd(),
    "src/lessons/lessons/courses",
    lessonDir,
  );

  const markdownFiles: string[] = fs
    .readdirSync(lessonFolderPath)
    .filter((filePath) => filePath.endsWith(".md"))
    .map((file) =>
      fs.readFileSync(path.resolve(lessonFolderPath, file)).toString(),
    );

  return {
    props: {
      markdownFiles,
      id: lessonDir,
    },
  };
};

const LessonDemo = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
  const course = courseMeta.find((course) => course.id === props.id)?.course;

  if (!course) return null;

  return <LessonInner course={course} markdownFiles={props.markdownFiles} />;
};

export default LessonDemo;

const LessonInner = (props: {
  course: CourseType;
  markdownFiles: string[];
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const router = useRouter();

  const [state, send] = useMachine(lessonMachine, {
    context: {
      course: props.course,
      fileText: props.course.initialMachineText,
    },
    actions: {
      autoFormatEditor: () => {
        editorRef.current?.getAction("editor.action.formatDocument").run();
      },
      goToIndexPage: () => {
        router.push("/");
      },
    },
  });

  return (
    <div className="flex items-stretch w-full h-full min-h-screen">
      <div className="flex-shrink-0 p-6 overflow-y-auto border-r w-96">
        <ReactMarkdown
          components={{
            h1: (props) => (
              <h1 {...props} className="mb-6 text-2xl font-bold"></h1>
            ),
            p: (props) => <p {...props} className="mb-4"></p>,
          }}
        >{`${props.markdownFiles[state.context.lessonIndex]}`}</ReactMarkdown>
      </div>
      <div className="flex flex-col flex-1">
        <Editor
          height="400px"
          language="typescript"
          onChange={(text) => {
            send({
              type: "TEXT_EDITED",
              text: text ?? "",
            });
          }}
          options={{
            tabSize: 2,
            minimap: {
              enabled: false,
            },
          }}
          onMount={async (editor, monaco) => {
            editorRef.current = editor;
            const [indexFile] = await Promise.all([
              fetch(`/xstate.txt`).then((res) => res.text()),
            ]);

            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
              {
                noSemanticValidation: true,
              },
            );

            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              `${indexFile}`,
            );
          }}
          value={state.context.fileText}
        />
        <div className="flex-1 w-full p-4 px-6 bg-black">
          {state.context.terminalLines.map((line, index) => {
            return (
              <p
                className={classNames(
                  line.color === "red" && "text-red-400",
                  line.color === "green" && "text-green-400",
                  line.color === "white" && "text-white",
                  line.color === "gray" && "text-gray-300",
                  line.color === "blue" && "text-blue-400",
                  line.color === "yellow" && "text-yellow-200",
                  "font-mono text-sm",
                  line.bold && "font-bold",
                  "leading-loose",
                )}
                key={index}
              >
                {line.icon === "check" && (
                  <span className="mr-2 text-xl">✔️</span>
                )}
                {line.icon === "arrow-right" && (
                  <span className="mr-2 text-xl">➡</span>
                )}
                {line.icon === "clock" && (
                  <span className="mr-2 text-xl">⏱️</span>
                )}
                {line.icon === "cross" && (
                  <span className="mr-2 text-xl">✖️</span>
                )}
                {`${line.text}`}
              </p>
            );
          })}
          {state.hasTag("testsPassed") && (
            <button
              onClick={() => send("GO_TO_NEXT_LESSON")}
              className="px-4 py-2 mt-3 font-mono text-sm font-semibold text-black uppercase bg-green-400"
            >
              Next Lesson
            </button>
          )}
          {state.hasTag("testsNotPassed") && (
            <button
              // onClick={() => send("GO_TO_NEXT_LESSON")}
              className="px-4 py-2 mt-3 font-mono text-sm font-semibold text-black uppercase bg-red-400"
            >
              Show Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
