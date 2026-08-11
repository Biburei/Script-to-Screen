#!/bin/bash
echo "============================================================"
echo "  Starting Reddit Shorts Automation Pipeline"
echo "============================================================"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python main.py "$@"
