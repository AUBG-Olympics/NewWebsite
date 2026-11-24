from sqlalchemy import Column, String, Text

from src.db.database import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    # Single row per key, e.g. "dday_enabled"
    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=True)

