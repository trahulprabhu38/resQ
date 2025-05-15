#!/bin/bash

# Change to the directory containing this script
cd "$(dirname "$0")"

# Run the Streamlit application
echo "Starting Streamlit Blood Report Analyzer on port 8501..."
streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0 