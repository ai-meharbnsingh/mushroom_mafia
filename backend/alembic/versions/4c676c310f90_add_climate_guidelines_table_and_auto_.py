"""add climate_guidelines table and auto_adjust column

Revision ID: 4c676c310f90
Revises: 8ed3cd187f87
Create Date: 2026-03-11 02:47:33.900054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c676c310f90'
down_revision: Union[str, None] = '8ed3cd187f87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The planttype and growthstage enum types already exist in PostgreSQL
    # from previous migrations, so we use raw SQL to create the table
    # referencing the existing types.
    op.execute("""
        CREATE TABLE climate_guidelines (
            guideline_id SERIAL PRIMARY KEY,
            plant_type planttype NOT NULL,
            growth_stage growthstage NOT NULL,
            temp_min NUMERIC(5, 1),
            temp_max NUMERIC(5, 1),
            humidity_min NUMERIC(5, 1),
            humidity_max NUMERIC(5, 1),
            co2_min NUMERIC(8, 1),
            co2_max NUMERIC(8, 1),
            temp_hysteresis NUMERIC(5, 2),
            humidity_hysteresis NUMERIC(5, 2),
            co2_hysteresis NUMERIC(8, 2),
            duration_days_min INTEGER,
            duration_days_max INTEGER,
            notes TEXT,
            is_default BOOLEAN,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            CONSTRAINT uq_plant_stage UNIQUE (plant_type, growth_stage)
        )
    """)
    op.add_column('growth_cycles', sa.Column('auto_adjust_thresholds', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('growth_cycles', 'auto_adjust_thresholds')
    op.drop_table('climate_guidelines')
