import asyncio
from app.modules.contract.schemas import ContractCreate
from app.modules.contract.service import contract_service

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
  "holiday_rules": [{"rule_type": "祝日", "action": "休む"}]
}
data = ContractCreate(**payload)

async def test():
    try:
        await contract_service.create_contract(None, data, "test_user")
    except Exception as e:
        print("ERROR:", type(e), e)

asyncio.run(test())
