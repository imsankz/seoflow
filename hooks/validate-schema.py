import json
import sys
import pathlib

if len(sys.argv) < 2:
    sys.exit(0)

path = pathlib.Path(sys.argv[1])
if not path.exists() or path.suffix.lower() != '.json':
    sys.exit(0)

try:
    json.loads(path.read_text(encoding='utf-8'))
except Exception as exc:
    print(f'Invalid JSON in {path}: {exc}')
    sys.exit(1)
