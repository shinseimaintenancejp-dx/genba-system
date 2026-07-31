"""add_positions

Revision ID: 2ccdc6946876
Revises: 6c5397527b0c
Create Date: 2026-07-30 14:48:10.038165

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision: str = '2ccdc6946876'
down_revision: Union[str, None] = '6c5397527b0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create positions table
    op.create_table('positions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_positions_name'), 'positions', ['name'], unique=True)
    
    # 2. Create staff_positions table
    op.create_table('staff_positions',
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('position_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['position_id'], ['positions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('staff_id', 'position_id')
    )

    # 3. Data Migration
    conn = op.get_bind()
    
    # Get all distinct positions from staff table
    res = conn.execute(sa.text("SELECT DISTINCT position FROM staff WHERE position IS NOT NULL AND position != ''"))
    unique_positions = [row[0] for row in res]
    
    # Create a mapping of position name to new UUID
    pos_map = {}
    now = datetime.now(timezone.utc)
    for pos_name in unique_positions:
        # Split by comma in case they already had multiple positions in text
        parts = [p.strip() for p in pos_name.split(',')]
        for part in parts:
            if part and part not in pos_map:
                pos_id = uuid.uuid4()
                pos_map[part] = pos_id
                conn.execute(sa.text(
                    "INSERT INTO positions (id, name, is_active, created_at, updated_at) "
                    "VALUES (:id, :name, true, :created_at, :updated_at)"
                ), {
                    "id": pos_id, 
                    "name": part, 
                    "created_at": now, 
                    "updated_at": now
                })
    
    # Link staff to positions
    staff_res = conn.execute(sa.text("SELECT id, position FROM staff WHERE position IS NOT NULL AND position != ''"))
    for row in staff_res:
        staff_id = row[0]
        pos_text = row[1]
        parts = [p.strip() for p in pos_text.split(',')]
        for part in parts:
            if part in pos_map:
                # Insert if not exists
                conn.execute(sa.text(
                    "INSERT INTO staff_positions (staff_id, position_id) "
                    "VALUES (:staff_id, :position_id) ON CONFLICT DO NOTHING"
                ), {"staff_id": staff_id, "position_id": pos_map[part]})

    # 4. Drop old column
    op.drop_column('staff', 'position')


def downgrade() -> None:
    # 1. Add column back
    op.add_column('staff', sa.Column('position', sa.String(length=50), nullable=True))
    
    # 2. Data Migration
    conn = op.get_bind()
    res = conn.execute(sa.text(
        "SELECT sp.staff_id, p.name FROM staff_positions sp "
        "JOIN positions p ON sp.position_id = p.id"
    ))
    staff_pos = {}
    for row in res:
        staff_id = row[0]
        pos_name = row[1]
        if staff_id not in staff_pos:
            staff_pos[staff_id] = []
        staff_pos[staff_id].append(pos_name)
        
    for staff_id, names in staff_pos.items():
        pos_str = ", ".join(names)[:50]
        conn.execute(sa.text(
            "UPDATE staff SET position = :pos WHERE id = :id"
        ), {"pos": pos_str, "id": staff_id})

    # 3. Drop tables
    op.drop_table('staff_positions')
    op.drop_index(op.f('ix_positions_name'), table_name='positions')
    op.drop_table('positions')

