import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import {
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  Fade,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const Scan = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const navigate = useNavigate();

  const fetchPatientInfo = async (patientId) => {
    try {
      // First try to get the medical info
      const response = await axios.get(`http://localhost:5001/api/medical/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Patient info response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient info:', error.response || error);
      throw new Error(error.response?.data?.message || 'Failed to fetch patient information');
    }
  };

  const handleScan = async (result) => {
    if (result && !loading && !success) {
      setLoading(true);
      setError('');
      try {
        const url = result?.text;
        console.log('Scanned URL:', url);

        // Extract patient ID from URL
        let patientId;
        if (url.includes('/patients/')) {
          patientId = url.split('/patients/')[1];
        } else if (url.includes('patientId=')) {
          patientId = url.split('patientId=')[1];
        } else {
          throw new Error('Invalid QR code format');
        }

        console.log('Extracted patient ID:', patientId);
        
        // Show scanning complete message
        setSuccess(true);
        
        // Fetch patient information
        const patientInfo = await fetchPatientInfo(patientId);
        
        if (!patientInfo) {
          throw new Error('No patient information found');
        }

        console.log('Retrieved patient info:', patientInfo);
        
        // Wait for a moment to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Navigate to patient details with the fetched data
        navigate('/patient-info', { 
          state: { 
            patientInfo,
            patientId 
          }
        });
      } catch (err) {
        console.error('Scan error:', err);
        setError(err.message || 'Error fetching patient information. Please try again.');
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    setError('Error accessing camera. Please check your camera permissions.');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setError('');
    setSuccess(false);
  };

  const getStatusMessage = () => {
    if (loading) return { type: 'info', message: 'Scanning QR Code...' };
    if (success) return { type: 'success', message: 'Scan Complete! Retrieving patient information...' };
    if (error) return { type: 'error', message: error };
    return null;
  };

  return (
    <Box 
      sx={{ 
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#000',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden'
      }}
    >
      {/* Enhanced Header */}
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
          boxShadow: 'none' 
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/dashboard')}
            sx={{ 
              color: '#fff',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            ml: 1,
            flexGrow: 1 
          }}>
            <CameraAltIcon sx={{ color: '#fff' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#fff',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}
            >
              Scan Patient QR Code
            </Typography>
          </Box>
          <Tooltip 
            title="Scan a patient's QR code to view their medical information"
            arrow
            placement="bottom-end"
          >
            <IconButton 
              sx={{ 
                color: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Scanner Container with Enhanced UI */}
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* Enhanced Status Messages */}
        <Fade in={!!getStatusMessage()}>
          <Alert 
            severity={getStatusMessage()?.type}
            variant="filled"
            sx={{ 
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              maxWidth: '90%',
              width: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '12px'
            }}
          >
            {getStatusMessage()?.message}
          </Alert>
        </Fade>

        <QrReader
          constraints={{
            facingMode,
            width: window.innerWidth,
            height: window.innerHeight,
          }}
          onResult={handleScan}
          onError={handleError}
          videoStyle={{
            width: '100vw',
            height: '100vh',
            objectFit: 'cover'
          }}
          containerStyle={{
            width: '100%',
            height: '100%'
          }}
          scanDelay={500}
          ViewFinder={() => null}
        />

        {/* Enhanced Scanning Frame */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280,
            height: 280,
            border: '3px solid',
            borderColor: success ? '#4CAF50' : '#2196F3',
            borderRadius: '24px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
            transition: 'all 0.3s ease-in-out',
            animation: success ? 'none' : 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
                border: '3px solid #2196F3'
              },
              '50%': {
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)',
                border: '3px solid #64B5F6'
              },
              '100%': {
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
                border: '3px solid #2196F3'
              }
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '26px'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60%',
              height: '60%',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px'
            }
          }}
        />

        {/* Enhanced Loading Overlay */}
        <Fade in={loading}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(4px)',
              zIndex: 2,
              gap: 3
            }}
          >
            <CircularProgress 
              color={success ? "success" : "primary"} 
              size={64}
              thickness={4}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#fff',
                fontWeight: 500,
                textAlign: 'center',
                px: 2
              }}
            >
              {success ? 'Retrieving Patient Information...' : 'Processing QR Code...'}
            </Typography>
          </Box>
        </Fade>
      </Box>

      {/* Enhanced Controls */}
      <Paper
        elevation={0}
        sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
          borderRadius: 0
        }}
      >
        <Button
          startIcon={<FlipCameraIosIcon />}
          onClick={toggleCamera}
          variant="contained"
          color="primary"
          size="large"
          sx={{ 
            minWidth: 220,
            height: 48,
            borderRadius: 24,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: 'rgba(33, 150, 243, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 1)'
            }
          }}
        >
          Switch Camera
        </Button>
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            maxWidth: 300,
            fontWeight: 400,
            letterSpacing: '0.2px'
          }}
        >
          Position the QR code within the frame to scan
        </Typography>
      </Paper>
    </Box>
  );
};

export default Scan; 