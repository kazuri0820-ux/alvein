# alvein

配布物は単一ファイルの `index.html`（そのままブラウザで開いて遊べる）。開発ソースは `src/` に分割されており、`src/` を編集した後は `node build.js` を実行して `index.html` を再生成する（npm依存なし、Node標準ライブラリのみ）。`index.html` を直接編集しないこと。