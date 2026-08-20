import uuid
from decimal import Decimal
from typing import Sequence, Dict

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.contract.models import ContractModel, ContractPeriodicScheduleModel
from app.modules.genba.models import GenbaModel


class ReportRepository:
    @staticmethod
    async def get_monthly_profit_report(db: AsyncSession, year: int, month: int) -> list[dict]:
        """
        Calculate profit for each genba for a specific month.
        Revenue: Sum of active RECEIVING contracts (if PERIODIC, must include 'month' in work_months).
        Partner Cost: Sum of active ORDERING contracts (if PERIODIC, must include 'month' in work_months).
        Inhouse Cost: 0 for now.
        """
        # Fetch all active contracts with their schedules and genba
        stmt = (
            select(ContractModel)
            .options(
                selectinload(ContractModel.periodic_schedule),
                selectinload(ContractModel.genba)
            )
            .where(ContractModel.status == "ACTIVE")
        )
        result = await db.execute(stmt)
        contracts = result.scalars().all()

        genba_stats: Dict[uuid.UUID, dict] = {}

        for contract in contracts:
            # Check if contract is active in this month
            is_active_this_month = True
            if contract.service_category == "PERIODIC" and contract.periodic_schedule:
                # Check if the month is in the work_months array
                if contract.periodic_schedule.work_months and month not in contract.periodic_schedule.work_months:
                    is_active_this_month = False
            
            if not is_active_this_month:
                continue

            genba_id = contract.genba_id
            if genba_id not in genba_stats:
                genba_stats[genba_id] = {
                    "genba_id": genba_id,
                    "genba_name": contract.genba.property_name if contract.genba else "不明",
                    "revenue": Decimal("0.0"),
                    "partner_cost": Decimal("0.0"),
                    "inhouse_cost": Decimal("0.0"),
                }

            if contract.contract_type == "RECEIVING":
                genba_stats[genba_id]["revenue"] += contract.amount or Decimal("0.0")
            elif contract.contract_type == "ORDERING":
                genba_stats[genba_id]["partner_cost"] += contract.amount or Decimal("0.0")

        # Compile final results
        results = []
        for stats in genba_stats.values():
            revenue = stats["revenue"]
            partner_cost = stats["partner_cost"]
            inhouse_cost = stats["inhouse_cost"]
            profit = revenue - partner_cost - inhouse_cost
            
            profit_margin = Decimal("0.0")
            if revenue > 0:
                profit_margin = (profit / revenue) * Decimal("100.0")

            results.append({
                "genba_id": stats["genba_id"],
                "genba_name": stats["genba_name"],
                "revenue": float(revenue),
                "partner_cost": float(partner_cost),
                "inhouse_cost": float(inhouse_cost),
                "profit": float(profit),
                "profit_margin": float(profit_margin)
            })

        return sorted(results, key=lambda x: x["genba_name"])
