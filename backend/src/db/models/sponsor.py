from sqlalchemy import Column, Integer, String
from src.db import Base

class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    logo = Column(String)
