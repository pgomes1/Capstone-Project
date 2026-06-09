from fastapi import APIRouter

from models.common import SuccessEnvelope
from scripts import health_script


router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
def get_health() -> SuccessEnvelope[dict]:
    return SuccessEnvelope(data=health_script.check())
