from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, text
from sqlalchemy.orm import relationship

from src.db.database import Base


class EventDivision(Base):
    __tablename__ = "event_divisions"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    min_teammates = Column(Integer, nullable=False, default=0, server_default=text("0"))
    max_teammates = Column(Integer, nullable=False, default=0, server_default=text("0"))
    max_participants = Column(Integer, nullable=True)
    waitlist_max_participants = Column(Integer, nullable=False, default=0, server_default=text("0"))
    sort_order = Column(Integer, nullable=False, default=0, server_default=text("0"))
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))

    event = relationship("Event", back_populates="divisions")
    submissions = relationship("FormSubmission", back_populates="division")
