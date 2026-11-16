import { Form, UserProfile } from '../types';

export const STARTER_PROFILES: UserProfile[] = [
  {
    id: 'user-admin-1',
    email: 'admin@college.edu',
    fullName: 'Dr. Sarah Jenkins (Dean)',
    role: 'admin'
  },
  {
    id: 'user-organizer-1',
    email: 'alex.organizer@college.edu',
    fullName: 'Alex Rivera (Tech Lead)',
    role: 'organizer'
  },
  {
    id: 'user-organizer-2',
    email: 'priya.sharma@college.edu',
    fullName: 'Priya Sharma (Cultural Secretary)',
    role: 'organizer'
  }
];

export const STARTER_FORMS: Form[] = [
  {
    id: 'form-event-hackathon-2026',
    title: 'TechNova 2026: Annual AI & Cloud Hackathon Registration',
    description: 'Welcome to the premier university hackathon of 2026. Join over 300 builders creating next-generation generative AI and cloud infrastructure solutions. Food and swags provided!',
    createdBy: 'user-organizer-1',
    creatorProfile: STARTER_PROFILES[1],
    status: 'published',
    settings: {
      isPublic: true,
      requiresLogin: false,
      allowMultipleResponses: false,
      responseLimit: 150,
      deadline: '2026-11-15T23:59:00Z',
      isEvent: true,
      eventDate: '2026-11-20T09:00:00Z',
      eventVenue: 'Main Auditorium & Innovation Lab (Hall 4)',
      eventCapacity: 150
    },
    collaborators: [
      {
        id: 'collab-1',
        formId: 'form-event-hackathon-2026',
        userId: 'user-organizer-2',
        userEmail: 'priya.sharma@college.edu',
        role: 'editor'
      }
    ],
    responseCount: 4,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
    questions: [
      {
        id: 'q1',
        formId: 'form-event-hackathon-2026',
        title: 'Full Name',
        description: 'As it should appear on your participant badge and certificate.',
        type: 'short_answer',
        required: true,
        orderIndex: 0,
        options: []
      },
      {
        id: 'q2',
        formId: 'form-event-hackathon-2026',
        title: 'Official Email Address',
        description: 'We will send team confirmation details and hackathon discord access here.',
        type: 'short_answer',
        required: true,
        orderIndex: 1,
        options: []
      },
      {
        id: 'q3',
        formId: 'form-event-hackathon-2026',
        title: 'Competition Track',
        description: 'Select the primary problem domain you want to hack in.',
        type: 'multiple_choice',
        required: true,
        orderIndex: 2,
        options: [
          'Generative AI & Agentic Systems',
          'Cloud & Distributed Systems',
          'Cybersecurity & Zero Trust',
          'FinTech & Open Banking',
          'Open Innovation / Wildcard'
        ]
      },
      {
        id: 'q4',
        formId: 'form-event-hackathon-2026',
        title: 'What programming languages/frameworks will your team use?',
        description: 'Select all that apply.',
        type: 'checkboxes',
        required: true,
        orderIndex: 3,
        options: [
          'Python (FastAPI, PyTorch)',
          'TypeScript / React / Node.js',
          'Go / Rust',
          'Java / Spring Boot',
          'Mobile (Flutter / React Native)'
        ]
      },
      {
        id: 'q5',
        formId: 'form-event-hackathon-2026',
        title: 'Academic Year',
        description: 'Select your current degree year.',
        type: 'dropdown',
        required: true,
        orderIndex: 4,
        options: [
          '1st Year Undergraduate',
          '2nd Year Undergraduate',
          '3rd Year Undergraduate',
          'Final Year Undergraduate',
          'Postgraduate / Masters'
        ]
      },
      {
        id: 'q6',
        formId: 'form-event-hackathon-2026',
        title: 'Team Arrival Date',
        description: 'When does your team plan to arrive on campus?',
        type: 'date',
        required: false,
        orderIndex: 5,
        options: []
      },
      {
        id: 'q7',
        formId: 'form-event-hackathon-2026',
        title: 'Self-assessed Technical Proficiency',
        description: 'Rate your familiarity with system architecture and full-stack development.',
        type: 'linear_scale',
        required: true,
        orderIndex: 6,
        options: [],
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: 'Beginner',
        scaleMaxLabel: 'Expert'
      },
      {
        id: 'q8',
        formId: 'form-event-hackathon-2026',
        title: 'Brief Project Pitch or Idea (Optional)',
        description: 'Describe any preliminary concept your team is excited to build.',
        type: 'paragraph',
        required: false,
        orderIndex: 7,
        options: []
      }
    ]
  },
  {
    id: 'form-seminar-web3',
    title: 'Modern Web Architecture & Edge Computing Seminar',
    description: 'A 2-day technical seminar on serverless computing, edge CDNs, and database scaling hosted by the Department of Computer Science.',
    createdBy: 'user-organizer-2',
    creatorProfile: STARTER_PROFILES[2],
    status: 'published',
    settings: {
      isPublic: true,
      requiresLogin: false,
      allowMultipleResponses: false,
      responseLimit: 80,
      deadline: '2026-11-05T18:00:00Z',
      isEvent: true,
      eventDate: '2026-11-10T14:00:00Z',
      eventVenue: 'Seminar Hall 2 & Live Stream',
      eventCapacity: 80
    },
    collaborators: [],
    responseCount: 3,
    createdAt: '2026-10-10T11:00:00Z',
    updatedAt: '2026-10-19T09:00:00Z',
    questions: [
      {
        id: 'sem-q1',
        formId: 'form-seminar-web3',
        title: 'Participant Name',
        type: 'short_answer',
        required: true,
        orderIndex: 0,
        options: []
      },
      {
        id: 'sem-q2',
        formId: 'form-seminar-web3',
        title: 'Participant Email',
        type: 'short_answer',
        required: true,
        orderIndex: 1,
        options: []
      },
      {
        id: 'sem-q3',
        formId: 'form-seminar-web3',
        title: 'Attendance Mode',
        type: 'multiple_choice',
        required: true,
        orderIndex: 2,
        options: ['In-Person (On Campus)', 'Online (Zoom / YouTube Live)']
      },
      {
        id: 'sem-q4',
        formId: 'form-seminar-web3',
        title: 'What specific topics do you want covered?',
        type: 'paragraph',
        required: false,
        orderIndex: 3,
        options: []
      }
    ]
  },
  {
    id: 'form-course-feedback',
    title: 'Department Course Experience & Curriculum Feedback',
    description: 'Anonymous end-of-semester feedback for Fall 2026 coursework. Your constructive input shapes future curriculum improvements.',
    createdBy: 'user-admin-1',
    creatorProfile: STARTER_PROFILES[0],
    status: 'published',
    settings: {
      isPublic: true,
      requiresLogin: false,
      allowMultipleResponses: true,
      isEvent: false
    },
    collaborators: [],
    responseCount: 2,
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-10-12T08:00:00Z',
    questions: [
      {
        id: 'fb-q1',
        formId: 'form-course-feedback',
        title: 'Which course are you providing feedback for?',
        type: 'dropdown',
        required: true,
        orderIndex: 0,
        options: [
          'CS301: Distributed Systems',
          'CS305: Database Engineering',
          'CS410: Machine Learning & Deep Learning',
          'CS422: Cloud Native Development'
        ]
      },
      {
        id: 'fb-q2',
        formId: 'form-course-feedback',
        title: 'Overall course satisfaction',
        type: 'linear_scale',
        required: true,
        orderIndex: 1,
        options: [],
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: 'Very Dissatisfied',
        scaleMaxLabel: 'Extremely Satisfied'
      },
      {
        id: 'fb-q3',
        formId: 'form-course-feedback',
        title: 'Suggestions for practical lab improvements',
        type: 'paragraph',
        required: false,
        orderIndex: 2,
        options: []
      }
    ]
  }
];

