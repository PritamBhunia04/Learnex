const Datastore = require('nedb');
const path = require('path');

// Initialize databases
const User = new Datastore({ filename: path.join(__dirname, '../data/users.db'), autoload: true });
const Course = new Datastore({ filename: path.join(__dirname, '../data/courses.db'), autoload: true });
const Enrollment = new Datastore({ filename: path.join(__dirname, '../data/enrollments.db'), autoload: true });

// Create indexes
User.ensureIndex({ fieldName: 'email', unique: true });
Course.ensureIndex({ fieldName: 'title' });
Enrollment.ensureIndex({ fieldName: 'userId' });
Enrollment.ensureIndex({ fieldName: 'courseId' });

module.exports = {
  User,
  Course,
  Enrollment
};