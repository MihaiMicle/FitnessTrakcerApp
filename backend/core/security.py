import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv

# 1. Load environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# 2. Initialize FastAPI Bearer scheme
security = HTTPBearer()

# 3. Initialize JWKS Client for ES256 (Supabase's modern asymmetric signing)
jwks_url = f"{SUPABASE_URL}/auth/v1/jwks.json" if SUPABASE_URL else None
jwks_client = PyJWKClient(jwks_url) if jwks_url else None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """Verifies the Supabase Bearer JWT and returns the user's UUID string."""
    token = credentials.credentials
    try:
        # Inspect the token header to check if Supabase signed with ES256 or HS256
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        print("ACTUAL TOKEN ALGORITHM:", alg)

        if alg in ["ES256", "RS256"]:
            if not jwks_client:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="SUPABASE_URL is not set in backend/.env for JWKS verification"
                )
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            secret_or_key = signing_key.key
        else:
            # Fallback for traditional HS256 JWT secrets
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="SUPABASE_JWT_SECRET is not set in backend/.env"
                )
            secret_or_key = SUPABASE_JWT_SECRET

        payload = jwt.decode(
            token,
            secret_or_key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
            leeway=60  # Allow 60 seconds of clock skew
        )
        
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token: missing user ID"
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token expired. Please log in again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Authentication failed: {str(e)}"
        )