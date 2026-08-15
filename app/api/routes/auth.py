import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import PersonalCalendarEvent, User, UserSession
from app.schemas.auth import AuthResponse, CalendarEventCreate, CalendarEventResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=2**14, r=8, p=1).hex()
    return f"{salt}${digest}"


def _verify(password: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return hmac.compare_digest(_hash(password, salt), stored)


def _user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, display_name=user.display_name)


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    session = db.query(UserSession).filter(UserSession.token == authorization[7:]).first()
    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인 세션이 만료되었습니다.")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return user


def _create_session(user: User, db: Session) -> AuthResponse:
    token = secrets.token_urlsafe(48)
    db.add(UserSession(user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(days=30)))
    db.commit()
    return AuthResponse(token=token, user=_user_response(user))


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="올바른 이메일 주소를 입력하세요.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")
    user = User(email=email, display_name=payload.display_name.strip(), password_hash=_hash(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return _create_session(user, db)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user or not _verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return _create_session(user, db)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)):
    return _user_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        db.query(UserSession).filter(UserSession.token == authorization[7:]).delete()
        db.commit()


@router.get("/calendar-events", response_model=list[CalendarEventResponse])
def list_events(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(PersonalCalendarEvent).filter(PersonalCalendarEvent.user_id == user.id).order_by(PersonalCalendarEvent.event_date, PersonalCalendarEvent.id).all()


@router.post("/calendar-events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: CalendarEventCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    event = PersonalCalendarEvent(user_id=user.id, **payload.model_dump())
    db.add(event); db.commit(); db.refresh(event)
    return event


@router.delete("/calendar-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    event = db.query(PersonalCalendarEvent).filter(PersonalCalendarEvent.id == event_id, PersonalCalendarEvent.user_id == user.id).first()
    if not event: raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")
    db.delete(event); db.commit()
