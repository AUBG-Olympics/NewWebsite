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
    separated_genders: Mapped[bool] = mapped_column(Boolean, default=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    max_teammates: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_teammates: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # When separated_genders=True, these override max_participants per gender if set.
    max_participants_male: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_participants_female: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    whatsapp_link: Mapped[Optional[str]] = mapped_column(String(1023), nullable=True)
    enable_waitlist: Mapped[bool] = mapped_column(Boolean, default=True) # Wheather the waitlist is enabled for the event
    waitlist: Mapped[bool] = mapped_column(Boolean, default=False) # Wheather the participant's cap has been reached and we started filling the waitlist
    # Max participants to allow before waitlist begins filling.
    waitlist_max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationship to submissions
    submissions: Mapped[List["FormSubmission"]] = relationship(
        "FormSubmission", back_populates="event"
    )
