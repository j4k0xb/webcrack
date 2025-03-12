import * as monaco from 'monaco-editor';
import { useDeobfuscateContext } from '../context/DeobfuscateContext';
import { evalCode } from '../sandbox';

export function registerEvalSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.IDisposable {
  const { setAlert } = useDeobfuscateContext();

  const codeAction = monaco.languages.registerCodeActionProvider('javascript', {
    provideCodeActions(_model, range) {
      if (range.isEmpty()) return;
      return {
        actions: [
          {
            title: 'Evaluate and replace (value)',
            kind: 'refactor',
            command: {
              id: 'editor.action.evaluate-expression',
              title: 'Evaluate and replace (value)',
            },
          },
          {
            title: 'Evaluate and replace (raw)',
            kind: 'refactor',
            command: {
              id: 'editor.action.evaluate-raw',
              title: 'Evaluate and replace (raw)',
            },
          },
        ],
        dispose: () => {},
      };
    },
  });

  const evalValuesCommand = monaco.editor.registerCommand(
    'editor.action.evaluate-expression',
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    evalValues,
  );
  const evalRawCommand = monaco.editor.registerCommand(
    'editor.action.evaluate-raw',
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    evalRaw,
  );

  const evalValueAction = editor.addAction({
    id: 'editor.action.evaluate-expression',
    label: 'Evaluate and replace selection (value)',
    precondition: 'editorHasSelection',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
    run: evalValues,
  });

  const evalRawAction = editor.addAction({
    id: 'editor.action.evaluate-raw',
    label: 'Evaluate and replace selection (raw)',
    precondition: 'editorHasSelection',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
    ],
    run: evalRaw,
  });

  async function evalValues() {
    const selections = editor.getSelections();
    if (!selections) return;

    const t = await import('@babel/types');
    const { default: generate } = await import('@babel/generator');

    await evalSelections(
      selections,
      (value) => generate(t.valueToNode(value)).code,
    );
  }

  async function evalRaw() {
    const selections = editor.getSelections();
    if (!selections) return;
    await evalSelections(selections, (value) => {
      if (typeof value !== 'string') {
        console.error(value);
        throw new Error('Evaluated value must be a string');
      }
      return value;
    });
  }

  async function evalSelections(
    ranges: monaco.Range[],
    mapper: (value: unknown) => string,
  ) {
    if (ranges.some((range) => range.isEmpty())) return;

    const expressions = ranges.map((range) => {
      const value = editor.getModel()!.getValueInRange(range);
      return `eval(${JSON.stringify(value)})`;
    });
    const code = `[${expressions.join(',')}]`;
    try {
      const values = (await evalCode(code)) as unknown[];

      const edits = ranges.map((range, index) => ({
        range,
        text: mapper(values[index]),
      }));

      editor.pushUndoStop();
      editor.executeEdits('evaluate-expression', edits);
      setAlert(null);
    } catch (error) {
      setAlert(`${String(error)}, at ${ranges.join(', ')}`);
    }
  }

  return {
    dispose() {
      codeAction.dispose();
      evalValuesCommand.dispose();
      evalValueAction.dispose();
      evalRawCommand.dispose();
      evalRawAction.dispose();
    },
  };
}
