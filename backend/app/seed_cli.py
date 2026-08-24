from __future__ import annotations

import json
import sys
from pathlib import Path

from .database import import_medicines, init_db


def main() -> None:
    init_db()
    if len(sys.argv) == 1:
        print("Database initialized with demo data.")
        return
    source = Path(sys.argv[1])
    data = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Medicine import file must contain a JSON array")
    import_medicines(data)
    print(f"Imported {len(data)} medicine records from {source}.")


if __name__ == "__main__":
    main()
