const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');
require('dotenv').config();
const { connectDB } = require('./config/db');

// Import Mongo models
//const AdminModel = require('./models/Admin');
const Studentmodel = require('./models/Student');
const Instructormodel = require('./models/Instructor');

// Import legacy NeDB models (courses/enrollments)
const { Course, Enrollment } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'learnex-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth helpers and constants
const ADMIN_CREDENTIALS = { id: 'admin', password: 'admin123' };

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (req.session.userId || req.session.role === 'admin') {
    next();
  } else {
    res.redirect('/login');
  }
};

// Role-based access control
const requireRole = (role) => (req, res, next) => {
  if (role === 'admin') {
    return req.session.role === 'admin' ? next() : res.redirect('/login');
  }
  return req.session.role === role ? next() : res.redirect('/login');
};

// Routes
app.get('/', async (req, res) => {
  try {
    const courses = await new Promise((resolve, reject) => {
      Course.find({}).limit(6).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
    
    const user = await getCurrentUser(req);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), { courses, user });
    res.render('layout', { 
      body,
      title: 'Learnex - Learn Without Limits',
      user
    });
  } catch (error) {
    console.error(error);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), { courses: [], user: null });
    res.render('layout', { 
      body,
      title: 'Learnex - Learn Without Limits',
      user: null
    });
  }
});

app.get('/courses', async (req, res) => {
  try {
    const courses = await new Promise((resolve, reject) => {
      Course.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
    
    const user = await getCurrentUser(req);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'courses.ejs'), { courses, user });
    res.render('layout', { 
      body,
      title: 'All Courses - Learnex',
      user
    });
  } catch (error) {
    console.error(error);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'courses.ejs'), { courses: [], user: null });
    res.render('layout', { 
      body,
      title: 'All Courses - Learnex',
      user: null
    });
  }
});

app.get('/course/:id', async (req, res) => {
  try {
    const course = await new Promise((resolve, reject) => {
      Course.findOne({ _id: req.params.id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
    
    if (!course) {
      return res.status(404).render('404', { title: 'Course Not Found' });
    }
    
    const user = await getCurrentUser(req);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'course-detail.ejs'), { course, user });
    res.render('layout', { 
      body,
      title: `${course.title} - Learnex`,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Internal server error' });
  }
});

app.get('/login', (req, res) => {
  ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: null }, (err, body) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error rendering page');
    }
    res.render('layout', { body, title: 'Login - Learnex', user: null });
  });
});

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (role === 'admin') {
    if (email === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password) {
      req.session.userId = null;
      req.session.role = 'admin';
      return res.redirect('/dashboard');
    }
    return ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' }, (err, body) => {
      if (err) return res.status(500).send('Error rendering page');
      res.render('layout', { body, title: 'Login - Learnex', user: null });
    });
  }

  try {
    let account = null;
    if (role === 'student') {
      account = await Studentmodel.findOne({ email });
    } else if (role === 'instructor') {
      // Instructor schema uses `id` as identifier, map email input to `id` field
      account = await Instructormodel.findOne({ id: email });
    } else {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
      return res.render('layout', { body, title: 'Login - Learnex', user: null });
    }

    if (!account) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
      return res.render('layout', { body, title: 'Login - Learnex', user: null });
    }

    // Plain text comparison per current schema
    const isValid = account.password === password;
    if (!isValid) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
      return res.render('layout', { body, title: 'Login - Learnex', user: null });
    }

    req.session.role = role;
    req.session.userId = account._id.toString();
    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
    return res.render('layout', { body, title: 'Login - Learnex', user: null });
  }
});

app.get('/register', (req, res) => {
  ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: null }, (err, body) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error rendering page');
    }
    res.render('layout', { body, title: 'Register - Learnex', user: null });
  });
});

app.post('/register', async (req, res) => {
  const { name, email, password, role, terms } = req.body;
  
  try {
    if (role === 'admin') {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'Admin registration is not allowed' });
      return res.render('layout', { body, title: 'Register - Learnex', user: null });
    }

    const normalizedRole = (role === 'instructor' || role === 'student') ? role : 'student';

    if (normalizedRole === 'student') {
      const existing = await Studentmodel.findOne({ email });
      if (existing) {
        const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'User already exists' });
        return res.render('layout', { body, title: 'Register - Learnex', user: null });
      }
      const created = await Studentmodel.create({
        name,
        email,
        password,
        role: 'student',
        terms
      });
      req.session.userId = created._id.toString();
      req.session.role = 'student';
      return res.redirect('/dashboard');
    }

    // Instructor registration using `id` as identifier
    const existingInst = await Instructormodel.findOne({ id: email });
    if (existingInst) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'User already exists' });
      return res.render('layout', { body, title: 'Register - Learnex', user: null });
    }
    const createdInst = await Instructormodel.create({ id: email, password, confirmpassword: password });
    req.session.userId = createdInst._id.toString();
    req.session.role = 'instructor';
    return res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'Registration failed' });
    return res.render('layout', { body, title: 'Register - Learnex', user: null });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    if (req.session.role === 'admin') return res.redirect('/dashboard/admin');
    if (req.session.role === 'instructor') return res.redirect('/dashboard/instructor');
    if (req.session.role === 'student') return res.redirect('/dashboard/student');
    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

