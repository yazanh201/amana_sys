const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    project: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    employees: [
      {
        type: String,
        trim: true,
      },
    ],
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },

    workHours: {
      type: Number,
      required: true,
    },
    workDescription: {
      type: String,
      required: [true, 'Work description is required'],
      trim: true,
    },

    // 📁 קובץ ישן – אם היה נשמר פעם כנתיב אחד
    deliveryCertificate: {
      type: String, // path to file
      default: null,
    },

    // 📸 ישן – נתיבי תמונות ישנים בשרת המקומי (/uploads/...)
    workPhotos: {
      type: [String], // array of file paths
      default: [],
    },

    // ⭐ חדש – תמונות שנשמרות ב-Google Cloud Storage
    photos: {
      type: [
        {
          path: String,        // URL מלא או יחסי (GCS)
          storagePath: String, // הנתיב בתוך ה-bucket (למחיקה)
          originalName: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // ⭐ חדש – מסמכים שנשמרים ב-Google Cloud Storage
    documents: {
      type: [
        {
          path: String,        // URL מלא/יחסי
          storagePath: String, // הנתיב בתוך ה-bucket
          type: String,        // delivery_note / receipt / invoice / other
          originalName: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved'],
      default: 'draft',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DailyLog', DailyLogSchema);
