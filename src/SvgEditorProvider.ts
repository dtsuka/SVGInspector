import * as vscode from 'vscode';

export class SvgEditorProvider implements vscode.CustomTextEditorProvider {

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new SvgEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(SvgEditorProvider.viewType, provider);
    return providerRegistration;
  }

  private static readonly viewType = 'svg-inspector.editor';

  constructor(
    private readonly context: vscode.ExtensionContext
  ) { }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log('SvgEditorProvider: resolveCustomTextEditor called');
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Send initial content
    // this.updateWebview(webviewPanel.webview, document); // Wait for ready signal

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage(e => {
      console.log('SvgEditorProvider: Received message', e.type);
      switch (e.type) {
        case 'ready':
          console.log('SvgEditorProvider: Sending initial content');
          this.updateWebview(webviewPanel.webview, document);
          return;
        case 'updateSvg':
          this.updateTextDocument(document, e.svgText);
          return;
      }
    });

    // Listen for changes in the document (e.g. from other editors)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        this.updateWebview(webviewPanel.webview, document);
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
    webview.postMessage({
      type: 'load',
      svgText: document.getText(),
    });
  }

  private updateTextDocument(document: vscode.TextDocument, svgText: string) {
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document content
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      svgText
    );

    return vscode.workspace.applyEdit(edit);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Check if we are in development mode
    const isProduction = this.context.extensionMode === vscode.ExtensionMode.Production;

    let scriptUri: vscode.Uri | string;
    let styleUri: vscode.Uri | string;

    if (isProduction) {
      // Production: Load from build folder
      scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
        this.context.extensionUri, 'webview-ui', 'build', 'assets', 'index.js'
      ));
      styleUri = webview.asWebviewUri(vscode.Uri.joinPath(
        this.context.extensionUri, 'webview-ui', 'build', 'assets', 'index.css'
      ));
    } else {
      // Development: Load from Vite dev server
      scriptUri = 'http://127.0.0.1:5173/src/main.tsx';
      styleUri = ''; // CSS is injected by Vite
    }

    const cspSource = webview.cspSource;
    const nonce = this.getNonce();
    const scriptSrc = isProduction
      ? `'nonce-${nonce}'`
      : `'unsafe-inline' 'unsafe-eval' http://127.0.0.1:5173 http://0.0.0.0:5173`;

    const styleSrc = isProduction
      ? `${webview.cspSource} 'unsafe-inline'`
      : `'unsafe-inline' http://127.0.0.1:5173 http://0.0.0.0:5173`;

    const connectSrc = isProduction
      ? `'none'`
      : `http://127.0.0.1:5173 http://0.0.0.0:5173 ws://127.0.0.1:5173 ws://0.0.0.0:5173`;

    const reactRefreshPreamble = isProduction ? '' : `
      <script type="module">
        import RefreshRuntime from "http://127.0.0.1:5173/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${styleSrc}; script-src ${scriptSrc}; connect-src ${connectSrc};">
        ${reactRefreshPreamble}
        ${isProduction ? `<link href="${styleUri}" rel="stylesheet" />` : ''}
        <title>SVG Inspector</title>
      </head>
      <body>
        <div id="root"></div>
        ${!isProduction ? `<script type="module" src="http://127.0.0.1:5173/@vite/client"></script>` : ''}
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
