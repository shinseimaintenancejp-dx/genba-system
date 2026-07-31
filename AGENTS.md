# AI Working Agreement

## Absolute Rules

Always follow:

- .agent/rules/*
- .agent/skills/*
- coding standards
- architecture principles
- implementation_plan.md

## Never

- Refactor outside scope
- Change API contracts without reason
- Break backward compatibility
- Ignore tests

## After every change

- Run lint
- Run type check
- Update tests
- Self-review

## Output format

Files Modified
Summary
Risks
Manual Verification Checklist

## UI/UX Rules

- Never use browser native `window.confirm()` or `window.alert()`. Always use custom UI popups/dialogs (e.g. Radix UI Dialog) for confirmations to maintain consistent design.
- All UI labels, placeholders, titles, buttons, and error messages must be 100% in Japanese (日本語). Never include English translations, annotations, or English text in UI elements (e.g. use "役職" instead of "役職 (Position)").
- All list management screens must use the standard page layout hierarchy (header flex bar, search toolbar card, count badge, primary action button `#1E60F2`) and MUST use the shared `<DataTable>` component for table display and pagination.
- All search inputs and filter comboboxes in toolbar cards across all list management screens MUST have explicit top title labels (e.g. `<label className="block text-xs font-medium text-slate-600 mb-1">...`) matching the standard `現場一覧表` search toolbar layout.
- All dropdown list select-all or default filtering options across all screens MUST use "すべて" as the text (e.g. use "すべて" instead of "全て", "全...", "すべての取引先", "すべてのステータス", etc.).