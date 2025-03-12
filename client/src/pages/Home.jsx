import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import QrCodeIcon from '@mui/icons-material/QrCode';
import SecurityIcon from '@mui/icons-material/Security';
import PageWrapper from '../components/PageWrapper';

const Home = () => {
  return (
    <PageWrapper maxWidth="lg">
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        py: 4
      }}>
        <Typography
          variant="h2"
          component="h1"
          align="center"
          gutterBottom
          sx={{ fontWeight: 'bold' }}
        >
          Welcome to ResQ
        </Typography>
        <Typography
          variant="h5"
          align="center"
          color="text.secondary"
          paragraph
          sx={{ mb: 6 }}
        >
          Your Emergency Medical Information at Your Fingertips
        </Typography>

        <Grid container spacing={4} sx={{ mb: 8, flex: 1 }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <LocalHospitalIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                For Patients
              </Typography>
              <Typography align="center" paragraph>
                Store your medical information securely and access it instantly in case of emergency.
              </Typography>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                color="primary"
                sx={{ mt: 'auto' }}
              >
                Get Started
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <QrCodeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                QR Code Access
              </Typography>
              <Typography align="center" paragraph>
                Generate a unique QR code that medical staff can scan to access your information instantly.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                For Medical Staff
              </Typography>
              <Typography align="center" paragraph>
                Access patient information quickly and securely in emergency situations.
              </Typography>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                color="primary"
                sx={{ mt: 'auto' }}
              >
                Register as Staff
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 'auto' }}>
          <Typography variant="h4" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography paragraph>
            Join ResQ today and ensure your medical information is always accessible when needed.
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            color="primary"
            size="large"
          >
            Create an Account
          </Button>
        </Box>
      </Box>
    </PageWrapper>
  );
};

export default Home; 