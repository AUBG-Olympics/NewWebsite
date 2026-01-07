from sqlalchemy import Boolean, Column, Date, Integer, String
from sqlalchemy.orm import relationship

from src.db.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    date = Column(Date)
    separated_genders = Column(Boolean, default=False)
    is_current = Column(Boolean, default=False)

    # Relationship to submissions
    submissions = relationship("FormSubmission", back_populates="event")
