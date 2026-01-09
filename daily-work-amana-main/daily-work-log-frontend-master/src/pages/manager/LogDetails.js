import React, { useState, useEffect } from 'react';
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

  // ✅ בניית URL בטוחה לתמונה
  const resolveFileUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;

    const baseUrl = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    const cleanedPath = String(filePath).replace(/^\/+/, '');
    return baseUrl ? `${baseUrl}/${cleanedPath}` : `/${cleanedPath}`;
  };

  // ✅ חישוב סכום שעות עבודה (אם אין workHours)
  const calcWorkHours = () => {
    if (log?.workHours !== undefined && log?.workHours !== null && log?.workHours !== '') {
      return Number(log.workHours);
    }

    if (!log?.startTime || !log?.endTime) return null;

    const start = moment(log.startTime);
    const end = moment(log.endTime);

    if (end.isBefore(start)) {
      end.add(1, 'day');
    }

    const hours = moment.duration(end.diff(start)).asHours();
    return Math.round(hours * 10) / 10; // ספרה אחת אחרי הנקודה
  };

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
                <strong>תאריך:</strong>{' '}
                {log.date ? moment(log.date).format('DD/MM/YYYY') : '—'}
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
                {calcWorkHours() !== null && (
                  <strong> ({calcWorkHours()} שעות)</strong>
                )}
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
          {employees.length > 0 ? (
            <ul className="list-unstyled mb-0">
              {employees.map((employee, index) => (
                <li key={index}>{employee}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mb-0">לא נרשמו עובדים בדוח זה</p>
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
          <Row>
            {Array.isArray(log.photos) && log.photos.length > 0 ? (
              log.photos.map((photo, i) => {
                const url = resolveFileUrl(photo?.path);
                if (!url) return null;

                return (
                  <Col md={3} key={photo?._id || i} className="mb-3">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={photo?.originalName || `תמונה ${i + 1}`}
                        className="img-thumbnail"
                        style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                      />
                    </a>
                  </Col>
                );
              })
            ) : Array.isArray(log.workPhotos) && log.workPhotos.length > 0 ? (
              log.workPhotos.map((photoPath, i) => {
                const url = resolveFileUrl(photoPath);
                if (!url) return null;

                return (
                  <Col md={3} key={i} className="mb-3">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`תמונה ${i + 1}`}
                        className="img-thumbnail"
                        style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                      />
                    </a>
                  </Col>
                );
              })
            ) : (
              <Col>
                <p className="text-muted mb-0">לא הועלו תמונות</p>
              </Col>
            )}
          </Row>
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
