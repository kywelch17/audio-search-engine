import os
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
DATA_DIR = os.getenv("ASE_DATA_DIR", "./data")
DB_PATH = os.getenv("ASE_DB_PATH", os.path.join(DATA_DIR, "ase.db"))
CORS_ORIGINS = [o.strip() for o in os.getenv("ASE_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()]
