const DailyLog = require('../models/dailyLog.model');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage(); // משתמש ב-Service Account של Cloud Run או GOOGLE_APPLICATION_CREDENTIALS

// 🔹 ודא שהשם הזה תואם למה שיש לך ב-ENV (GCS_BUCKET_NAME או GCLOUD_BUCKET_NAME)
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  console.error('❌ GCS_BUCKET_NAME is not defined in environment variables!');
}

const bucket = storage.bucket(bucketName);

/**
 * Upload buffer to Google Cloud Storage
 */
const uploadToGCS = (file, folder) => {
  return new Promise((resolve, reject) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    const gcsPath = `${folder}/${uniqueName}`;

    const blob = bucket.file(gcsPath);
    const stream = blob.createWriteStream({
      resumable: false,
      metadata: { contentType: file.mimetype },
    });

    stream.on('error', (err) => reject(err));

    stream.on('finish', () => {
      // ❌ אין makePublic – זה נופל עם UBLA
      // ✅ מייצרים URL ישיר לאובייקט. אם ה-bucket מוגדר כ-public דרך IAM זה יעבוד.
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;


      resolve({ publicUrl, storagePath: gcsPath });
    });

    stream.end(file.buffer);
  });
};

/**
 * 📷 Upload Photos
 */
exports.uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No photos uploaded' });
    }

    const log = await DailyLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (req.userRole !== 'Manager' && log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to upload photos' });
    }

    if (log.status === 'approved') {
      return res.status(400).json({ message: 'Log already approved' });
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      const { publicUrl, storagePath } = await uploadToGCS(file, 'photos');

      uploadedPhotos.push({
        path: publicUrl,       // URL ל-React
        storagePath,           // למחיקה מגוגל
        originalName: file.originalname,
        uploadedAt: new Date(),
      });
    }

    // 🔹 לוודא שמוגדר מערך לפני push (מונע Cannot read properties of undefined (reading 'push'))
    if (!Array.isArray(log.photos)) {
      log.photos = [];
    }

    log.photos.push(...uploadedPhotos);
    await log.save();

    return res.status(200).json({ message: 'Photos uploaded', photos: uploadedPhotos });
  } catch (error) {
    console.error('Upload Photos Error:', error);
    return res.status(500).json({ message: error.message });
  }
};


/**
 * 📄 Upload Documents (SAFE + ATOMIC)
 */
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No documents uploaded' });
    }

    // ✅ Debug schema (כדי לוודא שהמודל בענן הוא החדש)
    const documentsPath = DailyLog.schema.path('documents');
    console.log('documents schema instance:', documentsPath?.instance);
    console.log('documents schema caster:', documentsPath?.caster?.instance); // אם זה "String" -> מודל ישן
    console.log('documents schema isArray:', documentsPath?.$isMongooseArray);

    // ✅ תביא רק שדות שצריך (לא למשוך documents/photos בכלל)
    const log = await DailyLog.findById(req.params.logId).select('teamLeader status');
    if (!log) return res.status(404).json({ message: 'Log not found' });

    // ✅ הרשאות
    if (req.userRole !== 'Manager' && log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to upload documents' });
    }

    // ✅ אי אפשר להעלות למסמך מאושר
    if (log.status === 'approved') {
      return res.status(400).json({ message: 'Log already approved' });
    }

    const getDocumentType = (filename) => {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.pdf') return 'delivery_note';
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) return 'receipt';
      if (['.doc', '.docx', '.xls', '.xlsx'].includes(ext)) return 'invoice';
      return 'other';
    };

    const uploadedDocuments = [];

    for (const file of req.files) {
      const { publicUrl, storagePath } = await uploadToGCS(file, 'documents');

      uploadedDocuments.push({
        path: publicUrl,              // URL ל-React
        storagePath,                  // למחיקה מה-Bucket
        type: req.body?.type || getDocumentType(file.originalname),
        originalName: file.originalname,
        uploadedAt: new Date(),
      });
    }

    // ✅ עדכון אטומי - בלי log.save()
    const updatedLog = await DailyLog.findByIdAndUpdate(
      req.params.logId,
      { $push: { documents: { $each: uploadedDocuments } } },
      { new: true, runValidators: true }
    ).select('_id documents'); // אפשר להחזיר רק מה שצריך

    return res.status(200).json({
      message: 'Documents uploaded',
      documents: uploadedDocuments,
      totalDocuments: updatedLog?.documents?.length ?? undefined,
    });
  } catch (error) {
    console.error('Upload Documents Error:', error);
    return res.status(500).json({ message: error.message });
  }
};


/**
 * 🗑 Delete File
 */
exports.deleteFile = async (req, res) => {
  try {
    const { logId, fileType, fileId } = req.params;

    if (!['photos', 'documents'].includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    const log = await DailyLog.findById(logId);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (req.userRole !== 'Manager' && log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (log.status === 'approved') {
      return res.status(400).json({ message: 'Cannot delete from approved log' });
    }

    const files = fileType === 'photos' ? log.photos : log.documents;
    const index = files.findIndex((f) => f._id.toString() === fileId);

    if (index === -1) return res.status(404).json({ message: 'File not found' });

    const storagePath = files[index].storagePath;

    // מוחקים מה-Bucket (אם יש storagePath)
    if (storagePath) {
      try {
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
      } catch (err) {
        console.warn('GCS delete error:', err.message);
      }
    }

    files.splice(index, 1);
    await log.save();

    return res.status(200).json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete File Error:', error);
    return res.status(500).json({ message: error.message });
  }
};
