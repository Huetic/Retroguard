import sys
from pathlib import Path

# Add backend/ to sys.path so tests can do `from ml_service import ...`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
