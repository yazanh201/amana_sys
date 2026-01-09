import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaFileDownload } from 'react-icons/fa';
import { logService } from '../../services/apiService';
import { toast } from 'react-toastify';
import moment from 'moment';

const LogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchLog = async () => {
    try {
      setLoading(true);
      const response = await logService.getLogById(id);
      setLog(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching log:', err);
      setError('נכשל בטעינת הדוח');
      toast.error('נכשל בטעינת הדוח');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLog = async () => {
    try {
      await logService.approveLog(id);
      toast.success('הדוח אושר בהצלחה');
      fetchLog();
    } catch (err) {
      console.error('שגיאה באישור הדוח:', err);
      toast.error('נכשל באישור הדוח');
    }
  };

  const handleExportToPdf = async () => {
    try {
      const response = await logService.exportLogToPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily-log-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('הייצוא ל־PDF הצליח');
    } catch (err) {
      console.error('שגיאה ביצוא PDF:', err);
      toast.error('נכשל ביצוא PDF');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <Badge bg="secondary">טיוטה</Badge>;
      case 'submitted':
        return <Badge bg="primary">נשלח</Badge>;
      case 'approved':
        return <Badge bg="success">מאושר</Badge>;
      default:
        return <Badge bg="secondary">לא ידוע</Badge>;
    }
  };

  // ✅ Base URL נקי מסלאש בסוף
  const baseUrl = useMemo(() => {
    const envBase = (process.env.REACT_APP_API_URL || '').trim();
    return envBase.replace(/\/$/, '');
  }, []);

  // ✅ בניית URL בטוחה לקבצים/תמונות (תומך גם ב-http מלא)
  const resolveFileUrl = (filePath) => {
    if (!filePath) return '';

    // אם זה כבר URL מלא — לא נוגעים
    if (/^https?:\/\//i.test(filePath)) return filePath;

    // מנקה סלאשים בהתחלה
    const cleanedPath = String(filePath).replace(/^\/+/, '');

    // אם אין בכלל baseUrl — ננסה לעבוד יחסי (לא אידיאלי אבל עדיף מכלום)
    if (!baseUrl) return `/${cleanedPath}`;

    return `${baseUrl}/${cleanedPath}`;
  };

  // ✅ איסוף תמונות מכל מבנה אפשרי למבנה אחיד
  const normalizedPhotos = useMemo(() => {
    if (!log) return [];

    // photos: [{path, originalName, _id}]
    if (Array.isArray(log.photos) && log.photos.length > 0) {
      return log.photos
        .filter((p) => p && p.path)
        .map((p, i) => ({
          key: p._id || `photo-${i}`,
          url: resolveFileUrl(p.path),
          alt: p.originalName || `תמונה ${i + 1}`,
        }));
    }

    // workPhotos: ["uploads/...", ...]
    if (Array.isArray(log.workPhotos) && log.workPhotos.length > 0) {
      return log.workPhotos
        .filter(Boolean)
        .map((path, i) => ({
          key: `workPhoto-${i}`,
          url: resolveFileUrl(path),
          alt: `תמונה ${i + 1}`,
        }));
    }

    return [];
  }, [log, baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const employees = Array.isArray(log?.employees) ? log.employees : [];

  if (loading) {
    return (
      <Container>
        <p className="text-center">טוען פרטי דוח...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/all-logs')}>
          חזור לכל הדוחות
        </Button>
      </Container>
    );
  }

  if (!log) {
    return (
      <Container>
        <Alert variant="warning">הדוח לא נמצא</Alert>
        <Button variant="primary" onClick={() => navigate('/all-logs')}>
          חזור לכל הדוחות
        </Button>
      </Container>
    );
  }

  return (
    <Container dir="rtl">
      {/* ניווט */}
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/all-logs')}>
            <FaArrowLeft className="me-1" /> חזור לכל הדוחות
          </Button>
        </Col>
        <Col xs="auto">
          {/* <Button variant="outline-secondary" className="me-2" onClick={handleExportToPdf}>
            <FaFileDownload className="me-1" /> ייצוא ל־PDF
          </Button> */}

          {log.status === 'submitted' && (
            <Button variant="success" onClick={handleApproveLog}>
              <FaCheck className="me-1" /> אשר דוח
            </Button>
          )}
        </Col>
      </Row>

      {/* כותרת */}
      <Row className="mb-4">
        <Col>
          <h2>פרטי דוח עבודה יומי</h2>
          <p className="text-muted mb-0">סטטוס: {getStatusBadge(log.status)}</p>
        </Col>
      </Row>

      {/* מידע כללי */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">מידע כללי</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p>
                <strong>תאריך:</strong> {log.date ? moment(log.date).format('DD/MM/YYYY') : '—'}
              </p>
              <p>
                <strong>פרויקט:</strong> {log.project || '—'}
              </p>
            </Col>

            <Col md={6}>
              <p>
                <strong>ראש צוות:</strong> {log.teamLeader?.fullName || '—'}
              </p>
              <p>
                <strong>שעות עבודה:</strong>{' '}
                {log.startTime ? moment(log.startTime).format('HH:mm') : '—'} –{' '}
                {log.endTime ? moment(log.endTime).format('HH:mm') : '—'}
                {log.workHours ? <strong> ({log.workHours} שעות)</strong> : null}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* עובדים נוכחים */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">עובדים נוכחים</h5>
        </Card.Header>
        <Card.Body>
          {employees.length === 0 ? (
            <p className="text-muted">לא נרשמו עובדים בדוח זה</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {employees.map((employee, index) => (
                <li key={index}>{employee}</li>
              ))}
            </ul>
          )}
        </Card.Body>
      </Card>

      {/* תיאור עבודה */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תיאור עבודה</h5>
        </Card.Header>
        <Card.Body>
          <p className="mb-0">{log.workDescription || '—'}</p>
        </Card.Body>
      </Card>

      {/* תמונות */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תמונות מהשטח</h5>
        </Card.Header>
        <Card.Body>
          {normalizedPhotos.length === 0 ? (
            <p className="text-muted mb-0">לא הועלו תמונות</p>
          ) : (
            <Row>
              {normalizedPhotos.map((p, index) => (
                <Col md={3} key={p.key} className="mb-3">
                  <div
                    style={{
                      backgroundColor: '#fff',
                      padding: '8px',
                      borderRadius: '12px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                    }}
                  >
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={p.url}
                        alt={p.alt}
                        className="img-thumbnail"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '150px',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          // כדי שלא תישאר תמונה שבורה
                          e.currentTarget.style.display = 'none';
                          console.warn('Image failed to load:', p.url);
                        }}
                      />
                    </a>
                    {/* אופציונלי: כיתוב מתחת לתמונה */}
                    {/* <div className="mt-1 text-muted" style={{ fontSize: '12px' }}>{p.alt}</div> */}
                  </div>
                </Col>
              ))}
            </Row>
          )}

          {/* עוזר לך בדיבאג אם env לא מוגדר */}
          {!baseUrl && (
            <Alert variant="warning" className="mt-3 mb-0">
              שים לב: REACT_APP_API_URL לא מוגדר, התמונות נבנות כנתיב יחסי. מומלץ להגדיר אותו בקובץ .env של ה־Frontend.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* היסטוריה */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">היסטוריית הדוח</h5>
        </Card.Header>
        <Card.Body>
          <p>
            <strong>נוצר:</strong>{' '}
            {log.createdAt ? moment(log.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </p>
          <p className="mb-0">
            <strong>עודכן לאחרונה:</strong>{' '}
            {log.updatedAt ? moment(log.updatedAt).format('DD/MM/YYYY HH:mm') : '—'}
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LogDetails;
