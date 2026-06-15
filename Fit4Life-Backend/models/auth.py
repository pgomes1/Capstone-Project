from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., min_length=3, description="User email address")
    password: str = Field(..., min_length=6, description="Account password (>= 6 chars)")
    name: str = Field(..., min_length=1, description="Display name")


class SigninRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class SignupUser(BaseModel):
    id: str
    email: str
    name: str | None = None


class SignupData(BaseModel):
    user: SignupUser


class SignupResponse(BaseModel):
    ok: Literal[True] = True
    data: SignupData


class SigninData(BaseModel):
    token: str
    user: SignupUser


class SigninResponse(BaseModel):
    ok: Literal[True] = True
    data: SigninData
