export type MCQOption = { key: string; text: string };
export type MCQ = {
  id: number;
  question: string;
  type?: "mcq" | "text";
  options: MCQOption[];
  correct: string;
  marks: number;
  placeholder?: string;
  maxLength?: number;
};

const KEYS = ["a", "b", "c", "d"];

/** Compact helper: q(id, question, [4 options], correctIndex) */
function q(id: number, question: string, opts: string[], correctIndex: number): MCQ {
  return {
    id,
    question,
    type: "mcq",
    options: opts.map((text, i) => ({ key: KEYS[i], text })),
    correct: KEYS[correctIndex],
    marks: 2,
  };
}

function freeformTextQuestion(id: number, question: string, placeholder: string, maxLength = 500): MCQ {
  return {
    id,
    question,
    type: "text",
    options: [],
    correct: "",
    marks: 0,
    placeholder,
    maxLength,
  };
}

/**
 * Master bank of 50 aptitude / reasoning / language / general-awareness questions.
 * Every candidate receives a randomly drawn subset (see QUESTIONS_PER_ASSESSMENT),
 * so no two candidates get the same paper.
 */
export const MCQ_BANK: MCQ[] = [
  // ── Language & Grammar ──────────────────────────────────────────────
  q(1, "Choose the correctly spelled word.", ["Recieve", "Receive", "Receeve", "Receve"], 1),
  q(2, "Choose the word that is the opposite of 'Concise'.", ["Brief", "Short", "Verbose", "Precise"], 2),
  q(3, "Choose the sentence with correct punctuation.", [
    "Its a great day isnt it?",
    "It's a great day, isn't it?",
    "Its a great day, isn't it.",
    "It's a great day isn't it?",
  ], 1),
  q(4, "Fill in the blank: The team _____ working on the project since Monday.", ["is", "have", "has been", "were"], 2),
  q(5, "Choose the correctly spelled word.", ["Accomodate", "Acommodate", "Accommodate", "Acomodate"], 2),
  q(6, "Choose the synonym of 'Diligent'.", ["Careless", "Hardworking", "Hesitant", "Generous"], 1),
  q(7, "Identify the grammatically correct sentence.", [
    "Each of the students have submitted their form.",
    "Each of the students has submitted their form.",
    "Each of the student have submitted the form.",
    "Each of the students having submitted the form.",
  ], 1),
  q(8, "Choose the correct preposition: She is good _____ solving puzzles.", ["in", "at", "on", "for"], 1),
  q(9, "Choose the antonym of 'Transparent'.", ["Clear", "Opaque", "Visible", "Plain"], 1),
  q(10, "Which word is a correctly used adverb? 'He completed the task _____.'", ["quick", "quickly", "quicker than", "quickness"], 1),
  q(11, "Choose the correct form: 'Neither the manager nor the interns _____ available.'", ["is", "was", "are", "has"], 2),
  q(12, "Pick the correctly spelled word.", ["Definately", "Definitely", "Definetly", "Defenitely"], 1),
  q(13, "Choose the meaning of the idiom: 'To hit the nail on the head'.", [
    "To cause damage",
    "To be exactly right",
    "To work very hard",
    "To make a mistake",
  ], 1),
  q(14, "Choose the correct sentence.", [
    "I look forward to hear from you.",
    "I look forward to hearing from you.",
    "I am looking forward hear from you.",
    "I look forwards to hear from you.",
  ], 1),
  q(15, "Choose the synonym of 'Collaborate'.", ["Compete", "Cooperate", "Complain", "Complete"], 1),

  // ── Quantitative Aptitude ───────────────────────────────────────────
  q(16, "If 20% of a number is 50, what is the number?", ["150", "200", "250", "300"], 2),
  q(17, "A shirt costs ₹800 after a 20% discount. What was the original price?", ["₹960", "₹1000", "₹1040", "₹1200"], 1),
  q(18, "The average of 5 numbers is 18. If one number is removed, the average becomes 20. What was the removed number?", ["8", "10", "12", "14"], 1),
  q(19, "A train 200m long is running at 60 km/hr. Which statement is correct? (A) It crosses a pole in 12s. (B) It crosses a 100m platform in 20s. (C) It crosses a 100m platform in 18s.", ["Only A", "Only B", "Both A and C", "All of the above"], 2),
  q(20, "In a group of 100 people, 60 drink tea, 50 drink coffee and 30 drink both. How many drink neither?", ["0", "10", "20", "30"], 2),
  q(21, "If 5 workers finish a job in 12 days, how long will 10 workers take (same rate)?", ["4 days", "6 days", "8 days", "10 days"], 1),
  q(22, "A sum of ₹5000 earns simple interest at 8% per annum. What is the interest after 2 years?", ["₹400", "₹600", "₹800", "₹1000"], 2),
  q(23, "What is 15% of 240?", ["32", "34", "36", "38"], 2),
  q(24, "The ratio of boys to girls in a class is 3:2. If there are 30 boys, how many girls are there?", ["15", "20", "25", "45"], 1),
  q(25, "A product is bought for ₹250 and sold for ₹300. What is the profit percentage?", ["15%", "18%", "20%", "25%"], 2),
  q(26, "If a car travels 180 km in 3 hours, what is its average speed?", ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], 2),
  q(27, "A course fee rises from ₹4000 to ₹4600. What is the percentage increase?", ["12%", "15%", "18%", "20%"], 1),
  q(28, "Two numbers are in the ratio 4:5 and their sum is 108. What is the larger number?", ["48", "54", "60", "64"], 2),
  q(29, "What is the value of (0.2 × 0.5) ÷ 0.1?", ["0.1", "0.5", "1", "10"], 2),
  q(30, "A team of 4 completes 60% of a task in 6 days. At the same rate, how many more days to finish?", ["3 days", "4 days", "5 days", "6 days"], 1),

  // ── Logical Reasoning ───────────────────────────────────────────────
  q(31, "A is the father of B. B is the sister of C. How is A related to C?", ["Mother", "Father", "Brother", "Uncle"], 1),
  q(32, "Find the next number in the series: 3, 6, 11, 18, 27, ?", ["36", "38", "40", "42"], 1),
  q(33, "Find the next number: 2, 6, 12, 20, 30, ?", ["36", "40", "42", "44"], 2),
  q(34, "Complete the series: A, C, F, J, ?", ["M", "N", "O", "P"], 2),
  q(35, "If CAT is coded as DBU, how is DOG coded?", ["EPH", "EPG", "DPH", "FQI"], 0),
  q(36, "Pointing to a photo, Ravi said, 'She is the daughter of my grandfather's only son.' Who is she?", ["His cousin", "His sister", "His niece", "His aunt"], 1),
  q(37, "Which one does not belong: Circle, Square, Triangle, Cube?", ["Circle", "Square", "Triangle", "Cube"], 3),
  q(38, "All roses are flowers. Some flowers fade quickly. Which conclusion certainly follows?", [
    "All roses fade quickly",
    "Some roses fade quickly",
    "No rose fades quickly",
    "None of these certainly follows",
  ], 3),
  q(39, "Find the odd one out: 3, 5, 11, 14, 17", ["5", "11", "14", "17"], 2),
  q(40, "If today is Wednesday, what day will it be after 45 days?", ["Friday", "Saturday", "Sunday", "Monday"], 2),
  q(41, "In a race, Meera finished ahead of Nina but behind Priya. Who finished first?", ["Meera", "Nina", "Priya", "Cannot be determined"], 2),
  q(42, "Find the next term: 1, 4, 9, 16, 25, ?", ["30", "34", "36", "49"], 2),
  q(43, "A clock shows 3:00. What is the angle between the hour and minute hands?", ["60°", "75°", "90°", "120°"], 2),
  q(44, "If 'MARKETING' is written with letters reversed, what is the 4th letter from the left in the new word?", ["T", "E", "K", "I"], 0),

  // ── Digital / Workplace Awareness ───────────────────────────────────
  q(45, "Which of the following is NOT a social media platform?", ["Instagram", "LinkedIn", "Canva", "Twitter"], 2),
  q(46, "In email communication, 'CC' stands for:", ["Common Copy", "Carbon Copy", "Client Copy", "Content Copy"], 1),
  q(47, "Which metric best measures social media audience interaction?", ["Impressions", "Engagement rate", "Bounce rate", "Page load time"], 1),
  q(48, "Which tool is primarily used for creating presentations?", ["Google Sheets", "Google Slides", "Google Forms", "Google Drive"], 1),
  q(49, "In a professional email, the most appropriate opening line is:", [
    "Hey! What's up?",
    "Dear Sir/Madam, I hope this email finds you well.",
    "Yo, quick question…",
    "Hi, read this fast.",
  ], 1),
  q(50, "'CTA' in digital marketing stands for:", ["Click To Access", "Call To Action", "Content Traffic Analysis", "Customer Target Audience"], 1),

  freeformTextQuestion(
    51,
    "Tell us about a creative idea you would use to make an internship program more engaging for students.",
    "Write a creative idea and explain why it would work…",
    500,
  ),
  freeformTextQuestion(
    52,
    "Describe a situation where you solved a problem in a practical and thoughtful way. What did you do and why?",
    "Describe a real or imagined example from your own experience…",
    600,
  ),
  freeformTextQuestion(
    53,
    "If you had to pitch yourself for a role in this company, what would you say in under 150 words?",
    "Write a confident, brief introduction about yourself and your strengths…",
    400,
  ),
];

