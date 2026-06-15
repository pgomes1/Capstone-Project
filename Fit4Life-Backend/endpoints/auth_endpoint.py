from fastapi import APIRouter

from models.auth import SigninRequest, SigninResponse, SignupRequest, SignupResponse
from scripts import auth_script


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", response_model=SignupResponse)
def post_signup(req: SignupRequest) -> SignupResponse:
    data = auth_script.signup(email=req.email, password=req.password, name=req.name)
    return SignupResponse(data=data)


@router.post("/signin", response_model=SigninResponse)
def post_signin(req: SigninRequest) -> SigninResponse:
    data = auth_script.signin(email=req.email, password=req.password)
    return SigninResponse(data=data)
