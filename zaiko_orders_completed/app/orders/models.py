"""DBモデル"""
from django.db import models


class Inventory(models.Model):
    """在庫（CSV由来）"""
    item = models.CharField(max_length=200)
    expiry = models.CharField(max_length=50)
    qty = models.IntegerField(default=0)
    refill_line = models.IntegerField(default=0)
    alert = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        unique_together = ('item', 'expiry')

    def __str__(self):
        return f"{self.item} ({self.expiry}) qty={self.qty}"



class CarryoverSnapshot(models.Model):
    """前月繰越スナップショット（月末時点の在庫）"""
    month = models.CharField(max_length=7)  # YYYY-MM
    item = models.CharField(max_length=200)
    expiry = models.CharField(max_length=50)
    qty = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('month', 'item', 'expiry')

    def __str__(self):
        return f"{self.month} {self.item} {self.expiry} qty={self.qty}"


class Order(models.Model):
    """注文（仮送信 → 一括確定）"""
    name = models.CharField(max_length=100)
    okazu = models.CharField(max_length=200, blank=True, default="")
    okazu_expiry = models.CharField(max_length=50, blank=True, default="")
    gohan = models.CharField(max_length=50, blank=True, default="")
    gohan_expiry = models.CharField(max_length=50, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    cancelled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} {self.okazu}/{self.gohan} confirmed={self.confirmed} cancelled={self.cancelled}"
