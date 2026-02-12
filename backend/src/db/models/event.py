from datetime import date as date_type
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base

if TYPE_CHECKING:
    from src.db.models.form import FormSubmission


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    date: Mapped[Optional[date_type]] = mapped_column(Date)
    separated_genders: Mapped[bool] = mapped_column(Boolean, default=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    teammates: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationship to submissions
    submissions: Mapped[List["FormSubmission"]] = relationship(
        "FormSubmission", back_populates="event"
    )
