from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sport = Column(String(255), nullable=False)
    division_id = Column(Integer, ForeignKey("event_divisions.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    teammates = Column(String(511), nullable=True)
    team_name = Column(String(255), nullable=True)
    phone_number = Column(String(21), nullable=False)
    email = Column(String(255), nullable=False)

    event = relationship("Event", back_populates="submissions")
    division = relationship("EventDivision", back_populates="submissions")

    @property
    def division_name(self):
        return self.division.name if self.division else None
