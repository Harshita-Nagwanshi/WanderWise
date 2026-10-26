from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

Interest = Literal["adventure", "food", "culture", "nature", "shopping", "sightseeing"]
MAX_DAYS = 14


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    origin: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    travelers: int = Field(ge=1, le=20)
    budget: float = Field(gt=0, le=100_000_000)
    currency: Literal["INR", "USD", "EUR", "GBP"] = "INR"
    style: Literal["budget", "balanced", "luxury"] = "balanced"
    interests: list[Interest] = Field(min_length=1)
    variation: int = 0

    @field_validator("destination", "origin")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("must be at least 2 characters")
        return v

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (self.end_date - self.start_date).days + 1 > MAX_DAYS:
            raise ValueError(f"trips are limited to {MAX_DAYS} days")
        return self

    @property
    def days(self) -> int:
        return (self.end_date - self.start_date).days + 1


class TripIn(TripRequest):
    itinerary: Optional[dict] = None
    source: Optional[Literal["ai", "demo"]] = None
