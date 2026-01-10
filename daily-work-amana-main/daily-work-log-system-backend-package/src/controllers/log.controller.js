const DailyLog = require('../models/dailyLog.model');
const { validationResult } = require('express-validator');
const notificationController = require('./notification.controller');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const mongoose = require('mongoose');
const User = require('../models/user.model'); // ✅ חשוב לייבא את מודל המשתמשים

// Get all logs (with filtering)
exports.getAllLogs = async (req, res) => {
  try {
    const { startDate, endDate, project, status, teamLeader, searchTerm } = req.query;
    const filter = {};

    // 📅 סינון לפי טווח תאריכים
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date = { $lte: end };
    }

    // 🏗️ פרויקט
    if (project) filter.project = project;

    // 🟢 סטטוס
    if (status) filter.status = status;

    // 👨‍🔧 ראש צוות
    if (teamLeader) filter.teamLeader = teamLeader;

    // 🔍 חיפוש בטקסט
    if (searchTerm) {
      filter.workDescription = { $regex: searchTerm, $options: 'i' };
    }

    // אם המשתמש הוא ראש צוות – החזר רק את הדוחות שלו
    if (req.userRole === 'Team Leader') {
      filter.teamLeader = req.userId;
    }

    const logs = await DailyLog.find(filter)
      .sort({ date: -1 })
      .populate('teamLeader', 'fullName')
      

    return res.status(200).json(logs);
  } catch (error) {
    console.error('❌ Error while fetching logs:', error);
    return res.status(500).json({ message: error.message || 'Error retrieving logs' });
  }
};

// Get logs for current team leader (limit to 5 latest)
exports.getMyLogs = async (req, res) => {
  try {
    const logs = await DailyLog.find({
      teamLeader: new mongoose.Types.ObjectId(req.userId)
    })
      .sort({ date: -1 })
      .limit(5)
      .populate('project', 'name');

    console.log('📌 req.userId:', req.userId);
    return res.status(200).json(logs);
  } catch (error) {
    console.error('❌ Error while fetching my logs:', error);
    return res.status(500).json({ message: error.message || 'Error retrieving logs' });
  }
};

// Get team leaders
exports.getTeamLeaders = async (req, res) => {
  try {
    const teamLeaders = await User.find({ role: 'Team Leader' }).select('_id fullName');
    res.status(200).json(teamLeaders);
  } catch (error) {
    console.error('❌ שגיאה בטעינת ראשי צוות:', error);
    res.status(500).json({ message: 'שגיאה בטעינת ראשי צוות' });
  }
};

// Get log by ID
exports.getLogById = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id)
      .populate('teamLeader', 'fullName')
      .populate('project', 'name');

    if (!log) return res.status(404).json({ message: 'Log not found' });

    const teamLeaderId =
      typeof log.teamLeader === 'object' && log.teamLeader._id
        ? log.teamLeader._id.toString()
        : log.teamLeader?.toString();

    if (req.userRole !== 'Manager' && teamLeaderId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this log' });
    }

    return res.status(200).json(log);
  } catch (error) {
    console.error('❌ Error while fetching log by ID:', error);
    return res.status(500).json({ message: error.message || 'Error retrieving the log' });
  }
};

exports.createLog = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ errors: errors.array() });
    }

    let { date, project, employees, startTime, endTime, workDescription, status } = req.body;

    // ✅ בדיקות חובה
    if (!date || !project || !startTime || !endTime) {
      throw new Error('Missing required fields');
    }

    // ⏱️ חישוב שעות
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      throw new Error('Invalid startTime or endTime');
    }

    if (end <= start) {
      throw new Error('End time must be after start time');
    }

    const diffMs = end - start;
    const workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    // 👷 עובדים
    if (typeof employees === 'string') {
      employees = JSON.parse(employees);
    }
    if (!Array.isArray(employees) || employees.length === 0) {
      throw new Error('Employees must be a non-empty array');
    }

    // 📎 קבצים
    const deliveryCertificate = req.files?.deliveryCertificate?.[0]
      ? 'uploads/' + req.files.deliveryCertificate[0].path.replace(/\\/g, '/').split('uploads/')[1]
      : null;

    const workPhotos =
      req.files?.workPhotos?.map((file) => {
        const relative = file.path.replace(/\\/g, '/').split('uploads/')[1];
        return `uploads/${relative}`;
      }) || [];

    // 📝 יצירת הדוח (עדיין לא נשמר בפועל)
    const newLog = new DailyLog({
      date: new Date(date),
      project: project.trim(),
      employees,
      startTime: start,
      endTime: end,
      workHours,
      workDescription: (workDescription || '').trim(),
      deliveryCertificate,
      workPhotos,
      teamLeader: req.userId,
      status: status || 'draft',
      documents: [],
      photos: [],
    });

    // 💾 שמירה עם session
    const savedLog = await newLog.save({ session });

    // ✅ הכל עבר – מאשרים
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(savedLog);

  } catch (error) {
    // ❌ כל שגיאה → ביטול מוחלט
    await session.abortTransaction();
    session.endSession();

    console.error('❌ Log creation failed:', error.message);

    return res.status(400).json({
      message: 'Log was NOT saved. Fix the error and try again.',
      error: error.message,
    });
  }
};



