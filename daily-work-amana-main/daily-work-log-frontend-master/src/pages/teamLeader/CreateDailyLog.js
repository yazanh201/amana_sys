import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { logService } from '../../services/apiService';
import { fileService } from '../../services/apiService';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const pad2 = (n) => String(n).padStart(2, '0');

/** ---------- פורמט חדש: Select אחד ל-HH:MM ברבעי שעה ---------- */
const QuarterHourSelectTimePicker = ({ label, value, onChange }) => {
  const h = value ? value.getHours() : 0;
  const m = value ? value.getMinutes() : 0;

  const hhmmOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    [0, 15, 30, 45].forEach((min) => {
      hhmmOptions.push({ label: `${pad2(hour)}:${pad2(min)}`, hour, min });
    });
  }

  const handleHHMMChange = (e) => {
    const [HH, MM] = e.target.value.split(':').map(Number);
    const next = value ? new Date(value) : new Date();
    next.setHours(HH, MM, 0, 0);
    onChange(next);
  };

  const currentHHMM = `${pad2(h)}:${pad2(m - (m % 15))}`;

  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Row className="g-2">
        <Col xs={8}>
          <Form.Select value={currentHHMM} onChange={handleHHMMChange}>
            {hhmmOptions.map(({ label, hour, min }) => (
              <option key={`${hour}-${min}`} value={`${pad2(hour)}:${pad2(min)}`}>
                {label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={4}>{/* שמרתי מקום אם תרצה להחזיר שניות בעתיד */}</Col>
      </Row>
    </Form.Group>
  );
};

/** ✅ אוטומציה: אם שעת סיום <= שעת התחלה => endNextDay=true, אחרת false */
const AutoNextDayWatcher = ({ startTime, endTime, endNextDay, setFieldValue }) => {
  React.useEffect(() => {
    if (!startTime || !endTime) return;

    const s = new Date(startTime);
    const e = new Date(endTime);

    const shouldBeNextDay = e <= s;

    if (endNextDay !== shouldBeNextDay) {
      setFieldValue('endNextDay', shouldBeNextDay);
    }
  }, [startTime, endTime, endNextDay, setFieldValue]);

  return null;
};

const CreateDailyLog = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const validationSchema = Yup.object({
    date: Yup.date().required('יש להזין תאריך'),
    project: Yup.string().required('יש להזין שם פרויקט'),
    employees: Yup.array().min(1, 'יש להזין לפחות עובד אחד'),
    startTime: Yup.date().required('יש להזין שעת התחלה'),
    endTime: Yup.date().required('יש להזין שעת סיום'),
    endNextDay: Yup.boolean(),
    workDescription: Yup.string().required('יש להזין תיאור עבודה'),
    workPhotos: Yup.mixed().nullable(),
  }).test(
    'end-after-start-with-nextday',
    'שעת הסיום חייבת להיות אחרי שעת ההתחלה (אם זה ביום למחרת – זה יסתדר אוטומטית)',
    function (values) {
      const { startTime, endTime, endNextDay } = values || {};
      if (!startTime || !endTime) return true;

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (endNextDay) end.setDate(end.getDate() + 1);

      return end > start;
    }
  );

  const initialValues = {
    date: new Date(),
    project: '',
    employees: [''],
    startTime: new Date(new Date().setHours(8, 0, 0, 0)),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)),
    endNextDay: false,
    workDescription: '',
    workPhotos: [],
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError('');

      const { workPhotos, employees, endNextDay, ...restValues } = values;

      const cleanedEmployees = (employees || []).filter((e) => e && e.trim() !== '');

      // ✅ בונים start/end אמיתיים על בסיס התאריך של הדוח
      const baseDate = new Date(values.date);

      const start = new Date(baseDate);
      start.setHours(values.startTime.getHours(), values.startTime.getMinutes(), 0, 0);

      const end = new Date(baseDate);
      end.setHours(values.endTime.getHours(), values.endTime.getMinutes(), 0, 0);

      // ✅ אם אוטומטית זה למחרת (או המשתמש שינה), נוסיף יום
      if (endNextDay) end.setDate(end.getDate() + 1);

      const payload = {
        ...restValues,
        employees: JSON.stringify(cleanedEmployees),
        date: new Date(values.date).toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };

      const createRes = await logService.createLog(payload);
      const createdLog = createRes.data;
      const logId = createdLog._id || createdLog.id;

      if (!logId) {
        throw new Error('Log ID is missing in createLog response');
      }

      // 🔹 העלאת תמונות (אם יש)
      if (workPhotos && workPhotos.length > 0) {
        const photosFormData = new FormData();
        workPhotos.forEach((photo) => {
          photosFormData.append('photos', photo);
        });

        await fileService.uploadPhoto(logId, photosFormData);
      }

      toast.success('דו"ח עבודה יומי נוצר בהצלחה');
      navigate('/');
    } catch (err) {
      console.error('שגיאה ביצירת דו"ח:', {
        status: err.response?.status,
        data: err.response?.data,
        fullError: err,
      });

      const errors = err.response?.data?.errors;
      let serverMessage =
        err.response?.data?.message ||
        (Array.isArray(errors) && errors.length > 0 ? errors[0]?.msg : null);

      setError(serverMessage || 'נכשל ביצירת דו"ח. אנא נסה שוב.');
      toast.error(serverMessage || 'נכשל ביצירת דו"ח');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container dir="rtl">
      <Row className="mb-4">
        <Col>
          <h2>יצירת דו"ח עבודה יומי</h2>
          <p className="text-muted">נא למלא את פרטי העבודה שבוצעה היום</p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Body>
          <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
              <Form onSubmit={handleSubmit}>
                {/* ✅ אוטומציה לסיום ביום למחרת */}
                <AutoNextDayWatcher
                  startTime={values.startTime}
                  endTime={values.endTime}
                  endNextDay={values.endNextDay}
                  setFieldValue={setFieldValue}
                />

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>תאריך</Form.Label>
                      <DatePicker
                        selected={values.date}
                        onChange={(date) => setFieldValue('date', date)}
                        className={`form-control ${touched.date && errors.date ? 'is-invalid' : ''}`}
                        dateFormat="dd/MM/yyyy"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>שם פרויקט</Form.Label>
                      <Form.Control
                        type="text"
                        name="project"
                        value={values.project}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isInvalid={touched.project && !!errors.project}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>עובדים נוכחים</Form.Label>
                  {values.employees.map((employee, index) => (
                    <Row key={index} className="mb-2">
                      <Col xs={10}>
                        <Form.Control
                          type="text"
                          name={`employees[${index}]`}
                          value={employee}
                          onChange={handleChange}
                          placeholder="שם העובד"
                        />
                      </Col>
                      <Col xs={2}>
                        <Button
                          variant="outline-danger"
                          onClick={() => {
                            const updated = [...values.employees];
                            updated.splice(index, 1);
                            setFieldValue('employees', updated);
                          }}
                          disabled={values.employees.length === 1}
                        >
                          ✕
                        </Button>
                      </Col>
                    </Row>
                  ))}
                  <Button variant="outline-primary" onClick={() => setFieldValue('employees', [...values.employees, ''])}>
                    הוסף עובד
                  </Button>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <QuarterHourSelectTimePicker
                      label="שעת התחלה"
                      value={values.startTime}
                      onChange={(d) => setFieldValue('startTime', d)}
                    />
                    {touched.startTime && errors.startTime && (
                      <div className="invalid-feedback d-block">{errors.startTime}</div>
                    )}
                  </Col>

                  <Col md={6}>
                    <QuarterHourSelectTimePicker
                      label="שעת סיום"
                      value={values.endTime}
                      onChange={(d) => setFieldValue('endTime', d)}
                    />
                    {touched.endTime && errors.endTime && (
                      <div className="invalid-feedback d-block">{errors.endTime}</div>
                    )}

                    {/* ✅ אינדיקציה בלבד (לא כפתור) */}
                    {values.endNextDay && (
                      <div className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        שים לב: שעת הסיום יוצאת ביום למחרת
                      </div>
                    )}
                  </Col>
                </Row>

                {/* שגיאת ולידציה כללית מה-test */}
                {typeof errors === 'string' && (
                  <Alert variant="danger" className="mt-2">
                    {errors}
                  </Alert>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>תיאור העבודה</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="workDescription"
                    value={values.workDescription}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.workDescription && !!errors.workDescription}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>צרף תמונות</Form.Label>
                  <Form.Control
                    type="file"
                    name="workPhotos"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files);
                      setFieldValue('workPhotos', files);
                    }}
                  />
                  {values.workPhotos.length > 0 && (
                    <ul className="mt-2">
                      {values.workPhotos.map((file, i) => (
                        <li key={i}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </Form.Group>

                <div className="d-flex justify-content-between">
                  <Button variant="secondary" onClick={() => navigate('/')}>
                    ביטול
                  </Button>
                  <Button variant="success" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'שולח...' : 'שמור ושלח'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateDailyLog;
