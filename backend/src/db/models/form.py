from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sport = Column(String(63), nullable=False)
    gender = Column(String(31), nullable=True)
    name = Column(String(255), nullable=False)
    teammates = Column(String(511), nullable=True)
    phone_number = Column(String(21), nullable=False)
    email = Column(String(255), nullable=False)

    event = relationship("Event", back_populates="submissions")
