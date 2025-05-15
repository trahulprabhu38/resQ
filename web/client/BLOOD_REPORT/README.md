# Blood Report Analyzer

This directory contains a Streamlit application for analyzing blood test reports.

## Features

- Upload and process blood test reports in various formats (PDF, JPG, PNG)
- Extract key blood parameters automatically
- Analyze values for abnormalities
- Provide detailed insights and interpretations
- Visualize results with charts and graphs
- Generate summarized reports

## Setup

### Prerequisites

- Python 3.8+ installed
- pip (Python package manager)

### Installation

1. Install the required Python dependencies:

```bash
# Using pip
pip install -r requirements.txt

# Or if using pip3
pip3 install -r requirements.txt
```

2. Make sure Streamlit is properly installed and accessible in your PATH

## Running the Streamlit Application

### On macOS/Linux:

1. Open a terminal and navigate to the BLOOD_REPORT directory
2. Run the shell script:

```bash
./run_streamlit.sh
```

Alternatively, you can run the command directly:

```bash
streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0
```

### On Windows:

1. Open Command Prompt and navigate to the BLOOD_REPORT directory
2. Run the batch file:

```
run_streamlit.bat
```

Alternatively, you can run the command directly:

```
streamlit run blood_report_og.py --server.port=8501 --server.address=0.0.0.0
```

## Integration with Main Application

The Blood Report Analyzer is integrated with the main application through:

1. A link in the patient dashboard
2. A dedicated page at `/blood-report` in the React app
3. A server endpoint at `/api/blood-report` that returns the Streamlit URL

**Important:** The Streamlit application must be running separately before using the Blood Report feature in the main application. By default, the application expects Streamlit to be running on http://localhost:8501.

## Configuration

You can configure the Streamlit URL in the main application by setting the `STREAMLIT_URL` environment variable in your server's environment.

For example:
```
STREAMLIT_URL=http://localhost:8501
```

## Troubleshooting

If you encounter issues with the Streamlit application:

1. Make sure Streamlit is installed correctly: `pip install streamlit`
2. Verify that all Python dependencies are properly installed
3. Check if the Streamlit server is running on the expected port
4. Make sure the STREAMLIT_URL environment variable is correctly set if not using the default

## Additional Resources

- [Streamlit Documentation](https://docs.streamlit.io/)
- [Python NLTK Documentation](https://www.nltk.org/)
- [Pandas Documentation](https://pandas.pydata.org/docs/) 