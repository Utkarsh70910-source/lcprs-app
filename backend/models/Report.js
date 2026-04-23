const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'rejected'],
    required: true,
  },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
});

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },
    category: {
      type: String,
      enum: ['pothole', 'garbage', 'streetlight', 'waterleakage', 'encroachment', 'other'],
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'rejected'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: { type: String, default: '' },
    },
    images: [imageSchema],
    statusHistory: [statusHistorySchema],
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 2dsphere index for geo-near queries
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1, category: 1 });
reportSchema.index({ submittedBy: 1 });
reportSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Report', reportSchema);
