@echo off
echo Starting Streamlit Blood Report Analyzer on port 8501...
cd %~dp0
streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0
pause 