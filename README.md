\# 在庫管理システム（CSV運用）



React + Vite + MUI + Django + SQLite + CSV を用いた  

お弁当在庫管理・閾値アラート・発注候補生成システム。



\## 主な機能

\- CSV連動在庫管理

\- 補填ライン（閾値）アラート

\- 発注候補CSV自動生成

\- 前月繰越 / 賞味期限 / ロスチェック

\- CSV変更の自動反映（画面 \& SQLite）



\## 技術スタック

\- Frontend: React + Vite + MUI

\- Backend: Python (Django)

\- DB: SQLite

\- Data: CSV（将来 GAS / Spreadsheet 連携想定）



\## 起動方法



\### Backend

```bash

cd app

python manage.py migrate

python manage.py runserver



