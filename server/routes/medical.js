const express = require('express');
const router = express.Router();
const MedicalInfo = require('../models/MedicalInfo.js');
const StaffAccess = require('../models/StaffAccess.js');
const auth = require('../middleware/auth.js');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

// Middleware to check if user is approved medical staff
const checkStaffAccess = async (req, res, next) => {
    try {
        console.log('Checking staff access for user:', req.user._id);
        console.log('User details:', {
            id: req.user._id,
            role: req.user.role,
            email: req.user.email
        });

        const isApproved = await StaffAccess.isApproved(req.user._id);
        console.log('Staff approval status:', isApproved);

        if (!isApproved) {
            console.log('Access denied for user:', req.user._id);
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only approved medical staff can access patient records.',
                details: {
                    userId: req.user._id,
                    role: req.user.role
                }
            });
        }

        console.log('Access granted for user:', req.user._id);
        next();
    } catch (error) {
        console.error('Staff access check error:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?._id
        });
        res.status(500).json({
            success: false,
            message: 'Error checking staff access',
            details: error.message
        });
    }
};

// Handle QR code scan - receives patient ID from QR code data
router.post('/scan', auth, checkStaffAccess, async (req, res) => {
    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        console.log('Processing scan request for patient:', patientId);

        // Get medical info directly using patient ID
        const medicalInfo = await MedicalInfo.findOne({ patient: patientId })
            .populate('patient', 'name email')
            .lean();

        if (!medicalInfo) {
            console.log('No medical info found for patient:', patientId);
            return res.status(404).json({
                success: false,
                message: 'Medical information not found'
            });
        }

        // Log the access
        await MedicalInfo.findByIdAndUpdate(medicalInfo._id, {
            $push: {
                accessLog: {
                    accessedBy: req.user._id,
                    accessType: 'scan',
                    timestamp: new Date()
                }
            }
        });

        console.log('Medical info found and access logged for patient:', patientId);

        // Format and return the medical info
        const response = {
            success: true,
            data: {
                _id: medicalInfo._id,
                patient: {
                    id: medicalInfo.patient._id,
                    name: medicalInfo.patient.name,
                    email: medicalInfo.patient.email
                },
                bloodType: medicalInfo.bloodType || '',
                allergies: medicalInfo.allergies || [],
                medications: medicalInfo.medications || [],
                conditions: medicalInfo.conditions || [],
                emergencyContact: {
                    name: medicalInfo.emergencyContact?.name || '',
                    relationship: medicalInfo.emergencyContact?.relationship || '',
                    phone: medicalInfo.emergencyContact?.phone || ''
                },
                lastUpdated: medicalInfo.lastUpdated
            }
        };

        console.log('Sending formatted medical info response');
        res.json(response);

    } catch (error) {
        console.error('Error processing QR scan:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing QR code scan',
            error: error.message
        });
    }
});

// Get current user's medical info
router.get('/patient/me', auth, async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(400).json({ 
                message: 'User ID is required'
            });
        }

        const medicalInfo = await MedicalInfo.findOne({ patient: req.user._id })
            .populate('patient', 'name email');

        if (!medicalInfo) {
            const emptyTemplate = {
                bloodType: '',
                allergies: [],
                medications: [],
                conditions: [],
                emergencyContact: {
                    name: '',
                    relationship: '',
                    phone: ''
                },
                lastUpdated: new Date().toISOString(),
                patient: req.user._id,
                patientName: req.user.name,
                patientEmail: req.user.email
            };
            return res.json(emptyTemplate);
        }

        res.json({
            _id: medicalInfo._id,
            bloodType: medicalInfo.bloodType,
            allergies: medicalInfo.allergies,
            medications: medicalInfo.medications,
            conditions: medicalInfo.conditions,
            emergencyContact: medicalInfo.emergencyContact,
            qrCode: medicalInfo.qrCode,
            lastUpdated: medicalInfo.lastUpdated,
            patient: medicalInfo.patient._id,
            patientName: medicalInfo.patient.name,
            patientEmail: medicalInfo.patient.email
        });
    } catch (error) {
        console.error('Error fetching medical info:', error);
        res.status(500).json({ 
            message: 'Error fetching medical information'
        });
    }
});

