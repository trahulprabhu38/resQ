const mongoose = require('mongoose');

const staffAccessSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['doctor', 'nurse', 'admin'],
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    specialization: String,
    department: String,
    notes: String
}, {
    timestamps: true
});

// Create unique index on staff ID
staffAccessSchema.index({ staff: 1 }, { unique: true });

// Method to approve staff access
staffAccessSchema.methods.approve = async function(adminId) {
    this.isApproved = true;
    this.status = 'approved';
    this.approvedBy = adminId;
    this.approvalDate = new Date();
    return this.save();
};

// Method to reject staff access
staffAccessSchema.methods.reject = async function(adminId) {
    this.isApproved = false;
    this.status = 'rejected';
    this.approvedBy = adminId;
    this.approvalDate = new Date();
    return this.save();
};

// Static method to check if a staff member is approved
staffAccessSchema.statics.isApproved = async function(staffId) {
    const access = await this.findOne({ staff: staffId });
    return access?.isApproved || false;
};

const StaffAccess = mongoose.model('StaffAccess', staffAccessSchema);

module.exports = StaffAccess; 