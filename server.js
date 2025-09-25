const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');

// Import database models
const { User, Course, Enrollment } = require('./models/database');

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

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
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
    
    const user = req.session.userId ? await getUserById(req.session.userId) : null;
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
    
    const user = req.session.userId ? await getUserById(req.session.userId) : null;
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
    
    const user = req.session.userId ? await getUserById(req.session.userId) : null;
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

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  User.findOne({ email }, async (err, user) => {
    if (err || !user) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
      return res.render('layout', { body, title: 'Login - Learnex', user: null });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'login.ejs'), { error: 'Invalid credentials' });
      return res.render('layout', { body, title: 'Login - Learnex', user: null });
    }
    
    req.session.userId = user._id;
    res.redirect('/dashboard');
  });
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
  const { name, email, password, role } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      User.findOne({ email }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
    
    if (existingUser) {
      const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'User already exists' });
      return res.render('layout', { body, title: 'Register - Learnex', user: null });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      createdAt: new Date()
    };
    
    User.insert(newUser, (err, user) => {
      if (err) {
        ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'Registration failed' }, (renderErr, body) => {
          if (renderErr) {
            console.error(renderErr);
            return res.status(500).send('Error rendering page');
          }
          res.render('layout', { body, title: 'Register - Learnex', user: null });
        });
        return;
      }
      
      req.session.userId = user._id;
      res.redirect('/dashboard');
    });
    
  } catch (error) {
    console.error(error);
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'register.ejs'), { error: 'Registration failed' });
    res.render('layout', { body, title: 'Register - Learnex', user: null });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    const enrollments = await new Promise((resolve, reject) => {
      Enrollment.find({ userId: req.session.userId }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
    
    // Get enrolled courses
    const courseIds = enrollments.map(e => e.courseId);
    const enrolledCourses = await new Promise((resolve, reject) => {
      Course.find({ _id: { $in: courseIds } }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
    
    const body = await ejs.renderFile(path.join(__dirname, 'views', 'dashboard.ejs'), { user, enrolledCourses });
    res.render('layout', { 
      body,
      title: 'Dashboard - Learnex',
      user
    });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.post('/enroll/:courseId', requireAuth, (req, res) => {
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

// Helper function
async function getUserById(id) {
  return new Promise((resolve, reject) => {
    User.findOne({ _id: id }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initializeSampleData();
});