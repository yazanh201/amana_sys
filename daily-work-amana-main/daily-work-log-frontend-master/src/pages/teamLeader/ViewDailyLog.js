import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { logService } from '../../services/apiService';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/he';
moment.locale('he');

const ViewDailyLog = () => {
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
      const status = err.response?.status;
      if (status === 404) {
        setError('הדו"ח לא נמצא. ייתכן שנמחק או שהקישור שגוי.');
      } else if (status === 403) {
        setError('אין לך הרשאה לצפות בדו"ח זה.');
      } else {
        setError('שגיאה בטעינת הדו"ח.');
      }
      toast.error('טעינת הדו"ח נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    return <Badge bg="primary">נשלח</Badge>;
  };

  // ⚙️ פונקציה שעוזרת לבנות URL לקובץ
  // אם זה כבר לינק מלא (https://storage.googleapis.com/...) – מחזירה כמו שהוא
  // אם זה נתיב יחסי ישן (/uploads/...) – מחברת אותו ל-REACT_APP_API_URL
  const resolveFileUrl = (filePath) => {
    if (!filePath) return '';

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    const baseUrl = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    const cleanedPath = filePath.replace(/^\/+/, '');
    return `${baseUrl}/${cleanedPath}`;
  };

  if (loading) {
    return (
      <Container dir="rtl">
        <p className="text-center">טוען את פרטי הדו"ח...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container dir="rtl">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/')}>
          חזרה ללוח הבקרה
        </Button>
      </Container>
    );
  }

  if (!log) {
    return (
      <Container dir="rtl">
        <Alert variant="warning">הדו"ח לא נמצא</Alert>
        <Button variant="primary" onClick={() => navigate('/')}>
          חזרה ללוח הבקרה
        </Button>
      </Container>
    );
  }

  // 🔎 מוצאים תעודת משלוח מתוך documents (GCS) אם קיימת
  const deliveryNoteFromDocuments =
    log.documents?.find((doc) => doc.type === 'delivery_note') || null;

  return (
    <Container dir="rtl">
      {/* כפתורי ניווט עליונים */}
      <Row className="mb-3">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/')}>
            <FaArrowLeft className="me-1" /> חזור לכל הדוחות
          </Button>
        </Col>
      </Row>

      {/* כותרת וסטטוס */}
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
                <strong>תאריך:</strong> {moment(log.date).format('DD/MM/YYYY')}
              </p>
              <p>
                <strong>פרויקט:</strong> {log.project?.name || log.project}
              </p>
            </Col>
            <Col md={6}>
              <p>
                <strong>ראש צוות:</strong> {log.teamLeader?.fullName || '-'}
              </p>
              <p>
                <strong>שעות עבודה:</strong>{' '}
                {moment(log.startTime).format('HH:mm')} –{' '}
                {moment(log.endTime).format('HH:mm')}
                <strong> ({log.workHours} שעות)</strong>
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
          {log.employees?.length > 0 ? (
            <ul className="list-unstyled">
              {log.employees.map((emp, i) => (
                <li key={i}>{emp.fullName || emp}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">לא נרשמו עובדים בדוח זה</p>
          )}
        </Card.Body>
      </Card>

      {/* תיאור עבודה */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תיאור עבודה</h5>
        </Card.Header>
        <Card.Body>
          <p>{log.workDescription || 'לא צויין תיאור עבודה'}</p>
        </Card.Body>
      </Card>

      {/* תמונות מהשטח */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תמונות מהשטח</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            {/* 🔹 קודם משתמשים במבנה החדש: log.photos (GCS) */}
            {log.photos && log.photos.length > 0 ? (
              log.photos.map((photo, i) => {
                const url = resolveFileUrl(photo.path);
                return (
                  <Col
                    xs={6}
                    sm={4}
                    md={3}
                    lg={2}
                    key={photo._id || i}
                    className="mb-3"
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={photo.originalName || `תמונה ${i + 1}`}
                        className="img-fluid rounded"
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                        }}
                      />
                    </a>
                  </Col>
                );
              })
            ) : log.workPhotos && log.workPhotos.length > 0 ? (
              // 🔙 תמיכה בלוגים ישנים: workPhotos = מערך של נתיבים
              log.workPhotos.map((photoPath, i) => {
                const url = resolveFileUrl(photoPath);
                return (
                  <Col
                    xs={6}
                    sm={4}
                    md={3}
                    lg={2}
                    key={i}
                    className="mb-3"
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`תמונה ${i + 1}`}
                        className="img-fluid rounded"
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                        }}
                      />
                    </a>
                  </Col>
                );
              })
            ) : (
              <p className="text-muted">לא הועלו תמונות</p>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* תעודת משלוח */}
      {(deliveryNoteFromDocuments || log.deliveryCertificate) && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">תעודת משלוח</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
                {(() => {
                  const filePath =
                    deliveryNoteFromDocuments?.path || log.deliveryCertificate;
                  const url = resolveFileUrl(filePath);

                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt="תעודת משלוח"
                        className="img-fluid rounded"
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/fallback-image.png';
                        }}
                      />
                    </a>
                  );
                })()}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* היסטוריית הדוח */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">היסטוריית הדוח</h5>
        </Card.Header>
        <Card.Body>
          <p>
            <strong>נוצר:</strong>{' '}
            {moment(log.createdAt).format('DD/MM/YYYY HH:mm')}
          </p>
          <p>
            <strong>עודכן לאחרונה:</strong>{' '}
            {moment(log.updatedAt).format('DD/MM/YYYY HH:mm')}
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ViewDailyLog;