/** Backwards-compatible alias. */
export const MCQ_QUESTIONS = MCQ_BANK;

export const QUESTIONS_PER_ASSESSMENT = 10;
export const REQUIRED_LAST_QUESTION_IDS = [51, 52, 53];

export function getQuestionById(id: number | string): MCQ | undefined {
  return MCQ_BANK.find((x) => x.id === Number(id));
}

/** Fisher–Yates draw of N unique questions — a fresh random paper per candidate. */
export function drawQuestionIds(n: number = QUESTIONS_PER_ASSESSMENT): number[] {
  const nonTextIds = MCQ_BANK.filter((question) => question.type !== "text").map((question) => question.id);

  for (let i = nonTextIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonTextIds[i], nonTextIds[j]] = [nonTextIds[j], nonTextIds[i]];
  }

  const totalRequired = REQUIRED_LAST_QUESTION_IDS.length;
  const selectedCore = nonTextIds.slice(0, Math.max(0, n - totalRequired));
  return [...selectedCore, ...REQUIRED_LAST_QUESTION_IDS].slice(0, n);
}

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
export const MCQ_MARKS = QUESTIONS_PER_ASSESSMENT * 2; // 20
export const TOTAL_MARKS = MCQ_MARKS + 10; // 30
export const PASS_PERCENTAGE = 55;