// Update a log
exports.updateLog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const log = await DailyLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this log' });
    }

    if (log.status === 'approved') {
      return res.status(400).json({ message: 'Cannot update an approved log' });
    }

    // ✅ רק שדות שמותר לעדכן (Whitelist)
    const allowedFields = [
      'date',
      'project',
      'employees',
      'startTime',
      'endTime',
      'workDescription',
      'status'
    ];

    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    // ✅ employees יכול להגיע כמחרוזת JSON (כששולחים FormData)
    if (updateData.employees && typeof updateData.employees === 'string') {
      try {
        updateData.employees = JSON.parse(updateData.employees);
      } catch (e) {
        // אם זה כבר "a,b,c" או משהו לא JSON
        // אפשר להשאיר כמו שהוא או להפוך למערך לפי פסיקים
        // פה נשאיר שגיאה כדי שלא יישמר משהו לא תקין:
        return res.status(400).json({ message: 'employees must be a valid JSON array' });
      }
    }

    // ✅ תאריכים
    if (updateData.date) updateData.date = new Date(updateData.date);
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

        // ⏱️ חישוב מחדש של שעות עבודה אם השתנו הזמנים
    if (updateData.startTime || updateData.endTime) {
      const start = updateData.startTime || log.startTime;
      const end = updateData.endTime || log.endTime;

      if (end <= start) {
        return res.status(400).json({
          message: 'End time must be after start time',
        });
      }

      const diffMs = end - start;
      updateData.workHours =
        Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }


    // ✅ קבצים ישנים (local uploads) — רק אם אתה עדיין משתמש בזה במסך עדכון
    if (req.files?.deliveryCertificate?.[0]) {
      updateData.deliveryCertificate =
        'uploads/' +
        req.files.deliveryCertificate[0].path.replace(/\\/g, '/').split('uploads/')[1];
    }

    if (req.files?.workPhotos?.length) {
      updateData.workPhotos = req.files.workPhotos.map(file => {
        const relative = file.path.replace(/\\/g, '/').split('uploads/')[1];
        return `uploads/${relative}`;
      });
    }

    const updatedLog = await DailyLog.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error('❌ Error while updating log:', error);
    return res.status(500).json({ message: error.message || 'Error updating the log' });
  }
};


// Submit a log (SAFE VERSION)
exports.submitLog = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to submit this log' });
    }

    if (log.status !== 'draft') {
      return res.status(400).json({ message: `Log is already ${log.status}` });
    }

    const updatedLog = await DailyLog.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'submitted' } },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Log submitted successfully',
      id: updatedLog._id,
      status: updatedLog.status,
    });
  } catch (error) {
    console.error('❌ Error while submitting log:', error);
    return res.status(500).json({ message: error.message || 'Error submitting the log' });
  }
};


// Approve a log (SAFE VERSION)
exports.approveLog = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    if (log.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted logs can be approved' });
    }

    const updatedLog = await DailyLog.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'approved',
          approvedBy: req.userId,
          approvedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    await notificationController.createLogApprovedNotification(updatedLog._id);

    return res.status(200).json({
      message: 'Log approved successfully',
      id: updatedLog._id,
      status: updatedLog.status,
    });
  } catch (error) {
    console.error('❌ Error while approving log:', error);
    return res.status(500).json({ message: error.message || 'Error approving the log' });
  }
};


// Delete a log
exports.deleteLog = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (req.userRole !== 'Manager' && log.teamLeader.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this log' });
    }

    if (log.status === 'approved' && req.userRole !== 'Manager') {
      return res.status(400).json({ message: 'Cannot delete an approved log' });
    }

    await DailyLog.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('❌ Error while deleting log:', error);
    return res.status(500).json({ message: error.message || 'Error deleting the log' });
  }
};

// Export log to PDF
exports.exportLogToPdf = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id).populate('teamLeader', 'fullName');

    if (!log) return res.status(404).json({ message: 'Log not found' });

    if (req.userRole !== 'Manager' && log.teamLeader._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to export this log' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=daily-log-${log._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Daily Work Log', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Date: ${moment(log.date).format('DD/MM/YYYY')}`);
    doc.text(`Project: ${log.project}`);
    doc.text(`Team Leader: ${log.teamLeader?.fullName || '—'}`);
    doc.text(`Work Hours: ${moment(log.startTime).format('HH:mm')} - ${moment(log.endTime).format('HH:mm')}`);
    doc.text(`Status: ${log.status}`);
    
    doc.moveDown();
    doc.fontSize(14).text('Employees Present:');
    doc.fontSize(12);
    if (log.employees.length === 0) {
      doc.text('No employees recorded.');
    } else {
      log.employees.forEach(emp => doc.text(`- ${emp}`));
    }

    doc.moveDown();
    doc.fontSize(14).text('Work Description:');
    doc.fontSize(12).text(log.workDescription);
    doc.end();
  } catch (error) {
    console.error('❌ Error while exporting log to PDF:', error);
    return res.status(500).json({ message: error.message || 'Error exporting the log' });
  }
};