from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sport = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    name = Column(String, nullable=False)
    teammates = Column(String(500), nullable=True)
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=False)

    event = relationship("Event", back_populates="submissions")
