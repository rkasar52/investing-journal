#!/bin/bash
# Start the investing journal app
cd "$(dirname "$0")"

echo "Starting Flask API on http://localhost:5001 ..."
source .venv/bin/activate
python app.py
