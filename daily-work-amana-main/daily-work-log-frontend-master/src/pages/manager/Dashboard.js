import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaFileDownload, FaSearch, FaCheck } from 'react-icons/fa';
import { logService, projectService } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import moment from 'moment';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: moment().subtract(7, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    project: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
  
      // בונים את האובייקט רק עם שדות שמולאו
      const query = {};
      if (filters.startDate) query.startDate = filters.startDate;
      if (filters.endDate) query.endDate = filters.endDate;
      if (filters.project.trim()) query.project = filters.project.trim();
  
      const response = await logService.getAllLogs(query);
      setLogs(response.data);
      setError('');
    } catch (err) {
      console.error('שגיאה בטעינת הדוחות:', err);
      setError('נכשל בטעינת הדוחות היומיים. נסה שוב.');
      toast.error('נכשל בטעינת הדוחות');
    } finally {
      setLoading(false);
    }
  };
  

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAllProjects();
      setProjects(response.data);
    } catch (err) {
      console.error('שגיאה בטעינת פרויקטים:', err);
      toast.error('נכשל בטעינת הפרויקטים');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleApproveLog = async (id) => {
    try {
      await logService.approveLog(id);
      toast.success('הדו"ח אושר בהצלחה');
      fetchLogs();
    } catch (err) {
      console.error('שגיאה באישור הדו"ח:', err);
      toast.error('נכשל באישור הדו"ח');
    }
  };

  const handleExportToPdf = async (id) => {
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
      toast.success('הייצוא ל־PDF הושלם בהצלחה');
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

  return (
    <Container dir="rtl">
      <Row className="mb-4">
        <Col>
          <h2>לוח ניהול - מנהל</h2>
          <p className="text-muted">ברוך הבא, {user?.fullName}</p>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">סינון דוחות</h5>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>תאריך התחלה</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>תאריך סיום</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>שם פרויקט</Form.Label>
                  <Form.Control
                    type="text"
                    name="project"
                    value={filters.project}
                    onChange={handleFilterChange}
                    placeholder="הכנס שם פרויקט"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button type="submit" variant="primary">
              <FaSearch className="me-1" /> סנן דוחות
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Header>
          <h5 className="mb-0">דוחות עבודה יומיים</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <p className="text-center">טוען דוחות...</p>
          ) : logs.length === 0 ? (
            <p className="text-center">לא נמצאו דוחות התואמים את הסינון.</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>ראש צוות</th>
                  <th>פרויקט</th>
                  <th>שעות עבודה</th>
                 
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>{moment(log.date).format('DD/MM/YYYY')}</td>
                    <td>{log.teamLeader.fullName|| '—'}</td>
                    <td>{log.project}</td>
                    <td>{moment(log.startTime).format('HH:mm')} - {moment(log.endTime).format('HH:mm')}</td>
                   
                    <td>
                      <Button
                        as={Link}
                        to={`/log-details/${log._id}`}
                        variant="outline-primary"
                        size="sm"
                        className="me-1"
                      >
                        <FaEye />
                      </Button>
                      {log.status === 'submitted' && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleApproveLog(log._id)}
                        >
                          <FaCheck />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ManagerDashboard;
