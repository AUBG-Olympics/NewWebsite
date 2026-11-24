from sqlalchemy import Column, Integer, String, Text

from src.db.database import Base


class SponsorTier(Base):
    __tablename__ = "sponsor_tiers"

    id = Column(Integer, primary_key=True, index=True)
    # Stable key used by sponsors (e.g. "financial", "zeus")
    key = Column(String(255), nullable=False, unique=True, index=True)
    # Display name in UI (e.g. "Financial Sponsors")
    label = Column(String(255), nullable=False)
    blurb = Column(Text, nullable=True)

    # Layout hints used by the Sponsors page
    columns = Column(Integer, nullable=True)
    logo_max_width = Column(Integer, nullable=True)
    sort_order = Column(Integer, nullable=True)

