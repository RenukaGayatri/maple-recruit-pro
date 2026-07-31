# Maple Learning Solutions — Assessment Platform

This project now includes:

- resilient Supabase client initialization with environment validation
- a registration step that captures full name, email, phone number, and education status
- normalized assessment tables for candidates, attempts, answers, and scores
- admin-ready candidate details with search and filtering
- retry-aware server-side evaluation and graceful fallback behavior

## Environment setup

Copy [.env.example](.env.example) to .env and populate the values for your Supabase project.

## Supabase

The SQL for the normalized schema is available in [supabase/migrations/20260731120000_assessment_platform_schema.sql](supabase/migrations/20260731120000_assessment_platform_schema.sql) and [supabase/sql/assessment-platform.sql](supabase/sql/assessment-platform.sql).

## Notes

- The service role key is only used on the server and should never be exposed to the client.
- The existing assessment and admin flows remain intact and were extended rather than replaced.

Fill in the blank.

The team _____ working on the project since Monday.

Correct Answer

has been

Question 10

Tea Coffee Problem

Correct Answer

0

====================================================

SECTION B

Scenario Based

Candidate selects ONE role.

Learning Content Developer

Explain how a bicycle works to a 10-year-old.

OR

Social Media Marketing

Write a promotional social media caption for an online course launch.

OR

Business Development

Respond to a client saying

"We're not interested right now."

Candidate writes a descriptive answer.

====================================================

AI EVALUATION

Automatically evaluate answers after submission.

For MCQs

Compare with correct answers.

For descriptive answers

Use OpenAI to score based on:

Communication

Clarity

Creativity

Role Understanding

Problem Solving

Professionalism

Generate

Marks

Percentage

Strengths

Weaknesses

Improvement Suggestions

Overall Recommendation

====================================================

PASS CRITERIA

80% and above

Green Badge

PASS

Eligible for Interview

Below 80%

Red Badge

NOT SHORTLISTED

====================================================

THANK YOU PAGE

Display

Thank You for Completing the Assessment

Thank you for taking the time to complete the Maple Learning Solutions Recruitment Assessment.

Your responses have been successfully submitted.

Our recruitment team will review your assessment and shortlisted candidates will be contacted regarding the next stage of the recruitment process.

We appreciate your interest in joining Maple Learning Solutions and wish you all the best.

====================================================

ADMIN LOGIN

Create a hidden admin portal.

URL

/admin

Simple Login

Email

info@maplelearningsolutions.com

Password

Maple@2026

After login redirect to Admin Dashboard.

====================================================

ADMIN DASHBOARD

Dashboard Cards

Total Candidates

Completed Assessments

Pending Assessments

Passed

Failed

Average Score

====================================================

CANDIDATE TABLE

Display

Candidate Name

Email

Role

Date

Score

Status

Recommendation

Action

View Assessment

====================================================

VIEW ASSESSMENT

Show

Candidate Name

Email

Overall Score

Percentage

PASS / FAIL

Strengths

Weaknesses

Recommendation

Display every question.

Display candidate answer.

Display correct answer.

Display AI comments.

Highlight correct answers in green.

Highlight incorrect answers in red.

Show descriptive answer evaluation separately.

====================================================

AI ANALYSIS

Generate an AI hiring summary.

Examples

Strong communication skills.

Excellent aptitude.

Good creativity.

Needs improvement in logical reasoning.

Recommended for Interview.

OR

Not Recommended.

====================================================

DATA STORAGE

Do not use Supabase.

Use a lightweight local database such as SQLite so that:

Candidate Details

Assessment Answers

AI Evaluation

Scores

Recommendations

Admin Dashboard

remain available even after restarting the application.

====================================================

SECURITY

Candidates should only access the assessment page.

Only the admin should access /admin.

Candidates should never see scores after submission.

Only admins can see:

Answers

Scores

AI Evaluation

Recommendations

====================================================

QUALITY

Production Ready

Modern UI

Responsive

Progress Bar

Loading Animations

Auto Save

Accessible

Premium SaaS Design

Fast Performance

Reusable Components

Clean Architecture

The final application should be deployment-ready and should not contain placeholder pages or dummy components.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://maple-recruit-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f6109fb7-3404-420b-bb8d-4bae02ea9a60).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
