from datetime import date
from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    event_date: date
    time: str | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    is_all_day: bool = True


class CalendarEventResponse(CalendarEventCreate):
    id: int
