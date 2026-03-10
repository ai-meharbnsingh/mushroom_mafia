"""add_relay_config_and_schedule

Revision ID: 4770d3122eab
Revises: d6969b656e15
Create Date: 2026-03-11 01:03:52.918261

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '4770d3122eab'
down_revision: Union[str, None] = 'd6969b656e15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Reference existing PostgreSQL enum types (do NOT re-create them)
relaytype = postgresql.ENUM('CO2', 'HUMIDITY', 'TEMPERATURE', 'AHU', 'HUMIDIFIER', 'DUCT_FAN', 'EXTRA', name='relaytype', create_type=False)
triggertype = postgresql.ENUM('MANUAL', 'AUTO', 'SCHEDULE', name='triggertype', create_type=False)
thresholdparameter = postgresql.ENUM('CO2', 'HUMIDITY', 'TEMPERATURE', name='thresholdparameter', create_type=False)


def upgrade() -> None:
    op.create_table('relay_config',
    sa.Column('config_id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('device_id', sa.Integer(), nullable=False),
    sa.Column('relay_type', relaytype, nullable=False),
    sa.Column('mode', triggertype, nullable=False),
    sa.Column('threshold_param', thresholdparameter, nullable=True),
    sa.Column('action_on_high', sa.String(length=3), nullable=True),
    sa.Column('action_on_low', sa.String(length=3), nullable=True),
    sa.Column('updated_by', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['device_id'], ['devices.device_id'], ),
    sa.ForeignKeyConstraint(['updated_by'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('config_id'),
    sa.UniqueConstraint('device_id', 'relay_type', name='uq_device_relay_config')
    )
    op.create_index('idx_relay_config_device', 'relay_config', ['device_id'], unique=False)

    op.create_table('relay_schedule',
    sa.Column('schedule_id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('device_id', sa.Integer(), nullable=False),
    sa.Column('relay_type', relaytype, nullable=False),
    sa.Column('days_of_week', sa.Integer(), nullable=False),
    sa.Column('time_on', sa.String(length=5), nullable=False),
    sa.Column('time_off', sa.String(length=5), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['device_id'], ['devices.device_id'], ),
    sa.PrimaryKeyConstraint('schedule_id')
    )
    op.create_index('idx_relay_schedule_active', 'relay_schedule', ['is_active'], unique=False)
    op.create_index('idx_relay_schedule_device', 'relay_schedule', ['device_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_relay_schedule_device', table_name='relay_schedule')
    op.drop_index('idx_relay_schedule_active', table_name='relay_schedule')
    op.drop_table('relay_schedule')
    op.drop_index('idx_relay_config_device', table_name='relay_config')
    op.drop_table('relay_config')
