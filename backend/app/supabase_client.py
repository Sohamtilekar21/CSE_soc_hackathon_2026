from supabase import create_client, Client
from app.config import settings

# Server-side client using the service_role key.
# This BYPASSES row level security, so only use it after you've
# verified the requesting user's identity (see app/auth.py).
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
