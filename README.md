# アイディア生成アプリ

粒（単語・文章・概念）を箱に入れ、箱 × 箱 × … でランダムに組み合わせてアイディアを生み出す Web アプリ。
特定の粒を固定（アンカー）して残りだけを引き直したり、気に入った組み合わせをメモ付きで保存できる。
データはブラウザ内（IndexedDB）にのみ保存される。

## 開発

```sh
npm install
npm run dev    # 開発サーバー
npm test       # テスト
npm run build  # 本番ビルド
```

main への push で GitHub Pages に自動デプロイされる（リポジトリの Settings → Pages で Source を「GitHub Actions」にする）。
