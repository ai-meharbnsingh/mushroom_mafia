"""add_pincode_to_plants_and_status_to_rooms

Revision ID: 019668703033
Revises: 45c122ce3d5d
Create Date: 2026-03-11 23:14:02.323129

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '019668703033'
down_revision: Union[str, None] = '45c122ce3d5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    roomstatus_enum = sa.Enum('ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'INACTIVE', name='roomstatus')
    roomstatus_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('plants', sa.Column('pincode', sa.String(length=10), nullable=True))
    op.add_column('rooms', sa.Column('status', roomstatus_enum, nullable=True, server_default='ACTIVE'))
    op.execute("UPDATE rooms SET status = 'ACTIVE' WHERE status IS NULL")


def downgrade() -> None:
    op.drop_column('rooms', 'status')
    op.drop_column('plants', 'pincode')
    sa.Enum(name='roomstatus').drop(op.get_bind(), checkfirst=True)
