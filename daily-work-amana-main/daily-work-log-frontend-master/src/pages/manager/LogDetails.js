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
                <strong>תאריך:</strong> {moment(log.date).format('DD/MM/YYYY')}
              </p>
              <p>
                <strong>פרויקט:</strong> {log.project}
              </p>
            </Col>

            <Col md={6}>
              <p>
                <strong>ראש צוות:</strong> {log.teamLeader?.fullName}
              </p>
              <p>
                <strong>שעות עבודה:</strong> {moment(log.startTime).format('HH:mm')} -{' '}
                {moment(log.endTime).format('HH:mm')}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">עובדים נוכחים</h5>
        </Card.Header>
        <Card.Body>
          {log.employees.length === 0 ? (
            <p className="text-muted">לא נרשמו עובדים בדוח זה</p>
          ) : (
            <ul className="list-unstyled">
              {log.employees.map((employee, index) => (
                <li key={index}>{employee}</li>
              ))}
            </ul>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תיאור עבודה</h5>
        </Card.Header>
        <Card.Body>
          <p>{log.workDescription}</p>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">תמונות מהשטח</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            {log.workPhotos.map((photoPath, index) => {
              const fullUrl = `https://daily-work-amana-main-backend-417811099802.europe-west1.run.app/${photoPath}`;
              return (
                <Col md={3} key={index} className="mb-3">
                  <div
                    style={{
                      backgroundColor: '#fff',
                      padding: '8px',
                      borderRadius: '12px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                    }}
                  >
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={fullUrl}
                        alt={`תמונה ${index + 1}`}
                        className="img-thumbnail"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '150px',
                          objectFit: 'cover',
                        }}
                      />
                    </a>
                  </div>
                </Col>
              );
            })}
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
            <strong>נוצר:</strong> {moment(log.createdAt).format('DD/MM/YYYY HH:mm')}
          </p>
          <p>
            <strong>עודכן לאחרונה:</strong> {moment(log.updatedAt).format('DD/MM/YYYY HH:mm')}
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LogDetails;
