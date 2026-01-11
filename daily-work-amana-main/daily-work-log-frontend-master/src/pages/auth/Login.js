import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');

  const validationSchema = Yup.object({
    email: Yup.string().required('שדה חובה'),
    password: Yup.string().required('שדה חובה')
  });

  const initialValues = {
    email: '',
    password: ''
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setError('');
    try {
      const result = await login(values);
      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      setError('אירעה שגיאה, נסה שוב.');
      toast.error('ההתחברות נכשלה. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', direction: 'rtl', textAlign: 'right' }}
    >
      <Row className="w-100">
        <Col md={5} className="mx-auto">
          <Card className="shadow-sm p-4">

            {/* 🔴 לוגו החברה באמצע */}
            <div className="text-center mb-4">
              <img
                src="/amana.png"
                alt="Company Logo"
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* כותרות */}
            <div className="text-center mb-4">
              <h2 className="fw-bold">מערכת ניהול דוחות יומיים</h2>
              <p className="text-muted">התחבר לחשבון שלך</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                <Form onSubmit={handleSubmit}>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>אימייל</Form.Label>
                    <Form.Control
                      type="text"
                      name="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.email && errors.email}
                    />
                    <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>סיסמה</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.password && errors.password}
                    />
                    <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                  </Form.Group>

                  <Button variant="primary" type="submit" disabled={isSubmitting} className="w-100 py-2">
                    {isSubmitting ? 'מתחבר...' : 'התחבר'}
                  </Button>

                </Form>
              )}
            </Formik>

          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
