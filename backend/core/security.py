import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Look for your Supabase API Key under common environment variable names
SUPABASE_KEY = (
    os.getenv("SUPABASE_KEY") or 
    os.getenv("SUPABASE_ANON_KEY") or 
    os.getenv("SUPABASE_PUBLISHABLE_KEY") or
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

# Initialize FastAPI Bearer scheme
security = HTTPBearer()

# Initialize JWKS Client with required Supabase API Gateway headers and the correct .well-known endpoint
jwks_headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"} if SUPABASE_KEY else {}
jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None
jwks_client = PyJWKClient(jwks_url, headers=jwks_headers) if jwks_url else None


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
            if not SUPABASE_KEY:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="SUPABASE_KEY (or SUPABASE_ANON_KEY) is missing in backend/.env! Required for ES256 JWKS verification."
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