from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    DateTime,
    JSON,
    Enum,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import AuditAction


class AuditLog(Base):
    __tablename__ = "audit_log"

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action = Column(Enum(AuditAction), nullable=False)
    table_name = Column(String(50))
    record_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_table", "table_name"),
        Index("idx_audit_created", "created_at"),
    )
