from __future__ import annotations

from pathlib import Path
import csv
from datetime import date
import shutil
import pandas as pd
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Inventory, Order


def _pick_path(candidates: list[str]) -> Path:
    for c in candidates:
        p = Path(c)
        if p.exists():
            return p
    return Path(candidates[0])


def _default_data_dir() -> Path:
    # app/data を最優先（ZIP内の同梱CSV）
    try:
        return Path(settings.BASE_DIR) / "data"
    except Exception:
        # settings 未初期化時の保険
        return Path(__file__).resolve().parent.parent / "data"


DATA_DIR = _default_data_dir()

ZAIKO_CSV = _pick_path([
    str(DATA_DIR / "zaikokanri.csv"),
    str(Path.home() / "Downloads" / "zaikokanri.csv"),
    r"C:\Users\spenc\Downloads\zaikokanri.csv",
    r"C:\Users\FUJITSU\Downloads\zaikokanri.csv",
])

MEIBO_CSV = _pick_path([
    str(DATA_DIR / "meibo.csv"),
    str(Path.home() / "Downloads" / "meibo.csv"),
    r"C:\Users\spenc\Downloads\meibo.csv",
    r"C:\Users\FUJITSU\Downloads\meibo.csv",
])


def _read_csv_safely(path: Path) -> pd.DataFrame:
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            return pd.read_csv(path, encoding=enc)
        except Exception:
            pass
    return pd.read_csv(path, encoding="utf-8", errors="ignore")


def _normalize_date_str(s: str) -> str:
    s = str(s).strip()
    if not s or s.lower() == "nan":
        return ""
    s2 = s.replace("/", "-")
    # 2026-3-7 のようなゼロ埋め無しも許容
    m = __import__("re").match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s2)
    if m:
        y, mo, d = map(int, m.groups())
        try:
            return __import__("datetime").date(y, mo, d).isoformat()
        except Exception:
            return s2
    return s2


def _backup_csv(path: Path, prefix: str):
    try:
        if not path.exists():
            return None
        backup_dir = path.parent / "backup"
        backup_dir.mkdir(parents=True, exist_ok=True)
        ts = timezone.now().strftime("%Y%m%d_%H%M%S")
        dst = backup_dir / f"{prefix}_{ts}{path.suffix}"
        shutil.copy2(path, dst)
        return dst
    except Exception:
        return None


def load_names() -> list[str]:
    df = _read_csv_safely(MEIBO_CSV)
    if df.empty:
        return []
    col = "名前" if "名前" in df.columns else df.columns[0]
    return [str(x).strip() for x in df[col].dropna() if str(x).strip()]


@transaction.atomic
def reload_from_csv() -> None:
    """zaikokanri.csv → Inventory(SQLite) に反映

    - お弁当, 在庫数, 賞味期限, 補填ライン, アラート を優先的に使用
    - CSVが更新されたら次回API呼び出し時に自動で反映（この関数が呼ばれるたびに読み直す）
    """
    df = _read_csv_safely(ZAIKO_CSV)
    if df.empty:
        return

    item_col = "お弁当" if "お弁当" in df.columns else df.columns[0]
    expiry_col = "賞味期限" if "賞味期限" in df.columns else (df.columns[1] if len(df.columns) > 1 else df.columns[0])
    qty_col = "在庫数" if "在庫数" in df.columns else df.columns[-1]
    refill_col = "補填ライン" if "補填ライン" in df.columns else None
    alert_col = "アラート" if "アラート" in df.columns else None

    Inventory.objects.all().delete()

    rows: list[Inventory] = []
    for _, r in df.iterrows():
        item = str(r.get(item_col, "")).strip()
        expiry_raw = str(r.get(expiry_col, "")).strip()
        expiry = _normalize_date_str(expiry_raw)
        try:
            qty = int(float(r.get(qty_col, 0) or 0))
        except Exception:
            qty = 0
        try:
            refill_line = int(float(r.get(refill_col, 0) or 0)) if refill_col else 0
        except Exception:
            refill_line = 0
        alert = str(r.get(alert_col, "")).strip() if alert_col else ""
        if alert.lower() == "nan":
            alert = ""
        if item:
            rows.append(Inventory(item=item, expiry=expiry, qty=qty, refill_line=refill_line, alert=alert))

    if rows:
        Inventory.objects.bulk_create(rows, ignore_conflicts=True)