// Student Dashboard
app.get('/dashboard/student', requireRole('student'), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const enrollments = await new Promise((resolve, reject) => {
      Enrollment.find({ userId: req.session.userId }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    const courseIds = enrollments.map(e => e.courseId);
    const enrolledCourses = await new Promise((resolve, reject) => {
      Course.find({ _id: { $in: courseIds } }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    const body = await ejs.renderFile(path.join(__dirname, 'views', 'dashboard.ejs'), { user, enrolledCourses });
    res.render('layout', { body, title: 'Student Dashboard - Learnex', user });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

// Instructor Dashboard
app.get('/dashboard/instructor', requireRole('instructor'), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const courses = await new Promise((resolve, reject) => {
      Course.find({ instructor: user.name }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    const courseIds = courses.map(c => c._id);
    const enrollments = await new Promise((resolve, reject) => {
      Enrollment.find({ courseId: { $in: courseIds } }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    const enrollmentCounts = {};
    courseIds.forEach(id => { enrollmentCounts[id] = 0; });
    enrollments.forEach(e => { enrollmentCounts[e.courseId] = (enrollmentCounts[e.courseId] || 0) + 1; });

    const body = await ejs.renderFile(path.join(__dirname, 'views', 'dashboard-instructor.ejs'), { user, courses, enrollmentCounts });
    res.render('layout', { body, title: 'Instructor Dashboard - Learnex', user });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

// Admin Dashboard
app.get('/dashboard/admin', requireRole('admin'), async (req, res) => {
  try {
    const user = { name: 'Admin', role: 'admin' };

    const [studentCount, instructorCount, courseCount, enrollmentCount] = await Promise.all([
      Studentmodel.countDocuments({}),
      Instructormodel.countDocuments({}),
      new Promise((resolve) => Course.count({}, (err, n) => resolve(n || 0))),
      new Promise((resolve) => Enrollment.count({}, (err, n) => resolve(n || 0)))
    ]);

    const totalUsers = (studentCount || 0) + (instructorCount || 0);

    const body = await ejs.renderFile(path.join(__dirname, 'views', 'dashboard-admin.ejs'), { user, stats: { totalUsers, studentCount, instructorCount, courseCount, enrollmentCount } });
    res.render('layout', { body, title: 'Admin Dashboard - Learnex', user });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.post('/enroll/:courseId', requireRole('student'), (req, res) => {
  const enrollment = {
    userId: req.session.userId,
    courseId: req.params.courseId,
    enrolledAt: new Date(),
    progress: 0
  };
  
  Enrollment.insert(enrollment, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Enrollment failed' });
    }
    res.json({ success: true });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Current user helper (handles admin + Mongo models)
async function getCurrentUser(req) {
  try {
    if (req.session && req.session.role === 'admin') {
      return { _id: 'admin', name: 'Admin', role: 'admin', email: 'admin@learnex.local' };
    }
    if (!req.session || !req.session.userId || !req.session.role) return null;

    if (req.session.role === 'student') {
      const doc = await Studentmodel.findById(req.session.userId);
      return doc ? { ...doc.toObject(), role: 'student' } : null;
    }
    if (req.session.role === 'instructor') {
      const doc = await Instructormodel.findById(req.session.userId);
      return doc ? { ...doc.toObject(), role: 'instructor' } : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Initialize sample data
async function initializeSampleData() {
  // Check if courses exist
  Course.count({}, (err, count) => {
    if (err || count > 0) return;
    
    const sampleCourses = [
      {
        title: "Full Stack Web Development",
        description: "Learn to build complete web applications from frontend to backend",
        instructor: "Sarah Johnson",
        duration: "12 weeks",
        level: "Intermediate",
        price: 299,
        image: "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Programming",
        lessons: 24,
        students: 1250
      },
      {
        title: "Data Science with Python",
        description: "Master data analysis, visualization, and machine learning",
        instructor: "Dr. Michael Chen",
        duration: "10 weeks",
        level: "Beginner",
        price: 249,
        image: "https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Data Science",
        lessons: 20,
        students: 890
      },
      {
        title: "Digital Marketing Mastery",
        description: "Complete guide to modern digital marketing strategies",
        instructor: "Emma Rodriguez",
        duration: "8 weeks",
        level: "Beginner",
        price: 199,
        image: "https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Marketing",
        lessons: 16,
        students: 2100
      },
      {
        title: "UI/UX Design Fundamentals",
        description: "Learn user interface and experience design principles",
        instructor: "Alex Thompson",
        duration: "6 weeks",
        level: "Beginner",
        price: 179,
        image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Design",
        lessons: 12,
        students: 756
      },
      {
        title: "Mobile App Development",
        description: "Build native mobile apps for iOS and Android",
        instructor: "David Park",
        duration: "14 weeks",
        level: "Advanced",
        price: 349,
        image: "https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Programming",
        lessons: 28,
        students: 645
      },
      {
        title: "Cybersecurity Essentials",
        description: "Protect systems and data from digital threats",
        instructor: "Rachel Adams",
        duration: "9 weeks",
        level: "Intermediate",
        price: 279,
        image: "https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=400",
        category: "Security",
        lessons: 18,
        students: 432
      }
    ];
    
    Course.insert(sampleCourses, (err) => {
      if (err) console.error('Error inserting sample courses:', err);
      else console.log('Sample courses inserted successfully');
    });
  });
}

// Start server after DB connection
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      initializeSampleData();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();