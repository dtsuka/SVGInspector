// Declare the global function
declare const acquireVsCodeApi: () => WebviewApi<unknown>;

interface WebviewApi<State> {
  postMessage(message: unknown): void;
  getState(): State | undefined;
  setState<T extends State | undefined>(newState: T): T;
}

class VSCodeWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current window object
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * Post a message to the extension
   * @param message The message to send
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log("VS Code API not available", message);
    }
  }

  /**
   * Get the persistent state stored for this webview
   * @returns The current state
   */
  public getState(): unknown {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    }
    return undefined;
  }

  /**
   * Set the persistent state stored for this webview
   * @param newState The new state
   */
  public setState<T>(newState: T): T | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    }
    return undefined;
  }
}

// Export a single instance of the wrapper
export const vscode = new VSCodeWrapper();
