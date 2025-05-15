#!/bin/bash

# Start the Streamlit app in the background
echo "Starting Streamlit app..."
cd client/BLOOD_REPORT
streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0 &
STREAMLIT_PID=$!

# Go back to the root directory
cd ../..

# Start the Node.js server
echo "Starting Node.js server..."
cd server
npm run dev

# When the server is stopped, also stop the Streamlit app
kill $STREAMLIT_PID 