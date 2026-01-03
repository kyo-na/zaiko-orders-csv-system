from django.urls import path
from . import views

urlpatterns = [
    path("", views.react_page, name="home"),
    path("pending/", views.react_page, name="pending_page"),
    path("inventory/", views.react_page, name="inventory_page"),
    path("inventory_csv/", views.react_page, name="inventory_csv_page"),
    path("history/", views.react_page, name="history_page"),

    path("api/csrf/", views.csrf, name="api_csrf"),
    path("api/options/", views.api_options, name="api_options"),
    path("api/pending/", views.api_pending, name="api_pending"),
    path("api/order/", views.api_create_order, name="api_create_order"),
    path("api/cancel/", views.api_cancel, name="api_cancel"),
    path("api/confirm/", views.api_confirm_all, name="api_confirm_all"),
    path("api/history/", views.api_history, name="api_history"),
    path("api/summary/", views.api_summary, name="api_summary"),
    path("api/inventory/", views.api_inventory, name="api_inventory"),

    path("api/inventory_csv/lots/", views.api_inventory_csv_lots, name="api_inventory_csv_lots"),
    path("api/inventory_csv/summary/", views.api_inventory_csv_summary, name="api_inventory_csv_summary"),
    path("api/inventory_csv/alerts/", views.api_inventory_csv_alerts, name="api_inventory_csv_alerts"),
    path("api/inventory_csv/export/latest.csv", views.api_inventory_csv_export_latest, name="api_inventory_csv_export_latest"),
    path("api/carryover/report/", views.api_carryover_report, name="api_carryover_report"),
    path("api/carryover/snapshot/", views.api_carryover_snapshot, name="api_carryover_snapshot"),
    path("api/sync/status/", views.api_sync_status, name="api_sync_status"),

    path("api/export/history.csv", views.export_history_csv, name="export_history_csv"),
    path("api/export/ranking.csv", views.export_ranking_csv, name="export_ranking_csv"),
    path("api/export/expiry.csv", views.export_expiry_csv, name="export_expiry_csv"),
]
