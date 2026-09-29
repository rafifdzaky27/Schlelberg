#!/bin/bash
# Wait for every task listed in raw/prop-tasks.json plus Tobious.
cd "$(dirname "$0")"
python3 tripo_client.py wait 993dd6b7-0d01-4524-aaf9-72d3c1eb034d tobious model-cartoon 2>&1 | tail -1
for n in portal jar lamp basket timber rubble tools; do
  id=$(python3 -c "import json;print(json.load(open('raw/prop-tasks.json'))['$n'])")
  python3 tripo_client.py wait $id $n model 2>&1 | tail -1
done
python3 tripo_client.py balance
