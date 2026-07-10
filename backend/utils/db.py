import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

def get_database_url():
    # Attempt to load from parent .env.local first
    env_local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env.local')
    if os.path.exists(env_local_path):
        with open(env_local_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    url = line.split('=', 1)[1].strip()
                    # Strip quotes if present
                    if url.startswith('"') or url.startswith("'"):
                        url = url[1:-1]
                    # Convert postgresql:// to postgresql+psycopg2:// if needed
                    if url.startswith('postgresql://'):
                        url = url.replace('postgresql://', 'postgresql+psycopg2://', 1)
                    url = url.replace('\\$', '$')
                    return url

    # Fallback to os.environ
    url = os.environ.get('DATABASE_URL')
    if url:
        if url.startswith('postgresql://'):
            url = url.replace('postgresql://', 'postgresql+psycopg2://', 1)
        return url
        
    return 'postgresql+psycopg2://postgres:c$a$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'

DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
