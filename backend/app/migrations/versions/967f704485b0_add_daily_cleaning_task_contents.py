"""
Add daily cleaning task contents

Revision ID: 967f704485b0
Revises: 6d8ab6752668
Create Date: 2026-07-06 23:47:52.174493+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = '967f704485b0'
down_revision: str | Sequence[str] | None = '6d8ab6752668'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create daily_cleaning_task_contents table
    op.create_table('daily_cleaning_task_contents',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('task_id', sa.UUID(), nullable=False),
        sa.Column('area_name', sa.String(length=500), nullable=False),
        sa.Column('work_content', sa.Text(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['daily_cleaning_tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_cleaning_task_contents_task_id'), 'daily_cleaning_task_contents', ['task_id'], unique=False)

    # 2. Migrate existing data (if any)
    op.execute(
        """
        INSERT INTO daily_cleaning_task_contents (task_id, area_name, work_content, sort_order)
        SELECT id, area_name, work_content, sort_order
        FROM daily_cleaning_tasks
        WHERE area_name IS NOT NULL AND work_content IS NOT NULL;
        """
    )

    # 3. Drop old columns from daily_cleaning_tasks
    op.drop_column('daily_cleaning_tasks', 'area_name')
    op.drop_column('daily_cleaning_tasks', 'work_content')
    op.drop_column('daily_cleaning_tasks', 'sort_order')


def downgrade() -> None:
    # 1. Add columns back to daily_cleaning_tasks
    op.add_column('daily_cleaning_tasks', sa.Column('area_name', sa.String(length=200), nullable=True))
    op.add_column('daily_cleaning_tasks', sa.Column('work_content', sa.Text(), nullable=True))
    op.add_column('daily_cleaning_tasks', sa.Column('sort_order', sa.Integer(), server_default='0', nullable=True))

    # 2. Restore data (we can only restore one content per task, we take the first one ordered by sort_order)
    op.execute(
        """
        UPDATE daily_cleaning_tasks t
        SET area_name = sub.area_name,
            work_content = sub.work_content,
            sort_order = sub.sort_order
        FROM (
            SELECT DISTINCT ON (task_id) task_id, area_name, work_content, sort_order
            FROM daily_cleaning_task_contents
            ORDER BY task_id, sort_order ASC
        ) sub
        WHERE t.id = sub.task_id;
        """
    )

    # Set them to NOT NULL if possible, but there might be data issues, so we leave it as True or update missing ones.
    op.execute("UPDATE daily_cleaning_tasks SET area_name = '' WHERE area_name IS NULL")
    op.execute("UPDATE daily_cleaning_tasks SET work_content = '' WHERE work_content IS NULL")
    
    op.alter_column('daily_cleaning_tasks', 'area_name', nullable=False)
    op.alter_column('daily_cleaning_tasks', 'work_content', nullable=False)
    op.alter_column('daily_cleaning_tasks', 'sort_order', nullable=False)

    # 3. Drop daily_cleaning_task_contents table
    op.drop_index(op.f('ix_daily_cleaning_task_contents_task_id'), table_name='daily_cleaning_task_contents')
    op.drop_table('daily_cleaning_task_contents')
