// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }
  
  // Close mobile menu when clicking on a link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
});

// Course filtering
document.addEventListener('DOMContentLoaded', function() {
  const categoryFilter = document.getElementById('categoryFilter');
  const levelFilter = document.getElementById('levelFilter');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (categoryFilter && levelFilter && coursesGrid) {
    function filterCourses() {
      const selectedCategory = categoryFilter.value;
      const selectedLevel = levelFilter.value;
      const courseCards = coursesGrid.querySelectorAll('.course-card');
      
      courseCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const cardLevel = card.getAttribute('data-level');
        
        const categoryMatch = !selectedCategory || cardCategory === selectedCategory;
        const levelMatch = !selectedLevel || cardLevel === selectedLevel;
        
        if (categoryMatch && levelMatch) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.5s ease';
        } else {
          card.style.display = 'none';
        }
      });
    }
    
    categoryFilter.addEventListener('change', filterCourses);
    levelFilter.addEventListener('change', filterCourses);
  }
});

// Course Detail Tabs
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
});

// Course Enrollment
document.addEventListener('DOMContentLoaded', function() {
  const enrollBtn = document.querySelector('.enroll-btn');
  
  if (enrollBtn) {
    enrollBtn.addEventListener('click', async function() {
      const courseId = this.getAttribute('data-course-id');
      
      try {
        const response = await fetch(`/enroll/${courseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.textContent = 'Enrolled!';
          this.classList.add('btn-success');
          this.disabled = true;
          
          // Show success message
          showMessage('Successfully enrolled in course!', 'success');
        } else {
          showMessage('Enrollment failed. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Enrollment error:', error);
        showMessage('Enrollment failed. Please try again.', 'error');
      }
    });
  }
});

// Utility function to show messages
function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  
  const styles = {
    position: 'fixed',
    top: '100px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    zIndex: '9999',
    color: 'white',
    fontWeight: '500',
    animation: 'slideIn 0.3s ease'
  };
  
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6'
  };
  
  Object.assign(messageDiv.style, styles);
  messageDiv.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(messageDiv);
  
  // Remove message after 3 seconds
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
  
  .btn-success {
    background: var(--success-color) !important;
  }
  
  .btn-success:hover {
    background: #059669 !important;
  }
  
  .message {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  /* Mobile Navigation Styles */
  @media (max-width: 768px) {
    .nav-menu {
      position: fixed;
      left: -100%;
      top: 72px;
      flex-direction: column;
      background-color: white;
      width: 100%;
      text-align: center;
      transition: 0.3s;
      box-shadow: 0 10px 27px rgba(0, 0, 0, 0.05);
      padding: 20px 0;
    }
    
    .nav-menu.active {
      left: 0;
    }
    
    .nav-item {
      margin: 16px 0;
    }
    
    .hamburger.active .bar:nth-child(2) {
      opacity: 0;
    }
    
    .hamburger.active .bar:nth-child(1) {
      transform: translateY(9px) rotate(45deg);
    }
    
    .hamburger.active .bar:nth-child(3) {
      transform: translateY(-9px) rotate(-45deg);
    }
  }
`;

document.head.appendChild(style);