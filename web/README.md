# ResQ Medical Application

A comprehensive medical emergency response system with a web client and server.

## Features

- User authentication for patients and medical professionals
- Medical information management
- QR code generation for emergency access
- Blood report analysis with AI integration
- Secure data storage and retrieval

## Project Structure

- `client/`: React frontend application
- `server/`: Node.js backend server
- `client/BLOOD_REPORT/`: Streamlit application for blood report analysis

## Setup and Installation

### Prerequisites

- Node.js 14+ and npm
- Python 3.8+ with pip
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/resq-db
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
STREAMLIT_URL=http://localhost:8501
```

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
VITE_API_URL=http://localhost:5001/api
```

### Blood Report Analyzer Setup

1. Install Python dependencies:
```bash
pip install -r client/BLOOD_REPORT/requirements.txt
```

## Running the Application

### Option 1: Running Components Separately

#### Start the Streamlit Blood Report Analyzer

On macOS/Linux:
```bash
cd client/BLOOD_REPORT
./run_streamlit.sh
```

On Windows:
```
cd client\BLOOD_REPORT
run_streamlit.bat
```

#### Start the Node.js Server

In a new terminal:
```bash
cd server
npm run dev
```

#### Start the React Client

In a new terminal:
```bash
cd client
npm run dev
```

### Option 2: Using the Development Scripts

On macOS/Linux:
```bash
./start_dev.sh
```

On Windows:
```
start_dev.bat
```

This will start both the Streamlit app and the Node.js server. You'll still need to start the React client separately.

## Accessing the Application

- React Client: http://localhost:5173
- Node.js Server API: http://localhost:5001/api
- Streamlit Blood Report Analyzer: http://localhost:8501

## Integration with Blood Report Analyzer

The Blood Report Analyzer is a separate Streamlit application that is integrated with the main application. To use it:

1. Make sure the Streamlit application is running on port 8501
2. Log in to the ResQ application
3. Navigate to the Dashboard
4. Click on "View Blood Reports"
5. Click "Open Blood Report Analyzer" to access the Streamlit application

## License

MIT