// Get medical info for a specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
    try {
        console.log('\n=== Fetching Patient Medical Info ===');
        console.log('Patient ID:', req.params.patientId);
        
        if (!req.params.patientId) {
            return res.status(400).json({ message: 'Patient ID is required' });
        }

        const medicalInfo = await MedicalInfo.findOne({ patient: req.params.patientId })
            .populate('patient', 'name email');
        
        console.log('Database query result:', {
            found: !!medicalInfo,
            patientId: req.params.patientId,
            hasData: medicalInfo ? 'Yes' : 'No'
        });

        if (!medicalInfo) {
            console.log('No medical information found for patient:', req.params.patientId);
            return res.status(404).json({ message: 'Medical information not found' });
        }

        // Format the response
        const response = {
            _id: medicalInfo._id,
            bloodType: medicalInfo.bloodType || '',
            allergies: medicalInfo.allergies || [],
            medications: medicalInfo.medications || [],
            conditions: medicalInfo.conditions || [],
            emergencyContact: {
                name: medicalInfo.emergencyContact?.name || '',
                relationship: medicalInfo.emergencyContact?.relationship || '',
                phone: medicalInfo.emergencyContact?.phone || ''
            },
            qrCode: medicalInfo.qrCode || '',
            lastUpdated: medicalInfo.lastUpdated || new Date(),
            patientName: medicalInfo.patient?.name || 'Unknown Patient',
            patientEmail: medicalInfo.patient?.email
        };

        console.log('Sending response:', {
            patientId: req.params.patientId,
            patientName: response.patientName,
            hasData: true,
            dataFields: Object.keys(response)
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching medical info:', {
            error: error.message,
            stack: error.stack,
            patientId: req.params.patientId
        });
        res.status(500).json({ 
            message: 'Error fetching medical information',
            details: error.message
        });
    }
});

// Create or update medical info
router.post('/', auth, async (req, res) => {
    try {
        const {
            bloodType,
            allergies,
            medications,
            conditions,
            emergencyContact
        } = req.body;

        if (!bloodType) {
            return res.status(400).json({ message: 'Blood type is required' });
        }

        // Clean and validate arrays
        const cleanedAllergies = (allergies || []).filter(allergy => allergy && allergy.trim());
        const cleanedMedications = (medications || []).filter(med => med && med.name && med.name.trim());
        const cleanedConditions = (conditions || []).filter(condition => condition && condition.trim());

        // Check if medical info exists
        let medicalInfo = await MedicalInfo.findOne({ patient: req.user._id });

        const medicalData = {
            bloodType,
            allergies: cleanedAllergies,
            medications: cleanedMedications,
            conditions: cleanedConditions,
            emergencyContact: {
                name: emergencyContact?.name?.trim() || '',
                relationship: emergencyContact?.relationship?.trim() || '',
                phone: emergencyContact?.phone?.trim() || ''
            }
        };

        if (medicalInfo) {
            Object.assign(medicalInfo, medicalData);
            medicalInfo = await medicalInfo.save();
        } else {
            const newMedicalInfo = new MedicalInfo({
                patient: req.user._id,
                ...medicalData
            });
            medicalInfo = await newMedicalInfo.save();
        }

        const updatedMedicalInfo = await MedicalInfo.findById(medicalInfo._id)
            .populate('patient', 'name email');

        if (!updatedMedicalInfo) {
            throw new Error('Failed to fetch updated medical info');
        }

        res.json({
            ...updatedMedicalInfo.toJSON(),
            patientName: updatedMedicalInfo.patient?.name || '',
            patientEmail: updatedMedicalInfo.patient?.email || ''
        });
    } catch (error) {
        console.error('Error saving medical info:', error);
        res.status(500).json({ 
            message: 'Error saving medical information'
        });
    }
});

