import json
import uuid
from decimal import Decimal
from app.modules.contract.schemas import ContractCreate

payload = {
  "contract_type": "RECEIVING",
  "service_type": "日常清掃",
  "service_category": "DAILY",
  "genba_id": "0d603a15-0550-4521-ba25-780c85c290de",
  "start_date": "2026-06-19",
  "amount": 0,
  "tax_type": "EXCLUSIVE",
  "auto_renew": True,
  "invoice_required": True,
  "work_slots": [{"start_time": "09:00", "end_time": "18:00", "break_minutes": 60, "sort_order": 0}],
  "worker_counts": [{"worker_count": 1, "work_duration_hours": 8, "total_hours": 8, "sort_order": 0}],
  "holiday_rules": [
    {"rule_type": "祝日", "action": "休む"},
    {"rule_type": "年末年始", "action": "休む"},
    {"rule_type": "お盆", "action": "休む"},
    {"rule_type": "GW", "action": "休む"}
  ]
}

try:
    ContractCreate(**payload)
    print("Success!")
except Exception as e:
    print(e.json())
