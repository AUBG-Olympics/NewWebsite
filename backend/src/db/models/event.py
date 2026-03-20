from datetime import datetime as date_type
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base

if TYPE_CHECKING:
    from src.db.models.form import FormSubmission


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1023), nullable=True)
    date: Mapped[Optional[date_type]] = mapped_column(DateTime)
    location: Mapped[Optional[str]] = mapped_column(String(511), nullable=True)
    separated_genders: Mapped[bool] = mapped_column(Boolean, default=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    teammates: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    enable_waitlist: Mapped[bool] = mapped_column(Boolean, default=True) # Wheather the waitlist is enabled for the event
    waitlist: Mapped[bool] = mapped_column(Boolean, default=False) # Wheather the participant's cap has been reached and we started filling the waitlist
    waitlist_max_participants: Mapped[Optional[int]] = mapped_column(Boolean, nullable=True)

    # Relationship to submissions
    submissions: Mapped[List["FormSubmission"]] = relationship(
        "FormSubmission", back_populates="event"
    )
