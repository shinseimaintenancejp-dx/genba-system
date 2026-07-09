import pytest

from app.modules.schedule.service import ScheduleService

class DummyGenbaSchedule:
    def __init__(self, new_year_work=False, obon_work=False, holiday_rule="OFF"):
        self.new_year_work = new_year_work
        self.obon_work = obon_work
        self.holiday_rule = holiday_rule

class DummyContractRule:
    def __init__(self, rule_type, action):
        self.rule_type = rule_type
        self.action = action

class TestHolidayPriority:
    def test_resolve_holiday_action_contract_overrides_genba(self):
        """Test: contract SKIP + genba WORK → output = SKIP"""
        # Genba says WORK for NEW_YEAR
        genba_schedule = DummyGenbaSchedule(new_year_work=True)
        # Contract says SKIP (休む) for NEW_YEAR
        contract_rules = [DummyContractRule(rule_type="NEW_YEAR", action="SKIP")]
        
        # Resolve
        action = ScheduleService.resolve_holiday_action(
            target_holiday_type="NEW_YEAR",
            genba_schedule=genba_schedule,
            contract_rules=contract_rules
        )
        assert action == "SKIP"

    def test_resolve_holiday_action_genba_fallback(self):
        """Test: contract no rules + genba SHIFT_BEFORE → output = SHIFT_BEFORE"""
        # Genba says SHIFT_BEFORE for NATIONAL_HOLIDAY
        genba_schedule = DummyGenbaSchedule(holiday_rule="SHIFT_BEFORE")
        # Contract has no rules
        contract_rules = []
        
        # Resolve
        action = ScheduleService.resolve_holiday_action(
            target_holiday_type="NATIONAL_HOLIDAY",
            genba_schedule=genba_schedule,
            contract_rules=contract_rules
        )
        assert action == "SHIFT_BEFORE"

    def test_resolve_holiday_action_obon(self):
        """Test OBON fallback"""
        # Genba says WORK for OBON
        genba_schedule = DummyGenbaSchedule(obon_work=True)
        action = ScheduleService.resolve_holiday_action(
            target_holiday_type="OBON",
            genba_schedule=genba_schedule,
            contract_rules=None
        )
        assert action == "WORK"
