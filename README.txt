# 起動方法（パス短縮版）

このZIPは Windows の「パスが長すぎる」対策として **node_modules を同梱していません**。
展開後に `npm install` が必要です。

## 1) Django 起動
cd z\app
python manage.py migrate
python manage.py runserver

## 2) React(Vite) 起動（別ターミナル）
cd z\app\frontend
npm install
npm run dev

ブラウザ: http://127.0.0.1:8000/

※ `DEBUG=True` のときは Django テンプレートが Vite(5173) を参照するため、
Djangoだけ起動すると画面が真っ白になります。必ず両方起動してください。


# 追加機能: 在庫管理（CSV運用）タブ

URL: http://127.0.0.1:8000/inventory_csv/

- zaikokanri.csv / meibo.csv を読み込み、API呼び出しのたびに SQLite(Inventory) に同期します
- フロントは /api/sync/status/ をポーリングして、CSV更新を検知したら自動リフレッシュします

## ① 在庫閾値
- お弁当ごとに在庫をロット合算
- 補填ライン（zaikokanri.csv の「補填ライン」列の最大値）を下回ると WARN
- 賞味期限切れロットがあると CRITICAL（暫定ルール）

## ② アラート
- 補填ライン割れの品目を「発注候補」として表示
- 同時に data/exports に purchase_candidates_*.csv を出力
- 画面の「発注候補CSVをダウンロード」で最新ファイルを取得

## ③ 自動発注（拡張用）
- CSV出力は実装済み
- GAS / スプレッドシート / メール送信は orders/auto_order_integrations.py にコメントアウトで雛形を残しています

## ④ 前月繰越
- 前月のスナップショット（CarryoverSnapshot）と現在在庫を比較
- 「前月スナップショット作成」を押すと前月(YYYY-MM)を上書き保存します
- ロス推定は暫定的に「賞味期限切れ & 現在在庫が残っている数量」を表示

※ 運用ルール（閾値計算/ロス算出/スナップショットの作成タイミング）は今後調整できます。
