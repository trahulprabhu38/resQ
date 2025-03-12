import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import PageWrapper from '../components/PageWrapper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import MedicationIcon from '@mui/icons-material/Medication';
import WarningIcon from '@mui/icons-material/Warning';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { useAuth } from '../contexts/AuthContext';
import CryptoJS from 'crypto-js';

const PatientInfo = () => {
  const { patientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const decryptData = (encryptedData) => {
      try {
        // Use the same key as server
        const ENCRYPTION_KEY = 'your-secret-key-32-chars-long!!!!!';
        
        // Parse the base64 encoded string
        const encryptedObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
        
        // Convert base64 strings to bytes
        const iv = Buffer.from(encryptedObj.iv, 'base64');
        const encrypted = Buffer.from(encryptedObj.data, 'base64');
        const authTag = Buffer.from(encryptedObj.auth, 'base64');
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the data
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
      } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt medical data');
      }
    };

    const fetchPatientInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        setAccessDenied(false);

        // Check if user is authenticated
        if (!user) {
          console.log('User not authenticated, redirecting to login');
          navigate('/login', { state: { from: `/patient/${token}` } });
          return;
        }

        // Check if user has required role
        const allowedRoles = ['admin', 'doctor', 'nurse'];
        if (!allowedRoles.includes(user.role)) {
          console.log('Access denied: User role not authorized');
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Fetch medical info using the token
        const response = await axios.get(`/api/medical/access/${token}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.data.success) {
          console.log('Medical info retrieved successfully');
          setPatientInfo(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch patient information');
        }
      } catch (err) {
        console.error('Error fetching patient info:', err);
        setError(err.response?.data?.message || err.message || 'An error occurred while fetching patient information');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientInfo();
  }, [token, user, navigate]);

  const renderMedicalDetails = () => {
    if (!patientInfo) return null;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Details
              </Typography>
              <Typography>
                Name: {patientInfo.patient?.name || 'Not specified'}
              </Typography>
              <Typography>
                Blood Type: {patientInfo.bloodType || 'Not specified'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Allergies
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {patientInfo.allergies && patientInfo.allergies.length > 0 ? (
                  patientInfo.allergies.map((allergy, index) => (
                    <Chip key={index} label={allergy} color="error" />
                  ))
                ) : (
                  <Typography>No allergies specified</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Medications
              </Typography>
              {patientInfo.medications && patientInfo.medications.length > 0 ? (
                patientInfo.medications.map((med, index) => (
                  <Box key={index} mb={1}>
                    <Typography variant="subtitle1">{med.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Dosage: {med.dosage || 'Not specified'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Frequency: {med.frequency || 'Not specified'}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography>No medications specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Medical Conditions
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {patientInfo.conditions && patientInfo.conditions.length > 0 ? (
                  patientInfo.conditions.map((condition, index) => (
                    <Chip key={index} label={condition} color="primary" />
                  ))
                ) : (
                  <Typography>No conditions specified</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Emergency Contact
              </Typography>
              {patientInfo.emergencyContact ? (
                <>
                  <Typography>
                    Name: {patientInfo.emergencyContact.name || 'Not specified'}
                  </Typography>
                  <Typography>
                    Relationship: {patientInfo.emergencyContact.relationship || 'Not specified'}
                  </Typography>
                  <Typography>
                    Phone: {patientInfo.emergencyContact.phone || 'Not specified'}
                  </Typography>
                </>
              ) : (
                <Typography>No emergency contact specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" color="textSecondary">
            Last Updated: {new Date(patientInfo.lastUpdated).toLocaleString()}
          </Typography>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <PageWrapper>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </PageWrapper>
    );
  }

  if (accessDenied) {
    return (
      <PageWrapper>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Access Denied - You do not have the required role to view this medical information.
            Only doctors, nurses, and administrators can access patient records.
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="contained"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="contained"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => navigate('/dashboard')}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ color: 'primary.main' }}>
            Patient Medical Information
          </Typography>
        </Box>

        {renderMedicalDetails()}
      </Paper>
    </PageWrapper>
  );
};

export default PatientInfo; 