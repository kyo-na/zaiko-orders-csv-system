"""ビュー"""
import json
import csv
import io
from datetime import datetime, date

from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseBadRequest
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.dateparse import parse_date
from django.db.models import Count

from .models import Order, Inventory
from .services import (options, confirm_all, MEIBO_CSV, ZAIKO_CSV, inventory_csv_lots, inventory_csv_summary, generate_purchase_candidates, export_purchase_candidates_csv, get_latest_export, carryover_report, create_carryover_snapshot)


def react_page(request):
    return render(request, "orders/react.html", {"dev": settings.DEBUG})


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"ok": True}, json_dumps_params={"ensure_ascii": False})


def api_options(request):
    return JsonResponse(options(), json_dumps_params={"ensure_ascii": False})


def api_pending(request):
    qs = Order.objects.filter(confirmed=False, cancelled=False).order_by("-created_at")
    data = [
        {
            "id": o.id,
            "name": o.name,
            "okazu": o.okazu,
            "okazu_expiry": o.okazu_expiry,
            "gohan": o.gohan,
            "gohan_expiry": o.gohan_expiry,
            "created_at": o.created_at.isoformat(),
            "status": "未確定",
        }
        for o in qs
    ]
    return JsonResponse({"orders": data}, json_dumps_params={"ensure_ascii": False})


