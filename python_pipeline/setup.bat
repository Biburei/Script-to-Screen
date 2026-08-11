@echo off
echo ============================================================
echo   Installing Reddit Shorts Automation Pipeline (Local GPU)
echo ============================================================
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
echo ============================================================
echo   Setup Complete! Run: python main.py --subreddit AITAH
echo ============================================================
pause
