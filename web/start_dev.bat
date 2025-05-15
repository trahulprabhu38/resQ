@echo off
echo Starting development environment...

REM Start Streamlit in a new console window
echo Starting Streamlit app...
start cmd /k "cd client\BLOOD_REPORT && streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0"

REM Wait a moment for Streamlit to start
timeout /t 5

REM Start the Node.js server
echo Starting Node.js server...
cd server
npm run dev 