@require_http_methods(["POST"])
def api_create_order(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("invalid json")

    name = (payload.get("name") or "").strip()
    okazu = (payload.get("okazu") or "").strip()
    okazu_expiry = (payload.get("okazu_expiry") or "").strip()
    gohan = (payload.get("gohan") or "").strip()
    gohan_expiry = (payload.get("gohan_expiry") or "").strip()

    if not name:
        return HttpResponseBadRequest("name required")
    if okazu and not okazu_expiry:
        return HttpResponseBadRequest("okazu_expiry required")
    if gohan and not gohan_expiry:
        return HttpResponseBadRequest("gohan_expiry required")
    if not okazu and not gohan:
        return HttpResponseBadRequest("okazu or gohan required")

    Order.objects.create(
        name=name,
        okazu=okazu,
        okazu_expiry=okazu_expiry,
        gohan=gohan,
        gohan_expiry=gohan_expiry,
    )
    return JsonResponse({"ok": True}, json_dumps_params={"ensure_ascii": False})


@require_http_methods(["POST"])
def api_cancel(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("invalid json")
    oid = payload.get("id")
    if not oid:
        return HttpResponseBadRequest("id required")
    o = Order.objects.filter(id=oid, confirmed=False).first()
    if not o:
        return HttpResponseBadRequest("not found")
    o.cancelled = True
    o.save(update_fields=["cancelled"])
    return JsonResponse({"ok": True}, json_dumps_params={"ensure_ascii": False})


@require_http_methods(["POST"])
def api_confirm_all(request):
    return JsonResponse(confirm_all(), json_dumps_params={"ensure_ascii": False})


def api_history(request):
    qs = Order.objects.filter(confirmed=True, cancelled=False).order_by("-created_at")

    name = request.GET.get("name") or ""
    start = request.GET.get("start") or ""
    end = request.GET.get("end") or ""

    if name:
        qs = qs.filter(name=name)
    if start:
        d = parse_date(start)
        if d:
            qs = qs.filter(created_at__date__gte=d)
    if end:
        d = parse_date(end)
        if d:
            qs = qs.filter(created_at__date__lte=d)

    data = [
        {
            "id": o.id,
            "name": o.name,
            "okazu": o.okazu,
            "okazu_expiry": o.okazu_expiry,
            "gohan": o.gohan,
            "gohan_expiry": o.gohan_expiry,
            "created_at": o.created_at.isoformat(),
        }
        for o in qs
    ]
    return JsonResponse({"orders": data}, json_dumps_params={"ensure_ascii": False})


def api_summary(request):
    qs = Order.objects.filter(confirmed=True, cancelled=False)
    start = request.GET.get("start") or ""
    end = request.GET.get("end") or ""
    if start:
        d = parse_date(start)
        if d:
            qs = qs.filter(created_at__date__gte=d)
    if end:
        d = parse_date(end)
        if d:
            qs = qs.filter(created_at__date__lte=d)

    okazu_qs = qs.exclude(okazu="").values("okazu").annotate(cnt=Count("id")).order_by("-cnt")[:50]
    gohan_qs = qs.exclude(gohan="").values("gohan").annotate(cnt=Count("id")).order_by("-cnt")[:50]

    return JsonResponse(
        {
            "okazu": [{"label": x["okazu"], "count": x["cnt"]} for x in okazu_qs],
            "gohan": [{"label": x["gohan"], "count": x["cnt"]} for x in gohan_qs],
        },
        json_dumps_params={"ensure_ascii": False},
    )


def api_inventory(request):
    qs = Inventory.objects.all().order_by("item", "expiry")
    data = [
        {"id": x.id, "item": x.item, "expiry": x.expiry, "qty": x.qty, "refill_line": x.refill_line, "alert": x.alert}
        for x in qs
    ]
    return JsonResponse({"items": data}, json_dumps_params={"ensure_ascii": False})


def _csv_response(filename: str, header: list[str], rows: list[list[str]]):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow(r)
    data = buf.getvalue().encode("utf-8-sig")
    resp = HttpResponse(data, content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def export_history_csv(request):
    qs = Order.objects.filter(confirmed=True, cancelled=False).order_by("-created_at")
    name = request.GET.get("name") or ""
    start = request.GET.get("start") or ""
    end = request.GET.get("end") or ""

    if name:
        qs = qs.filter(name=name)
    if start:
        d = parse_date(start)
        if d:
            qs = qs.filter(created_at__date__gte=d)
    if end:
        d = parse_date(end)
        if d:
            qs = qs.filter(created_at__date__lte=d)

    rows = []
    for o in qs:
        rows.append([
            o.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            o.name,
            o.okazu,
            o.okazu_expiry,
            o.gohan,
            o.gohan_expiry,
        ])
    fn = f"order_history_{date.today().isoformat()}.csv"
    return _csv_response(fn, ["日時", "名前", "おかず", "おかず賞味期限", "ご飯", "ご飯賞味期限"], rows)


def export_ranking_csv(request):
    qs = Order.objects.filter(confirmed=True, cancelled=False)
    start = request.GET.get("start") or ""
    end = request.GET.get("end") or ""
    if start:
        d = parse_date(start)
        if d:
            qs = qs.filter(created_at__date__gte=d)
    if end:
        d = parse_date(end)
        if d:
            qs = qs.filter(created_at__date__lte=d)

    okazu_qs = qs.exclude(okazu="").values("okazu").annotate(cnt=Count("id")).order_by("-cnt")[:200]
    gohan_qs = qs.exclude(gohan="").values("gohan").annotate(cnt=Count("id")).order_by("-cnt")[:200]

    rows = []
    for x in okazu_qs:
        rows.append(["おかず", x["okazu"], x["cnt"]])
    for x in gohan_qs:
        rows.append(["ご飯", x["gohan"], x["cnt"]])

    fn = f"ranking_{date.today().isoformat()}.csv"
    return _csv_response(fn, ["区分", "品目", "件数"], rows)


def export_expiry_csv(request):
    mode = (request.GET.get("mode") or "near").lower()  # near or expired
    days = int(request.GET.get("days") or 3)

    items = []
    for inv in Inventory.objects.all():
        exp = (inv.expiry or "").strip().replace("/", "-")
        try:
            d = datetime.fromisoformat(exp).date()
        except Exception:
            continue
        diff = (d - date.today()).days
        if mode == "expired":
            if diff < 0:
                items.append([inv.item, inv.expiry, str(inv.qty), str(diff)])
        else:
            if 0 <= diff <= days:
                items.append([inv.item, inv.expiry, str(inv.qty), str(diff)])

    fn = f"expiry_{mode}_{date.today().isoformat()}.csv"
    return _csv_response(fn, ["品目", "賞味期限", "在庫数", "残日数"], items)


@require_http_methods(["GET"])
def api_inventory_csv_lots(request):
    return JsonResponse({"lots": inventory_csv_lots()})


@require_http_methods(["GET"])
def api_inventory_csv_summary(request):
    return JsonResponse({"summary": inventory_csv_summary()})


@require_http_methods(["GET"])
def api_inventory_csv_alerts(request):
    # 画面表示用 + 発注候補をCSV出力
    candidates = generate_purchase_candidates()
    export_path = export_purchase_candidates_csv()
    return JsonResponse({
        "alerts": candidates,
        "exported": str(export_path.name),
    })


@require_http_methods(["GET"])
def api_inventory_csv_export_latest(request):
    p = get_latest_export("purchase_candidates")
    if not p:
        # まだ出力が無い場合は生成
        p = export_purchase_candidates_csv()
    with p.open("rb") as f:
        data = f.read()
    resp = HttpResponse(data, content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{p.name}"'
    return resp


@require_http_methods(["GET"])
def api_carryover_report(request):
    return JsonResponse(carryover_report())


@require_http_methods(["POST"])
def api_carryover_snapshot(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        payload = {}
    month = (payload.get("month") or "").strip()
    if not month:
        # 省略時は前月
        today = date.today()
        first = today.replace(day=1)
        prev_last = first - __import__("datetime").timedelta(days=1)
        month = prev_last.strftime("%Y-%m")
    n = create_carryover_snapshot(month)
    return JsonResponse({"ok": True, "month": month, "count": n})


@require_http_methods(["GET"])
def api_sync_status(request):
    # CSV更新検知用（フロントがポーリングする）
    try:
        meibo_mtime = int(MEIBO_CSV.stat().st_mtime)
    except Exception:
        meibo_mtime = 0
    try:
        zaiko_mtime = int(ZAIKO_CSV.stat().st_mtime)
    except Exception:
        zaiko_mtime = 0
    return JsonResponse({"meibo_mtime": meibo_mtime, "zaiko_mtime": zaiko_mtime})
