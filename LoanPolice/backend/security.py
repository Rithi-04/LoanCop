from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import config
import models
import schemas
from database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        if username is None or role is None or user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, role=role, user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Role enforcement dependencies
class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: models.User = Depends(get_current_user)) -> models.User:
        # Hierarchy: Manager inherits LoanOfficer permissions
        role_hierarchy = {
            "Customer": ["Customer"],
            "LoanOfficer": ["LoanOfficer"],
            "Manager": ["Manager", "LoanOfficer"] # Manager can do everything a LoanOfficer does
        }
        
        user_permissions = role_hierarchy.get(current_user.role, [])
        
        # Check if the user's role allows access to any of the allowed roles
        has_access = False
        for role in self.allowed_roles:
            if role in user_permissions or current_user.role == role:
                has_access = True
                break
                
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted. Allowed roles: {self.allowed_roles}. Current role: {current_user.role}"
            )
        return current_user

# Helper dependencies
require_customer = RoleChecker(["Customer"])
require_officer = RoleChecker(["LoanOfficer"]) # Managers are also allowed since they inherit LoanOfficer roles
require_manager = RoleChecker(["Manager"])
require_any_user = RoleChecker(["Customer", "LoanOfficer", "Manager"])
