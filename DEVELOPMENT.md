# 開発者向け情報

この拡張機能は以下の構成で開発されています。

- **Extension Host**: TypeScript
- **Webview UI**: React + Vite

## ビルド手順

初回セットアップ:

```bash
pnpm install
cd webview-ui && pnpm install
```

Webview のビルド:

```bash
cd webview-ui && pnpm build
```

デバッグ実行:
VS Code の「実行とデバッグ」サイドバーから "Run Extension" を選択して実行してください。起動時に TypeScript の watch と `webview-ui` の Vite dev server が自動で開始されます。

## 拡張機能のパッケージ化 (.vsix の作成)

### プロジェクトルートで実行
```bash
pnpm package
```
