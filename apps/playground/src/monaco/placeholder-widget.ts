import * as monaco from 'monaco-editor';

// Based on https://github.com/microsoft/monaco-editor/issues/568#issuecomment-1499966160
export class PlaceholderContentWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement;

  constructor(
    private readonly placeholder: string,
    private readonly editor: monaco.editor.ICodeEditor,
  ) {
    this.domNode = document.createElement('div');
    this.domNode.className = 'placeholder';
    this.domNode.textContent = this.placeholder;
    this.domNode.style.width = 'max-content';
    this.domNode.style.fontStyle = 'italic';
    this.domNode.style.pointerEvents = 'none';
    this.editor.applyFontInfo(this.domNode);

    editor.onDidChangeModel(() => this.onDidChangeModelContent());
    editor.onDidChangeModelContent(() => this.onDidChangeModelContent());
    this.editor.addContentWidget(this);
  }

  private onDidChangeModelContent() {
    const shown =
      this.editor.getValue() === '' &&
      this.editor.getModel()?.uri.scheme === 'untitled';
    this.domNode.style.display = shown ? 'block' : 'none';
  }

  getId() {
    return 'editor.widget.placeholderHint';
  }

  getDomNode() {
    return this.domNode;
  }

  getPosition() {
    return {
      position: { lineNumber: 1, column: 1 },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  dispose() {
    this.editor.removeContentWidget(this);
  }
}
