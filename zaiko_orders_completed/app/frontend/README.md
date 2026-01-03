# React + MUI フロントエンド (zaiko_orders_ALLINONE2)

このフォルダは Django(既存) の `/api/*` をそのまま利用して、
Bootstrap テンプレートを React + MUI に置き換えるためのフロントエンドです。

## 使い方 (開発)
1. Django 起動 (別ターミナル)
   ```bash
   cd app
   python manage.py runserver
   ```

2. React 起動
   ```bash
   cd app/frontend
   npm install
   npm run dev
   ```

- ブラウザ: http://localhost:5173/
- API は Vite の proxy で Django(8000) に転送します。

## 使い方 (buildしてDjangoから配布)
```bash
cd app/frontend
npm install
npm run build
```

`app/frontend/dist` を Django 側の static にコピーしてください。

推奨コピー先:
- `app/orders/static/orders/react/`

コピー例(Windows PowerShell):
```powershell
Remove-Item -Recurse -Force .\app\orders\static\orders\react -ErrorAction SilentlyContinue
Copy-Item -Recurse .\app\frontend\dist .\app\orders\static\orders\react
```

Django のテンプレート `orders/react.html` が以下の固定パスで読み込みます:
- `static/orders/react/assets/index.js`
- `static/orders/react/assets/index.css`

`settings.py` の `DEBUG=False` でテンプレートが build 版を読む想定です。
