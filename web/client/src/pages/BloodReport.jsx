import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Button, 
  CircularProgress,
  Alert
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PageWrapper from '../components/PageWrapper';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BloodReport = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [streamlitUrl, setStreamlitUrl] = useState('');

  useEffect(() => {
    const fetchStreamlitUrl = async () => {
      try {
        setLoading(true);
        setError('');
        
        // VITE_API_URL already includes the /api prefix, so we don't need to add it again
        // The correct endpoint is simply /blood-report
        const apiUrl = `${import.meta.env.VITE_API_URL}/blood-report`;
        
        console.log('Making request to:', apiUrl);
        
        const response = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.data && response.data.streamlitUrl) {
          console.log('Received Streamlit URL:', response.data.streamlitUrl);
          setStreamlitUrl(response.data.streamlitUrl);
        } else {
          setError('Unable to retrieve the Blood Report application URL');
        }
      } catch (err) {
        console.error('Error fetching Streamlit URL:', err);
        console.error('Error details:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        setError(
          err.response?.data?.message || 
          'An error occurred while trying to access the Blood Report application'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStreamlitUrl();
  }, [token]);

  const handleOpenStreamlit = () => {
    if (streamlitUrl) {
      window.open(streamlitUrl, '_blank');
    }
  };

  return (
    <PageWrapper maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AnalyticsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Blood Report Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Upload and analyze your blood test reports with our advanced AI tool.
            Get detailed insights and interpretations of your results.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleOpenStreamlit}
              startIcon={<AnalyticsIcon />}
            >
              Open Blood Report Analyzer
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              The analyzer will open in a new tab. You can upload your blood test reports there.
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          <ul>
            <li>Upload blood test reports in PDF, JPG, or PNG format</li>
            <li>Automatic extraction of key blood parameters</li>
            <li>Detailed analysis of out-of-range values</li>
            <li>Interpretation of results with potential health implications</li>
            <li>Visual representation of trends and patterns</li>
            <li>Summarized report for easy understanding</li>
          </ul>
        </Box>
      </Paper>
    </PageWrapper>
  );
};

export default BloodReport; 