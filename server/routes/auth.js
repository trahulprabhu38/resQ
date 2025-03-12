const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const auth = require('../middleware/auth.js');

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

// Register User
router.post('/register', async (req, res) => {
    try { 
        console.log('Registration attempt:', req.body);
        const { name, email, password, role, hospital } = req.body;

        // Validate input
        if (!name || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format');
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Validate password length
        if (password.length < 6) {
            console.log('Password too short');
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Validate role
        if (!['patient', 'medical_staff', 'admin'].includes(role)) {
            console.log('Invalid role:', role);
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Additional validation for admin registration
        if (role === 'admin') {
            // Check if there are any existing admins
            const existingAdmin = await User.findOne({ role: 'admin' });
            if (existingAdmin) {
                return res.status(403).json({ message: 'Admin already exists' });
            }
        }

        // Validate hospital information for medical staff
        if (role === 'medical_staff') {
            if (!hospital || !hospital.name || !hospital.address || !hospital.department || 
                !hospital.position || !hospital.staffId || !hospital.contact) {
                console.log('Missing hospital information:', hospital);
                return res.status(400).json({ message: 'Please provide all hospital information' });
            }
        }
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log('Creating new user...');
        // Create new user with hospital information
        const userData = {
            name,
            email,
            password,
            role
        };

        // Add hospital information if role is medical_staff
        if (role === 'medical_staff') {
            userData.hospital = {
                name: hospital.name,
                address: hospital.address,
                department: hospital.department,
                position: hospital.position,
                staffId: hospital.staffId,
                contact: hospital.contact
            };
        }

        // Set isVerified to true for admin
        if (role === 'admin') {
            userData.isVerified = true;
        }

        user = new User(userData);
        await user.save();
        console.log('User created successfully:', user._id);

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Prepare user response
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
        };

        // Add hospital information to response if role is medical_staff
        if (role === 'medical_staff') {
            userResponse.hospital = user.hospital;
        }

        res.status(201).json({
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Registration error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Error creating user',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', { email: req.body.email, role: req.body.role });
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            console.log('Missing login credentials');
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Prepare user response
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
        };

        // Add hospital information if role is medical_staff
        if (user.role === 'medical_staff') {
            userResponse.hospital = user.hospital;
        }

        console.log('Login successful for user:', email, 'Role:', user.role);
        res.json({
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Login error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Error logging in',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Admin middleware
const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Admin: Get all unverified staff
router.get('/unverified-staff', auth, isAdmin, async (req, res) => {
    try {
        const unverifiedStaff = await User.find({
            role: 'medical_staff',
            isVerified: false
        }).select('-password');
        res.json(unverifiedStaff);
    } catch (error) {
        console.error('Error fetching unverified staff:', error);
        res.status(500).json({ message: 'Error fetching unverified staff' });
    }
});

// Admin: Verify staff member
router.post('/verify-staff/:userId', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role !== 'medical_staff') {
            return res.status(400).json({ message: 'User is not medical staff' });
        }
        
        user.isVerified = true;
        await user.save();
        
        res.json({ message: 'Staff member verified successfully', user });
    } catch (error) {
        console.error('Error verifying staff:', error);
        res.status(500).json({ message: 'Error verifying staff member' });
    }
});

// Admin: Revoke staff verification
router.post('/revoke-staff/:userId', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role !== 'medical_staff') {
            return res.status(400).json({ message: 'User is not medical staff' });
        }
        
        user.isVerified = false;
        await user.save();
        
        res.json({ message: 'Staff verification revoked successfully', user });
    } catch (error) {
        console.error('Error revoking staff verification:', error);
        res.status(500).json({ message: 'Error revoking staff verification' });
    }
});

// Admin: Get all staff members
router.get('/all-staff', auth, isAdmin, async (req, res) => {
    try {
        const allStaff = await User.find({
            role: 'medical_staff'
        }).select('-password').sort({ createdAt: -1 });
        res.json(allStaff);
    } catch (error) {
        console.error('Error fetching all staff:', error);
        res.status(500).json({ message: 'Error fetching staff members' });
    }
});

module.exports = router; 