// Delete medical info
router.delete('/', auth, async (req, res) => {
    try {
        const medicalInfo = await MedicalInfo.findOneAndDelete({ patient: req.user._id });
        if (!medicalInfo) {
            return res.status(404).json({ message: 'Medical information not found' });
        }
        res.json({ message: 'Medical information deleted successfully' });
    } catch (error) {
        console.error('Error deleting medical info:', error);
        res.status(500).json({ message: 'Error deleting medical information' });
    }
});

// Secure access route for QR code tokens
router.get('/access/:token', auth, async (req, res) => {
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
        
        // Verify the token
        const decoded = jwt.verify(req.params.token, JWT_SECRET);
        
        // Check token type and expiration
        if (decoded.type !== 'medical_access') {
            return res.status(400).json({
                success: false,
                message: 'Invalid access token'
            });
        }

        // Get medical info
        const medicalInfo = await MedicalInfo.findById(decoded.medicalInfoId)
            .populate('patient', 'name email');

        if (!medicalInfo) {
            return res.status(404).json({
                success: false,
                message: 'Medical information not found'
            });
        }

        // Check if user has access
        if (!medicalInfo.hasAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this medical information'
            });
        }

        // Log the access
        await medicalInfo.logAccess(req.user._id, req.user.role, 'view');

        // Return the medical info
        res.json({
            success: true,
            data: medicalInfo
        });

    } catch (error) {
        console.error('Error accessing medical info:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({
                success: false,
                message: 'Token has expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error accessing medical information'
        });
    }
});

// Check staff access status
router.get('/staff-status', auth, async (req, res) => {
    try {
        console.log('Checking staff status for user:', req.user._id);
        console.log('Full user object:', req.user);
        
        let staffAccess = await StaffAccess.findOne({ staff: req.user._id })
            .populate('staff', 'name email role')
            .populate('approvedBy', 'name email');

        // Auto-create staff access for verified users
        if (!staffAccess && req.user.isVerified) {
            console.log('Creating staff access for verified user:', req.user._id);
            
            const newStaffAccess = new StaffAccess({
                staff: req.user._id,
                role: 'doctor',
                isApproved: true,
                status: 'approved',
                approvalDate: new Date(),
                department: 'General',
                specialization: 'General Medicine'
            });

            try {
                staffAccess = await newStaffAccess.save();
                console.log('Created new staff access:', staffAccess);
            } catch (saveError) {
                console.error('Failed to create staff access:', saveError);
            }
        }

        if (!staffAccess) {
            return res.json({
                success: false,
                message: 'No staff access record found',
                details: {
                    userId: req.user._id,
                    userEmail: req.user.email,
                    isVerified: req.user.isVerified
                }
            });
        }

        res.json({
            success: true,
            data: {
                isApproved: staffAccess.isApproved,
                status: staffAccess.status,
                role: staffAccess.role
            }
        });

    } catch (error) {
        console.error('Staff status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking staff status',
            error: error.message
        });
    }
});

// Get all patients
router.get('/patients', auth, checkStaffAccess, async (req, res) => {
  try {
    console.log('Fetching all patients');
    const patients = await MedicalInfo.find({})
      .populate('patient', 'name email');

    res.json({
      success: true,
      data: patients.map(patient => ({
        _id: patient._id,
        name: patient.patient?.name || 'Unknown',
        bloodType: patient.bloodType || '',
        allergies: patient.allergies || [],
        medications: patient.medications || [],
        conditions: patient.conditions || [],
        emergencyContact: patient.emergencyContact || {},
        insuranceInfo: patient.insuranceInfo || {},
        lastUpdated: patient.lastUpdated
      }))
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      details: error.message
    });
  }
});

