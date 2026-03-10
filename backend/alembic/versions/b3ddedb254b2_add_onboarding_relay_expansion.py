"""add_onboarding_relay_expansion

Revision ID: b3ddedb254b2
Revises: 10477b6ee802
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3ddedb254b2'
down_revision: Union[str, None] = '10477b6ee802'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Expand subscriptionstatus enum with PENDING_APPROVAL
    op.execute("ALTER TYPE subscriptionstatus ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL'")

    # 2. Expand relaytype enum with new relay types
    op.execute("ALTER TYPE relaytype ADD VALUE IF NOT EXISTS 'AHU'")
    op.execute("ALTER TYPE relaytype ADD VALUE IF NOT EXISTS 'HUMIDIFIER'")
    op.execute("ALTER TYPE relaytype ADD VALUE IF NOT EXISTS 'DUCT_FAN'")
    op.execute("ALTER TYPE relaytype ADD VALUE IF NOT EXISTS 'EXTRA'")

    # 3. Add new columns to devices table for onboarding
    op.add_column('devices', sa.Column('linked_by_user_id', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('linked_at', sa.DateTime(), nullable=True))
    op.add_column('devices', sa.Column('qr_code_image', sa.Text(), nullable=True))

    # 4. Add foreign key constraint for linked_by_user_id
    op.create_foreign_key(
        'fk_devices_linked_by_user',
        'devices', 'users',
        ['linked_by_user_id'], ['user_id'],
    )


def downgrade() -> None:
    # Drop foreign key and columns (enum values cannot be removed in PostgreSQL
    # without recreating the type, so we leave them)
    op.drop_constraint('fk_devices_linked_by_user', 'devices', type_='foreignkey')
    op.drop_column('devices', 'qr_code_image')
    op.drop_column('devices', 'linked_at')
    op.drop_column('devices', 'linked_by_user_id')
