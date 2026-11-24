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
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_link: Mapped[Optional[str]] = mapped_column(String(1023), nullable=True)
    divisions = relationship(
        "EventDivision", back_populates="event",
        order_by="(EventDivision.sort_order, EventDivision.id)",
        cascade="all, delete-orphan",
    )

    # Relationship to submissions
    submissions: Mapped[List["FormSubmission"]] = relationship(
        "FormSubmission", back_populates="event"
    )
