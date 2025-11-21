import * as vscode from 'vscode';
import { SvgEditorProvider } from './SvgEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('SVG Inspector is now active!');

  context.subscriptions.push(SvgEditorProvider.register(context));

  context.subscriptions.push(vscode.commands.registerCommand('svg-inspector.openPreview', async (uri: vscode.Uri) => {
    console.log('Command svg-inspector.openPreview triggered');
    let targetUri = uri;

    if (!targetUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const isSvgLanguage = activeEditor.document.languageId === 'svg' || activeEditor.document.languageId === 'xml';
        const content = activeEditor.document.getText(new vscode.Range(0, 0, 20, 0));
        const isSvgContent = /<svg/i.test(content);

        if (isSvgLanguage || isSvgContent) {
          targetUri = activeEditor.document.uri;
        }
      }
    }

    console.log('Target URI:', targetUri ? targetUri.toString() : 'undefined');

    if (targetUri) {
      try {
        await vscode.commands.executeCommand('vscode.openWith', targetUri, 'svg-inspector.editor');
        console.log('Executed vscode.openWith successfully');
      } catch (error) {
        console.error('Failed to execute vscode.openWith:', error);
        vscode.window.showErrorMessage(`Failed to open SVG Inspector: ${error}`);
      }
    } else {
      console.warn('No SVG file found to open');
      vscode.window.showWarningMessage('Please open an SVG file first or right-click on an SVG file.');
    }
  }));
}
