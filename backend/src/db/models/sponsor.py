from sqlalchemy import Column, Integer, String
from src.db.database import Base


class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    # Tier/group name for grouping sponsors in the UI (e.g. "financial").
    tier = Column(String(255), nullable=True)
    website = Column(String(1023))
    logo = Column(String(1023))
