"""add firmware_files table

Revision ID: 45c122ce3d5d
Revises: 4c676c310f90
Create Date: 2026-03-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45c122ce3d5d'
down_revision: Union[str, None] = '4c676c310f90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'firmware_files',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_data', sa.LargeBinary(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=False),
        sa.Column('board_type', sa.String(length=50), nullable=True),
        sa.Column('upload_notes', sa.Text(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_firmware_files_version'), 'firmware_files', ['version'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_firmware_files_version'), table_name='firmware_files')
    op.drop_table('firmware_files')
