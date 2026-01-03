"""
自動発注（将来拡張用）

ここでは「発注候補CSVの生成」までは有効化済み。
Google Apps Script / スプレッドシート / メール送信は運用環境により
認証情報が必要になるため、あえて “コメントアウト” でソースを残しています。

使い方の例（Django側から呼ぶ想定）:
  - services.export_purchase_candidates_csv() でCSV作成
  - このファイルの関数を有効化して、Sheet作成 or メール送信
"""

# from __future__ import annotations
# import os
# from pathlib import Path
# import requests
#
# def create_google_sheet_from_csv(csv_path: Path) -> str:
#     """
#     Google Sheets API でスプレッドシートを作成する例
#     - サービスアカウント or OAuth 認証が必要
#     """
#     raise NotImplementedError
#
# def send_mail_with_attachment(to_addr: str, subject: str, body: str, csv_path: Path) -> None:
#     """
#     SMTP でメール送信する例
#     - 運用環境のSMTP情報が必要
#     """
#     raise NotImplementedError
#
# def call_gas_webapp(gas_url: str, payload: dict) -> dict:
#     """
#     GAS Web App にPOSTして、スプレッドシート出力/メール送信を行う例
#     - GAS側で doPost を実装し、URLを控えておく
#     """
#     res = requests.post(gas_url, json=payload, timeout=30)
#     res.raise_for_status()
#     return res.json()
