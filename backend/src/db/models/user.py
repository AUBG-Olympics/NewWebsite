from sqlalchemy import Column, Integer, String
from src.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    picture = Column(String(1023), nullable=True)
    role = Column(String(31), default="user")  # "user" or "admin"
