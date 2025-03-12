import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

const QRScanner = () => {
  const [error, setError] = useState('');
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        'reader',
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 5,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          console.warn(errorMessage);
        }
      );

      return () => {
        scanner.clear();
      };
    }
  }, [scanning]);

  const handleScan = async (data) => {
    setScanning(false);
    try {
      const qrData = JSON.parse(data);
      const response = await axios.get(
        `http://localhost:5001/api/medical/info/${qrData.patientId}`
      );
      setMedicalInfo(response.data);
      setError('');
    } catch (err) {
      setError('Error fetching patient information');
      setMedicalInfo(null);
    }
  };

  const handleReset = () => {
    setScanning(true);
    setMedicalInfo(null);
    setError('');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Scan Patient QR Code
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            {scanning ? (
              <Box sx={{ width: 300, height: 300 }}>
                <div id="reader"></div>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Scan Complete
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Patient information has been retrieved
                </Typography>
              </Box>
            )}
          </Box>

          {medicalInfo && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Patient Information
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Name: {medicalInfo.patient.name}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Blood Type
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {medicalInfo.bloodType}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Allergies
                </Typography>
                {medicalInfo.allergies.length > 0 ? (
                  medicalInfo.allergies.map((allergy, index) => (
                    <Typography key={index} variant="body1">
                      • {allergy}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body1">No allergies listed</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Medications
                </Typography>
                {medicalInfo.medications.length > 0 ? (
                  medicalInfo.medications.map((med, index) => (
                    <Typography key={index} variant="body1">
                      • {med.name} - {med.dosage} - {med.frequency}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body1">No medications listed</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Conditions
                </Typography>
                {medicalInfo.conditions.length > 0 ? (
                  medicalInfo.conditions.map((condition, index) => (
                    <Typography key={index} variant="body1">
                      • {condition}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body1">No conditions listed</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Typography variant="body1">
                  Name: {medicalInfo.emergencyContact.name}
                </Typography>
                <Typography variant="body1">
                  Relationship: {medicalInfo.emergencyContact.relationship}
                </Typography>
                <Typography variant="body1">
                  Phone: {medicalInfo.emergencyContact.phone}
                </Typography>
              </CardContent>
            </Card>
          )}

          {!scanning && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleReset}
              >
                Scan Another QR Code
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default QRScanner; 