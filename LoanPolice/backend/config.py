import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve BASE_DIR to the root workspace (one level up from backend/config.py)
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from the root directory
load_dotenv(dotenv_path=BASE_DIR / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", None)

# LLM Configs (falls back to global OpenAI variables if not set)
LLM_API_KEY = os.getenv("LLM_API_KEY") or OPENAI_API_KEY
LLM_API_BASE = os.getenv("LLM_API_BASE") or OPENAI_API_BASE
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# Embedding Configs (falls back to global OpenAI variables if not set)
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY") or OPENAI_API_KEY
EMBEDDING_API_BASE = os.getenv("EMBEDDING_API_BASE") or OPENAI_API_BASE
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Resolve database path absolutely in the root workspace
DB_PATH = BASE_DIR / "loan_assistant.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkeyforloanapprovalassistant123!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Storage paths
UPLOAD_DIR = BASE_DIR / "uploads"
CHROMA_DB_DIR = BASE_DIR / "chroma_db"
KNOWLEDGE_BASE_DIR = BASE_DIR / "knowledgebase"

# Ensure directories exist
UPLOAD_DIR.mkdir(exist_ok=True)
CHROMA_DB_DIR.mkdir(exist_ok=True)

# Basic validation
if not LLM_API_KEY or LLM_API_KEY == "your_openai_api_key_here":
    print("WARNING: LLM_API_KEY is not set or contains the default placeholder. LLM calls will fail.")

def get_embeddings():
    """
    Dynamically returns the appropriate embedding function based on the API configuration.
    If Ollama is configured, it will use the native OllamaEmbeddings class to ensure compatibility.
    """
    if EMBEDDING_API_KEY == "ollama" or (EMBEDDING_API_BASE and "11434" in EMBEDDING_API_BASE):
        import socket
        from urllib.parse import urlparse
        from langchain_community.embeddings import OllamaEmbeddings
        
        base_url = EMBEDDING_API_BASE
        if base_url:
            if base_url.endswith("/v1"):
                base_url = base_url[:-3]
            elif base_url.endswith("/v1/"):
                base_url = base_url[:-4]
        
        # Test connection to Ollama port to fail fast if it's not running
        target_url = base_url or "http://localhost:11434"
        parsed = urlparse(target_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 11434
        
        try:
            with socket.create_connection((host, port), timeout=2.0) as conn:
                pass
        except Exception:
            raise ConnectionError(
                f"\n[Error] Could not connect to Ollama at '{host}:{port}'.\n"
                "Please make sure that the Ollama desktop application is installed, running, and active in your system tray."
            )
            
        return OllamaEmbeddings(
            model=EMBEDDING_MODEL,
            base_url=target_url
        )
    else:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            openai_api_key=EMBEDDING_API_KEY,
            openai_api_base=EMBEDDING_API_BASE,
            model=EMBEDDING_MODEL,
            chunk_size=16  # Batch requests to avoid size limit errors on free APIs
        )
