from fastapi import APIRouter, Depends, Path

from middleware.auth import AuthedUser, verify_jwt
from models.runs import (
    RunDeleteData,
    RunDeleteResponse,
    RunsAddResponse,
    RunsBatchCreate,
    RunsListData,
    RunsListResponse,
)
from scripts import runs_script


router = APIRouter(prefix="/api/runs", tags=["Runs"])


@router.get("", response_model=RunsListResponse)
def get_runs(authed: AuthedUser = Depends(verify_jwt)) -> RunsListResponse:
    runs = runs_script.list_runs(authed)
    return RunsListResponse(data=RunsListData(runs=runs))


@router.post("", response_model=RunsAddResponse)
def post_runs(
    body: RunsBatchCreate,
    authed: AuthedUser = Depends(verify_jwt),
) -> RunsAddResponse:
    runs = runs_script.add_runs(authed, body.sessions)
    return RunsAddResponse(data=RunsListData(runs=runs))


@router.delete("/{run_id}", response_model=RunDeleteResponse)
def delete_run(
    run_id: str = Path(...),
    authed: AuthedUser = Depends(verify_jwt),
) -> RunDeleteResponse:
    runs_script.delete_run(authed, run_id)
    return RunDeleteResponse(data=RunDeleteData(deleted=True))
