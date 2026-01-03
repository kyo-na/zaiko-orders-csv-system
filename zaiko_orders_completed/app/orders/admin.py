from django.contrib import admin
from .models import Inventory, Order

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('item', 'expiry', 'qty', 'refill_line', 'alert')
    list_filter = ('item', 'expiry')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'name', 'okazu', 'okazu_expiry', 'gohan', 'gohan_expiry', 'confirmed', 'cancelled')
    list_filter = ('confirmed', 'cancelled', 'name')