def _write_inventory_back() -> None:
    df = _read_csv_safely(ZAIKO_CSV)
    if df.empty:
        return

    item_col = "お弁当" if "お弁当" in df.columns else df.columns[0]
    expiry_col = "賞味期限" if "賞味期限" in df.columns else (df.columns[1] if len(df.columns) > 1 else df.columns[0])
    qty_col = "在庫数" if "在庫数" in df.columns else df.columns[-1]

    lookup = {(i.item.strip(), i.expiry.strip()): int(i.qty) for i in Inventory.objects.all()}

    def norm(x):
        return str(x).strip()

    new_qty = []
    for _, r in df.iterrows():
        key = (norm(r.get(item_col, "")), norm(r.get(expiry_col, "")))
        q = lookup.get(key)
        if q is None:
            q = r.get(qty_col, 0)
        new_qty.append(q)

    df[qty_col] = new_qty
    df.to_csv(ZAIKO_CSV, index=False, encoding="utf-8-sig")


def options() -> dict:
    reload_from_csv()
    inv = list(Inventory.objects.all())

    names = load_names()
    okazu = sorted({i.item for i in inv if not str(i.item).startswith("ご飯")})
    gohan = sorted({i.item for i in inv if str(i.item).startswith("ご飯")})

    item_to_expiry: dict[str, list[str]] = {}
    qty_map: dict[str, dict[str, int]] = {}

    for i in inv:
        item_to_expiry.setdefault(i.item, [])
        if i.expiry and i.expiry not in item_to_expiry[i.item]:
            item_to_expiry[i.item].append(i.expiry)

        qty_map.setdefault(i.item, {})
        qty_map[i.item][i.expiry] = int(i.qty)

    for k in item_to_expiry:
        item_to_expiry[k] = sorted(item_to_expiry[k])

    return {
        "names": names,
        "okazu_items": okazu,
        "gohan_items": gohan,
        "item_to_expiry": item_to_expiry,
        "qty_map": qty_map,
    }


@transaction.atomic
def confirm_all() -> dict:
    orders = Order.objects.filter(confirmed=False, cancelled=False).order_by("created_at")
    if not orders.exists():
        return {"confirmed": 0}

    reload_from_csv()
    _backup_csv(ZAIKO_CSV, "zaikokanri")

    def dec(item: str, expiry: str):
        if not item:
            return
        obj = Inventory.objects.filter(item=item, expiry=expiry).first()
        if not obj:
            obj = Inventory.objects.filter(item=item).first()
        if obj:
            obj.qty = max(0, int(obj.qty) - 1)
            obj.save(update_fields=["qty"])

    now = timezone.now()
    n = 0
    for o in orders:
        dec(o.okazu, o.okazu_expiry)
        dec(o.gohan, o.gohan_expiry)
        o.confirmed = True
        o.confirmed_at = now
        o.save(update_fields=["confirmed", "confirmed_at"])
        n += 1

    _write_inventory_back()
    return {"confirmed": n}


def inventory_csv_lots() -> list[dict]:
    reload_from_csv()
    inv = Inventory.objects.all().order_by("item", "expiry")
    return [
        {
            "item": i.item,
            "expiry": i.expiry,
            "qty": i.qty,
            "refill_line": i.refill_line,
            "alert": i.alert or "",
        }
        for i in inv
    ]


def inventory_csv_summary(today: date | None = None) -> list[dict]:
    """お弁当ごと（ロット合算）の在庫/閾値/アラート計算"""
    reload_from_csv()
    if today is None:
        today = date.today()

    lots = list(Inventory.objects.all())
    by_item: dict[str, dict] = {}
    for l in lots:
        d = by_item.setdefault(l.item, {"item": l.item, "total_qty": 0, "threshold": 0, "earliest_expiry": "", "lots": 0})
        d["total_qty"] += int(l.qty or 0)
        d["threshold"] = max(d["threshold"], int(l.refill_line or 0))
        d["lots"] += 1
        if l.expiry:
            if not d["earliest_expiry"] or l.expiry < d["earliest_expiry"]:
                d["earliest_expiry"] = l.expiry

    out = []
    for item, d in sorted(by_item.items(), key=lambda x: x[0]):
        total_qty = d["total_qty"]
        threshold = d["threshold"]
        earliest = d["earliest_expiry"]
        days_to_expiry = None
        if earliest:
            try:
                ed = parse_date(earliest)
                if ed:
                    days_to_expiry = (ed - today).days
            except Exception:
                days_to_expiry = None

        level = "OK"
        reasons = []
        if threshold and total_qty < threshold:
            level = "WARN"
            reasons.append(f"在庫 {total_qty} < 補填ライン {threshold}")
        if days_to_expiry is not None:
            if days_to_expiry < 0:
                level = "CRITICAL"
                reasons.append("賞味期限切れロットあり")
            elif days_to_expiry <= 3 and level != "CRITICAL":
                level = "WARN"
                reasons.append("賞味期限が近い(<=3日)")
            elif days_to_expiry <= 7 and level == "OK":
                level = "INFO"
                reasons.append("賞味期限が近い(<=7日)")

        out.append({
            "item": item,
            "total_qty": total_qty,
            "threshold": threshold,
            "earliest_expiry": earliest,
            "alert_level": level,
            "reasons": reasons,
        })
    return out