// Create new patient
router.post('/patient', auth, checkStaffAccess, async (req, res) => {
  try {
    console.log('Creating new patient record:', req.body);

    const {
      name,
      bloodType,
      allergies,
      medications,
      conditions,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Validate required fields
    if (!name || !bloodType) {
      return res.status(400).json({
        success: false,
        message: 'Name and blood type are required'
      });
    }

    // Create new medical info record
    const newMedicalInfo = new MedicalInfo({
      patient: req.user._id,
      bloodType,
      allergies: allergies || [],
      medications: medications || [],
      conditions: conditions || [],
      emergencyContact: emergencyContact || {},
      insuranceInfo: insuranceInfo || {}
    });

    const savedMedicalInfo = await newMedicalInfo.save();
    console.log('Saved new medical info:', savedMedicalInfo);

    res.json({
      success: true,
      data: savedMedicalInfo
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating patient record',
      details: error.message
    });
  }
});

// Update patient
router.put('/patient/:id', auth, checkStaffAccess, async (req, res) => {
  try {
    console.log('Updating patient record:', req.params.id);
    console.log('Update data:', req.body);

    const {
      name,
      bloodType,
      allergies,
      medications,
      conditions,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Validate required fields
    if (!name || !bloodType) {
      return res.status(400).json({
        success: false,
        message: 'Name and blood type are required'
      });
    }

    // Find and update the medical info
    const updatedMedicalInfo = await MedicalInfo.findByIdAndUpdate(
      req.params.id,
      {
        bloodType,
        allergies: allergies || [],
        medications: medications || [],
        conditions: conditions || [],
        emergencyContact: emergencyContact || {},
        insuranceInfo: insuranceInfo || {},
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    ).populate('patient', 'name email');

    if (!updatedMedicalInfo) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    console.log('Updated medical info:', updatedMedicalInfo);

    res.json({
      success: true,
      data: updatedMedicalInfo
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient record',
      details: error.message
    });
  }
});

// Delete patient
router.delete('/patient/:id', auth, checkStaffAccess, async (req, res) => {
  try {
    console.log('Deleting patient record:', req.params.id);

    const deletedMedicalInfo = await MedicalInfo.findByIdAndDelete(req.params.id);

    if (!deletedMedicalInfo) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    res.json({
      success: true,
      message: 'Patient record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting patient record',
      details: error.message
    });
  }
});

// Update medical info
router.post('/update', auth, async (req, res) => {
  try {
    console.log('Updating medical info for user:', req.user._id);
    console.log('Update data:', req.body);

    const {
      bloodType,
      allergies,
      medications,
      conditions,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Validate required fields
    if (!bloodType) {
      return res.status(400).json({
        success: false,
        message: 'Blood type is required'
      });
    }

    // Find existing medical info or create new one
    let medicalInfo = await MedicalInfo.findOne({ patient: req.user._id });
    
    if (medicalInfo) {
      // Update existing record
      medicalInfo.bloodType = bloodType;
      medicalInfo.allergies = allergies || [];
      medicalInfo.medications = medications || [];
      medicalInfo.conditions = conditions || [];
      medicalInfo.emergencyContact = emergencyContact || {};
      medicalInfo.insuranceInfo = insuranceInfo || {};
      medicalInfo.lastUpdated = new Date();
    } else {
      // Create new record
      medicalInfo = new MedicalInfo({
        patient: req.user._id,
        name: req.user.name,
        bloodType,
        allergies: allergies || [],
        medications: medications || [],
        conditions: conditions || [],
        emergencyContact: emergencyContact || {},
        insuranceInfo: insuranceInfo || {}
      });
    }

    const savedMedicalInfo = await medicalInfo.save();
    console.log('Saved medical info:', savedMedicalInfo);

    // Generate QR code
    const qrData = {
      id: savedMedicalInfo._id,
      name: req.user.name,
      bloodType: savedMedicalInfo.bloodType,
      allergies: savedMedicalInfo.allergies
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 400
    });

    res.json({
      success: true,
      data: {
        ...savedMedicalInfo.toObject(),
        qrCode
      }
    });
  } catch (error) {
    console.error('Error updating medical info:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating medical information',
      details: error.message
    });
  }
});

module.exports = router;