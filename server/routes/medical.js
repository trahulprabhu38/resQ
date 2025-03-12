const express = require('express');
const router = express.Router();
const MedicalInfo = require('../models/MedicalInfo.js');
const StaffAccess = require('../models/StaffAccess.js');
const auth = require('../middleware/auth.js');
const jwt = require('jsonwebtoken');

// Middleware to check if user is approved medical staff
const checkStaffAccess = async (req, res, next) => {
    try {
        const isApproved = await StaffAccess.isApproved(req.user._id);
        if (!isApproved) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only approved medical staff can access patient records.'
            });
        }
        next();
    } catch (error) {
        console.error('Staff access check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking staff access'
        });
    }
};

// Scan QR code and get patient info
router.get('/scan/:patientId', auth, checkStaffAccess, async (req, res) => {
    try {
        console.log('\n=== Processing QR Code Scan ===');
        console.log('Patient ID:', req.params.patientId);
        console.log('Staff ID:', req.user._id);

        // Get medical info
        const medicalInfo = await MedicalInfo.findOne({ patient: req.params.patientId })
            .populate('patient', 'name email');

        if (!medicalInfo) {
            return res.status(404).json({
                success: false,
                message: 'Medical information not found'
            });
        }

        // Log the access
        await medicalInfo.logAccess(req.user._id, 'scan');

        // Return the medical info
        res.json({
            success: true,
            data: {
                _id: medicalInfo._id,
                patient: {
                    id: medicalInfo.patient._id,
                    name: medicalInfo.patient.name,
                    email: medicalInfo.patient.email
                },
                bloodType: medicalInfo.bloodType,
                allergies: medicalInfo.allergies,
                medications: medicalInfo.medications,
                conditions: medicalInfo.conditions,
                emergencyContact: medicalInfo.emergencyContact,
                lastUpdated: medicalInfo.lastUpdated
            }
        });

    } catch (error) {
        console.error('Error processing QR scan:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing QR code scan'
        });
    }
});

// Get current user's medical info
router.get('/patient/me', auth, async (req, res) => {
    try {
        console.log('\n=== Fetching Current User Medical Info ===');
        
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
        console.log('=== Medical Info Save Request ===');
        
        const {
            bloodType,
            allergies,
            medications,
            conditions,
            emergencyContact
        } = req.body;

        // Validate required fields
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

module.exports = router;