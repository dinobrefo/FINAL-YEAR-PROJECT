# IERBMS - Integrated Emergency Resource & Bed Management System

## Overview
A comprehensive healthcare emergency management platform that coordinates communication between ambulances and hospitals during medical emergencies. Built with React, TypeScript, Tailwind CSS, and Recharts.

## Features Implemented

### 🎨 Design System
- **Healthcare-specific Color Palette**: Medical blue primary (#0066CC) with semantic status colors
  - Success (green): #10B981 for stable conditions
  - Warning (amber): #F59E0B for moderate situations
  - Danger (red): #EF4444 for critical emergencies
  - Info (blue): #3B82F6 for informational content
- **Typography**: Inter font family for professional, accessible readability
- **Dark Mode**: Full support for 24/7 operations with theme toggle
- **Responsive Design**: Optimized for both mobile (ambulance crews) and desktop (hospital staff)

### 🚑 Ambulance Dashboard
- Active emergency cases overview
- Real-time vital signs monitoring
- AI-powered hospital recommendations
- Quick emergency creation
- Navigation to assigned hospitals
- Today's statistics and response times

### 🏥 Hospital Dashboard
- Available bed capacity tracking
- ICU capacity monitoring with alerts
- Incoming ambulance notifications
- Real-time patient vital signs
- Equipment status tracking
- Specialist availability
- Departmental bed occupancy charts

### 👨‍⚕️ Doctor Dashboard
- Assigned patient overview
- Incoming emergency notifications
- Treatment queue management
- Patient vital signs monitoring
- Quick access to patient records
- Consultation scheduling

### 🗺️ Command Center Dashboard
- Live city-wide emergency map
- Real-time ambulance tracking
- Hospital capacity overview
- Emergency trend analytics
- Response time analytics by hour
- Emergency type distribution charts
- Hospital bed occupancy monitoring
- Ambulance fleet status

### 📋 New Emergency Form
- Patient information collection
- Severity level selection (Critical/Moderate/Stable)
- Vital signs input (HR, BP, SpO2, Temperature)
- Emergency type categorization
- AI-powered hospital matching
- Match scores based on:
  - Patient severity
  - Distance and ETA
  - Bed availability
  - ICU capacity
  - Specialist availability
  - Equipment availability

### 🌐 Landing Page
- Professional hero section
- Key features overview
- Role-based portal selection
- How it works workflow
- Statistics showcase
- Call-to-action sections

## Real-Time Features

### 🔴 Live Updates (5-second intervals)
- Vital signs monitoring with realistic variations
- Ambulance location tracking
- Bed availability changes
- Visual indicators for live connections

### 📊 Data Visualization
- Emergency trends (6-month overview)
- Bed occupancy by department
- Emergency type distribution (pie chart)
- Response time analytics by hour
- Hospital utilization rates

## Technical Architecture

### Components
- **Custom IERBMS Components**:
  - `Button`: Multi-variant with loading states
  - `Card`: Flexible card layouts
  - `Input`: Form inputs with validation
  - `Navigation`: Role-based navigation system
  - `StatCard`: KPI display with trends
  - `StatusBadge`: Severity indicators with pulse animation
  
- **Context Providers**:
  - `ThemeProvider`: Dark/light mode management
  - `RealTimeProvider`: Simulated real-time data updates

### Routing
- React Router v7 with data mode
- Role-based dashboards:
  - `/` - Landing page
  - `/ambulance` - Ambulance personnel portal
  - `/hospital` - Hospital staff portal
  - `/doctor` - Doctor portal
  - `/command` - Command center portal
  - `/ambulance/new-emergency` - Emergency creation form

### Styling
- Tailwind CSS v4
- CSS custom properties for theming
- Responsive grid layouts
- Smooth transitions and animations
- Accessibility-focused color contrast

## Mock Data
- 3 active emergencies with full vital signs
- 4 hospitals with detailed capacity information
- 5 ambulances with real-time locations
- Chart data for analytics dashboards
- Specialists, equipment, and bed availability

## Accessibility
- WCAG compliant color contrast
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators
- High-stress situation optimization

## Design Principles
1. **Trust & Professionalism**: Clean, medical-grade UI
2. **Clarity**: High contrast, clear typography
3. **Speed**: Quick access to critical information
4. **Reliability**: Consistent patterns across roles
5. **24/7 Operations**: Dark mode for night shifts

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (iOS/Android)
- Optimized for tablets and desktops

## Future Enhancements (Not Implemented)
- Real Socket.IO integration
- Interactive map with real GPS coordinates
- Push notifications
- Print reports functionality
- Multi-language support
- PDF export features
- Advanced filtering and search
- Historical data analysis
- Integration with existing hospital systems

---

Built with ❤️ for healthcare emergency management
