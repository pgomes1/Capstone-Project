from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RunIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="ISO date YYYY-MM-DD")
    distanceMiles: float = Field(..., gt=0, description="Distance in miles")
    durationMinutes: float = Field(..., gt=0, description="Duration in minutes")


class RunsBatchCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sessions: list[RunIn] = Field(..., min_length=1)


class RunOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    userId: str
    date: str
    distanceMiles: float
    durationMinutes: float
    createdAt: str


class RunsListData(BaseModel):
    runs: list[RunOut]


class RunsListResponse(BaseModel):
    ok: Literal[True] = True
    data: RunsListData


class RunsAddResponse(BaseModel):
    ok: Literal[True] = True
    data: RunsListData


class RunDeleteData(BaseModel):
    deleted: bool = True


class RunDeleteResponse(BaseModel):
    ok: Literal[True] = True
    data: RunDeleteData
