# Debugging the Blood Report API Connection

This guide will help you troubleshoot the connection between the client and server for the Blood Report feature.

## Problem

The client is getting a 404 error when trying to access the `/api/blood-report` endpoint.

## Checking the Setup

### 1. Verify Server Configuration

Make sure the server has the endpoint correctly defined:

In `server/server.js`, ensure this route is defined:

```js
app.get('/api/blood-report', (req, res) => {
  // Return the URL where Streamlit is running
  const streamlitUrl = process.env.STREAMLIT_URL || 'http://localhost:8501';
  
  res.json({ 
    success: true,
    message: 'Streamlit application URL',
    streamlitUrl: streamlitUrl
  });
});
```

### 2. Verify Client Configuration

In `client/.env.development`, check that the API URL is correctly set:

```
VITE_API_URL=http://localhost:5001/api
```

In `client/src/pages/BloodReport.jsx`, ensure the API request is correctly formatted:

```js
const apiUrl = `${import.meta.env.VITE_API_URL}/blood-report`;
const response = await axios.get(apiUrl, { ... });
```

### 3. Test the API Endpoint

You can test the API endpoint directly with curl:

```bash
curl -X GET http://localhost:5001/api/blood-report
```

If this returns a proper response, the server is correctly configured.

### 4. Common Issues and Fixes

1. **Double `/api` in the URL**: If VITE_API_URL already includes `/api`, then adding it again will result in `/api/api/blood-report`.

2. **Server not running**: Make sure the server is running on port 5001.

3. **CORS issues**: Verify that CORS is correctly configured in the server.

4. **Authentication requirements**: If the endpoint requires authentication, make sure you're sending a valid token.

### 5. Environment Variables Not Loading

If environment variables aren't loading correctly:

1. Restart the development server
2. Make sure the `.env.development` file is in the correct location
3. Verify that the variables are prefixed with `VITE_` for Vite to pick them up

## Full Stack Testing

To properly test the connection:

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. In a separate terminal, start the Streamlit app:
   ```bash
   cd client/BLOOD_REPORT
   ./run_streamlit.sh  # or run_streamlit.bat on Windows
   ```

3. In a third terminal, start the client:
   ```bash
   cd client
   npm run dev
   ```

4. Navigate to the Blood Report page in your application
5. Check browser console for any errors
6. Use the Network tab in developer tools to see the actual request and response 