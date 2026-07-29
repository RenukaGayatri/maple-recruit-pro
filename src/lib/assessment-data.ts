export type MCQOption = { key: string; text: string };
export type MCQ = { id: number; question: string; options: MCQOption[]; correct: string; marks: number };

export const MCQ_QUESTIONS: MCQ[] = [
  {
    id: 1,
    question: "Choose the correctly spelled word.",
    options: [
      { key: "a", text: "Recieve" },
      { key: "b", text: "Receive" },
      { key: "c", text: "Receeve" },
      { key: "d", text: "Receve" },
    ],
    correct: "b",
    marks: 2,
  },
  {
    id: 2,
    question: "A is the father of B. B is the sister of C. How is A related to C?",
    options: [
      { key: "a", text: "Mother" },
      { key: "b", text: "Father" },
      { key: "c", text: "Brother" },
      { key: "d", text: "Uncle" },
    ],
    correct: "b",
    marks: 2,
  },
  {
    id: 3,
    question: "Find the next number in the series: 3, 6, 11, 18, 27, ?",
    options: [
      { key: "a", text: "36" },
      { key: "b", text: "38" },
      { key: "c", text: "40" },
      { key: "d", text: "42" },
    ],
    correct: "b",
    marks: 2,
  },
  {
    id: 4,
    question: "Choose the word that is the opposite of 'Concise'.",
    options: [
      { key: "a", text: "Brief" },
      { key: "b", text: "Short" },
      { key: "c", text: "Verbose" },
      { key: "d", text: "Precise" },
    ],
    correct: "c",
    marks: 2,
  },
  {
    id: 5,
    question: "If 20% of a number is 50, what is the number?",
    options: [
      { key: "a", text: "150" },
      { key: "b", text: "200" },
      { key: "c", text: "250" },
      { key: "d", text: "300" },
    ],
    correct: "c",
    marks: 2,
  },
  {
    id: 6,
    question: "Choose the sentence with correct punctuation.",
    options: [
      { key: "a", text: "Its a great day isnt it?" },
      { key: "b", text: "It's a great day, isn't it?" },
      { key: "c", text: "Its a great day, isn't it." },
      { key: "d", text: "It's a great day isn't it?" },
    ],
    correct: "b",
    marks: 2,
  },
  {
    id: 7,
    question:
      "A train 200m long is running at 60 km/hr. Which of the following statements is correct? (A) It crosses a pole in 12s. (B) It crosses a 100m platform in 20s. (C) It crosses a 100m platform in 18s.",
    options: [
      { key: "a", text: "Only A" },
      { key: "b", text: "Only B" },
      { key: "c", text: "Both A and C" },
      { key: "d", text: "All of the above" },
    ],
    correct: "c",
    marks: 2,
  },
  {
    id: 8,
    question: "Which of the following is NOT a social media platform?",
    options: [
      { key: "a", text: "Instagram" },
      { key: "b", text: "LinkedIn" },
      { key: "c", text: "Canva" },
      { key: "d", text: "Twitter" },
    ],
    correct: "c",
    marks: 2,
  },
  {
    id: 9,
    question: "Fill in the blank: The team _____ working on the project since Monday.",
    options: [
      { key: "a", text: "is" },
      { key: "b", text: "have" },
      { key: "c", text: "has been" },
      { key: "d", text: "were" },
    ],
    correct: "c",
    marks: 2,
  },
  {
    id: 10,
    question:
      "In a group of 100 people, 60 drink tea, 50 drink coffee, and 30 drink both. How many drink neither tea nor coffee?",
    options: [
      { key: "a", text: "0" },
      { key: "b", text: "10" },
      { key: "c", text: "20" },
      { key: "d", text: "30" },
    ],
    correct: "a",
    marks: 2,
  },
];

export const ROLES = [
  {
    id: "learning-content-developer",
    title: "Interactive Learning Content Developer Intern",
    shortTitle: "Learning Content Developer",
    prompt: "Explain how a bicycle works to a 10-year-old.",
    description:
      "Design engaging educational content and interactive learning experiences for our platform.",
  },
  {
    id: "social-media-marketing",
    title: "Social Media Marketing Intern",
    shortTitle: "Social Media Marketing",
    prompt: "Write a promotional social media caption for an online course launch.",
    description:
      "Craft compelling social campaigns and drive brand engagement across digital channels.",
  },
  {
    id: "business-development",
    title: "Business Development Intern",
    shortTitle: "Business Development",
    prompt:
      "How would you respond to a prospective client who says: \"We're not interested right now.\" Write your response.",
    description:
      "Identify growth opportunities, build partnerships, and drive revenue for the organization.",
  },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export const ASSESSMENT_DURATION_MIN = 20;
export const TOTAL_MARKS = 30;
export const PASS_PERCENTAGE = 80;
