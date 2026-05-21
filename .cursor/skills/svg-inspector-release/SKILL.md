---
name: svg-inspector-release
description: >-
  SVG Inspector VS Code 拡張の dev→main マージ、バージョンタグ、vsix ビルド、GitHub
  Release 公開までの手順。ユーザーが main へマージ、リリース、タグ付け、vsix 公開、
  v0.1.x リリース、GitHub Release と言ったときに使う。
---

# SVG Inspector Release

## 対象

リポジトリ: `/Users/d_tsukada/Sites/SVGInspector`（`dtsuka/SVGInspector`）

- バージョン: ルート `package.json` の `version`（例: `0.1.11`）
- タグ名: `v` + version（例: `v0.1.11`）
- vsix: `dist/svg-inspector-<version>.vsix`（`pnpm package` で生成）
- パッケージ詳細: [DEVELOPMENT.md](../../../DEVELOPMENT.md)

## 前提

- `gh` CLI が認証済みであること
- リリース対象の変更は **dev にコミット済み** であること
- **ユーザーが明示しない限り** `git push --force` しない

## リリース手順

### 1. 開始状態の確認

```bash
git status --short --branch
git branch --show-current
node -p "require('./package.json').version"
git fetch origin --tags
git log --oneline origin/main..dev 2>/dev/null || git log --oneline main..dev
```

- 未コミットの `package.json`（バージョン上げ）があれば先にコミット:

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore: バージョンをX.Y.Zに更新
EOF
)"
```

（`X.Y.Z` は実際の version に置き換える）

### 2. dev → main へマージ

```bash
git switch main
git fetch origin
```

**`origin/main` とローカル `main` が分岐している場合**（PR マージ済みで履歴がずれている）:

```bash
git rebase origin/main   # dev 側の独自コミットを main に載せ直す場合は、先に dev で作業済みなら main は merge のみ
```

通常は fast-forward または merge:

```bash
git merge dev
```

マージ後: `git status` が clean であること。

### 3. vsix ビルド

プロジェクトルートで:

```bash
pnpm package
```

成功確認:

```bash
ls -la dist/svg-inspector-*.vsix
```

`package.json` の version とファイル名のバージョンが一致すること。

### 4. リモートへプッシュ（main / dev 同期）

```bash
git push origin main
git switch dev
git rebase main
git push origin dev
git switch main
```

### 5. タグ作成・プッシュ

既存タグ確認:

```bash
git tag --list 'v*' | tail -5
git tag --list 'v<VERSION>'
```

なければ annotated tag:

```bash
git tag -a v<VERSION> -m "v<VERSION>"
git push origin v<VERSION>
```

### 6. GitHub Release 作成（vsix をアセットに添付）

直前タグからのコミットをノートに使う:

```bash
git log --oneline v<PREV>..v<VERSION>
```

リリース作成（既存なら `gh release view` で確認してからスキップまたは上書き方針をユーザーに確認）:

```bash
gh release create v<VERSION> \
  "./dist/svg-inspector-<VERSION>.vsix" \
  --title "v<VERSION>" \
  --notes "$(cat <<'EOF'
## 変更内容

- （v<PREV>..v<VERSION> のコミットを日本語で箇条書き）

## インストール

1. 下記の `svg-inspector-<VERSION>.vsix` をダウンロード
2. VS Code で「Extensions: Install from VSIX...」を実行

```bash
code --install-extension svg-inspector-<VERSION>.vsix
```
EOF
)"
```

検証:

```bash
gh release view v<VERSION>
```

## 分岐時の判断

| 状況 | 対応 |
|------|------|
| `main` と `origin/main` が分岐 | `git rebase origin/main`（main 上）してから push |
| タグ `v<VERSION>` が既に存在 | 新規作成せず、ユーザーに確認 |
| Release が既に存在 | `gh release upload` または再作成の可否をユーザーに確認 |
| vsix ビルド失敗 | `cd webview-ui && pnpm install && pnpm build` のログを確認し、修正後に `pnpm package` を再実行 |

## 完了報告

ユーザーへ次を伝える:

- マージしたブランチ（`dev` → `main`）
- タグ名と `origin` への push 結果
- GitHub Release URL
- 添付アセット名（`svg-inspector-<VERSION>.vsix`）
- リリースノートに載せた主な変更

## コミットメッセージ（バージョン更新時）

ユーザールールに従い日本語 + Prefix:

```
chore: バージョンを0.1.11に更新
```
