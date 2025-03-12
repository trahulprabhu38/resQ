import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageWrapper from '../components/PageWrapper';

const PatientList = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bloodType: '',
    allergies: [],
    conditions: [],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: '',
    },
  });

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/medical/patient/${patientId}`);
      setPatient(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError('Error fetching patient information');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(true);
    setFormData({
      name: patient.name,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      conditions: patient.conditions,
      emergencyContact: {
        name: patient.emergencyContact.name,
        relationship: patient.emergencyContact.relationship,
        phone: patient.emergencyContact.phone,
      },
      insuranceInfo: {
        provider: patient.insuranceInfo.provider,
        policyNumber: patient.insuranceInfo.policyNumber,
        groupNumber: patient.insuranceInfo.groupNumber,
      },
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/medical/patient/${id}`);
      fetchPatientData();
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('Error deleting patient');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPatient(false);
    setFormData({
      name: '',
      bloodType: '',
      allergies: [],
      conditions: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      insuranceInfo: {
        provider: '',
        policyNumber: '',
        groupNumber: '',
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.put(`http://localhost:5001/api/medical/patient/${patientId}`, formData);
      setPatient(response.data);
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Error updating patient');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography>Loading patient information...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!patient) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">Patient not found</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <PageWrapper>
      <Paper elevation={3} sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Patient List
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ flex: 1 }}>
            {patients.map((patient) => (
              <Grid item xs={12} md={6} key={patient._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6">{patient.name}</Typography>
                      <Box>
                        <IconButton onClick={() => handleEdit(patient)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(patient._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Blood Type: {patient.bloodType}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Allergies:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {patient.allergies?.length > 0 ? (
                          patient.allergies.map((allergy, index) => (
                            <Chip key={index} label={allergy} size="small" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No allergies specified</Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Medications:</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {patient.medications?.length > 0 ? (
                          patient.medications.map((med, index) => (
                            <Chip
                              key={index}
                              label={`${med.name} - ${med.dosage} - ${med.frequency}`}
                              size="small"
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No medications specified</Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Conditions:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {patient.conditions?.length > 0 ? (
                          patient.conditions.map((condition, index) => (
                            <Chip key={index} label={condition} size="small" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No conditions specified</Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Emergency Contact:</Typography>
                      {patient.emergencyContact ? (
                        <>
                          <Typography variant="body2">Name: {patient.emergencyContact.name}</Typography>
                          <Typography variant="body2">Relationship: {patient.emergencyContact.relationship}</Typography>
                          <Typography variant="body2">Phone: {patient.emergencyContact.phone}</Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No emergency contact specified</Typography>
                      )}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Insurance Information:</Typography>
                      {patient.insuranceInfo ? (
                        <>
                          <Typography variant="body2">Provider: {patient.insuranceInfo.provider}</Typography>
                          <Typography variant="body2">Policy Number: {patient.insuranceInfo.policyNumber}</Typography>
                          <Typography variant="body2">Group Number: {patient.insuranceInfo.groupNumber}</Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No insurance information specified</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Blood Type</InputLabel>
              <Select
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                label="Blood Type"
              >
                <MenuItem value="A+">A+</MenuItem>
                <MenuItem value="A-">A-</MenuItem>
                <MenuItem value="B+">B+</MenuItem>
                <MenuItem value="B-">B-</MenuItem>
                <MenuItem value="AB+">AB+</MenuItem>
                <MenuItem value="AB-">AB-</MenuItem>
                <MenuItem value="O+">O+</MenuItem>
                <MenuItem value="O-">O-</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Allergies (comma-separated)"
              fullWidth
              value={formData.allergies.join(', ')}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value.split(',').map(a => a.trim()) })}
            />
            <TextField
              margin="dense"
              label="Conditions (comma-separated)"
              fullWidth
              value={formData.conditions.join(', ')}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value.split(',').map(c => c.trim()) })}
            />
            <TextField
              margin="dense"
              label="Emergency Contact Name"
              fullWidth
              value={formData.emergencyContact.name}
              onChange={(e) => setFormData({
                ...formData,
                emergencyContact: { ...formData.emergencyContact, name: e.target.value }
              })}
            />
            <TextField
              margin="dense"
              label="Emergency Contact Relationship"
              fullWidth
              value={formData.emergencyContact.relationship}
              onChange={(e) => setFormData({
                ...formData,
                emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
              })}
            />
            <TextField
              margin="dense"
              label="Emergency Contact Phone"
              fullWidth
              value={formData.emergencyContact.phone}
              onChange={(e) => setFormData({
                ...formData,
                emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
              })}
            />
            <TextField
              margin="dense"
              label="Insurance Provider"
              fullWidth
              value={formData.insuranceInfo.provider}
              onChange={(e) => setFormData({
                ...formData,
                insuranceInfo: { ...formData.insuranceInfo, provider: e.target.value }
              })}
            />
            <TextField
              margin="dense"
              label="Insurance Policy Number"
              fullWidth
              value={formData.insuranceInfo.policyNumber}
              onChange={(e) => setFormData({
                ...formData,
                insuranceInfo: { ...formData.insuranceInfo, policyNumber: e.target.value }
              })}
            />
            <TextField
              margin="dense"
              label="Insurance Group Number"
              fullWidth
              value={formData.insuranceInfo.groupNumber}
              onChange={(e) => setFormData({
                ...formData,
                insuranceInfo: { ...formData.insuranceInfo, groupNumber: e.target.value }
              })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editingPatient ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </PageWrapper>
  );
};

export default PatientList; 