import api from './apiService';

// 📤 העלאת תמונות (Photos) ללוג – משתמש בנתיב /uploads/:logId/photos
export function uploadPhoto(logId, formData) {
  return api.post(`/uploads/${logId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// 📤 העלאת מסמכים (Documents) ללוג – /uploads/:logId/documents
export function uploadDocument(logId, formData) {
  return api.post(`/uploads/${logId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// 📤 העלאת תעודת משלוח ישנה – כרגע עדיין endpoint נפרד
// שים לב: אם תרצה שגם זה ילך ל-GCS, נצטרך לעדכן את ה-backend של /logs/:logId/certificate
export const uploadCertificate = (logId, formData) => {
  return api.post(`/logs/${logId}/certificate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 🗑 מחיקת קובץ – חייב להתאים ל-route של ה-backend:
// DELETE /uploads/:logId/:fileType/:fileId
// fileType = 'photos' | 'documents'
export function deleteFile(logId, fileType, fileId) {
  return api.delete(`/uploads/${logId}/${fileType}/${fileId}`);
}

// 👀 בניית URL לתצוגת קובץ
// ✅ תומך גם ב-GCS (URL מלא) וגם בקבצים ישנים ב-/uploads
export function getFilePreviewUrl(filePath) {
  if (!filePath) return '';

  // אם זה כבר URL מלא (GCS או משהו אחר) – מחזירים כמו שהוא
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // אחרת – נבנה URL על בסיס ה-API (backend)
  const baseUrl =
    (process.env.REACT_APP_API_URL ||
      'https://daily-work-amana-main-417811099802.europe-west1.run.app').replace(/\/$/, '');

  // לוודא שיש / אחד בין הבסיס לנתיב
  const cleanedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  return `${baseUrl}${cleanedPath}`;
}