def generate_purchase_candidates() -> list[dict]:
    """在庫が閾値を下回ったお弁当を発注候補として返す"""
    summary = inventory_csv_summary()
    cands = []
    for s in summary:
        th = int(s.get("threshold") or 0)
        qty = int(s.get("total_qty") or 0)
        if th and qty < th:
            cands.append({
                "item": s["item"],
                "current_qty": qty,
                "threshold": th,
                "need": th - qty,
                "earliest_expiry": s.get("earliest_expiry") or "",
                "alert_level": s.get("alert_level") or "WARN",
            })
    return cands


def export_purchase_candidates_csv() -> Path:
    """発注候補CSVを data/exports に書き出し（最新ファイルを返す）"""
    exports_dir = DATA_DIR / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    ts = timezone.now().strftime("%Y%m%d_%H%M%S")
    path = exports_dir / f"purchase_candidates_{ts}.csv"

    cands = generate_purchase_candidates()
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["品目", "現在在庫", "補填ライン", "必要数", "最短賞味期限", "レベル"])
        for c in cands:
            w.writerow([c["item"], c["current_qty"], c["threshold"], c["need"], c["earliest_expiry"], c["alert_level"]])
    return path


def get_latest_export(prefix: str) -> Path | None:
    exports_dir = DATA_DIR / "exports"
    if not exports_dir.exists():
        return None
    files = sorted(exports_dir.glob(f"{prefix}_*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def create_carryover_snapshot(month: str) -> int:
    """指定月(YYYY-MM)の繰越スナップショットを作成（同月分は上書き）"""
    from .models import CarryoverSnapshot

    reload_from_csv()
    CarryoverSnapshot.objects.filter(month=month).delete()

    rows = []
    for i in Inventory.objects.all():
        rows.append(CarryoverSnapshot(month=month, item=i.item, expiry=i.expiry, qty=i.qty))
    if rows:
        CarryoverSnapshot.objects.bulk_create(rows, ignore_conflicts=True)
    return len(rows)


def carryover_report(today: date | None = None) -> dict:
    """前月繰越の差分/賞味期限/ロスをまとめる"""
    from .models import CarryoverSnapshot

    if today is None:
        today = date.today()
    # 前月
    first = today.replace(day=1)
    prev_last = first - __import__("datetime").timedelta(days=1)
    month = prev_last.strftime("%Y-%m")

    reload_from_csv()
    current = {(i.item, i.expiry): int(i.qty or 0) for i in Inventory.objects.all()}
    snaps = list(CarryoverSnapshot.objects.filter(month=month))
    rows = []
    for s in snaps:
        key = (s.item, s.expiry)
        now_qty = current.get(key, 0)
        diff = now_qty - int(s.qty or 0)
        expired = False
        days_to = None
        if s.expiry:
            try:
                d = parse_date(s.expiry)
                if d:
                    days_to = (d - today).days
                    expired = days_to < 0
            except Exception:
                pass
        loss_qty = now_qty if expired and now_qty > 0 else 0
        rows.append({
            "month": month,
            "item": s.item,
            "expiry": s.expiry,
            "prev_qty": int(s.qty or 0),
            "current_qty": now_qty,
            "diff": diff,
            "days_to_expiry": days_to,
            "expired": expired,
            "loss_qty": loss_qty,
        })
    return {"month": month, "has_snapshot": bool(snaps), "rows": rows}
