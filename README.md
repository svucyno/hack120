# PrecisionHire AI

Advanced AI Recruitment Specialist and NLP Engine for deep semantic resume-JD matching.

PrecisionHire AI is a powerful, production-grade recruitment tool designed to streamline the hiring process by providing deep, AI-driven insights into candidate compatibility. It leverages the latest in Large Language Models (LLMs) to analyze resumes against job descriptions, rank candidates, and generate comprehensive reports.

## 🚀 Features

- **Deep Semantic Matching:** Analyzes resumes beyond simple keyword matching to understand the context and depth of a candidate's experience.
- **Multi-Candidate Leaderboard:** Upload multiple resumes at once and see how they rank against a specific job description.
- **Blind Mode Analysis:** Mitigates unconscious bias by anonymizing candidate profiles during the initial analysis phase.
- **Comprehensive PDF Reports:** Generate and export detailed analysis reports for individual candidates or full leaderboards.
- **Multi-Format Support:** Seamlessly handles PDF, DOCX, and image-based resumes (with built-in OCR).
- **Interactive Dashboards:** Visualizes compatibility scores, skill gaps, and requirement matching using interactive charts.
- **Real-Time Processing:** Optimized for speed with parallel processing and low-latency AI interactions.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, Framer Motion
- **AI Engine:** Google Gemini (via `@google/genai`)
- **Data Visualization:** Recharts
- **PDF Generation:** html2canvas, jsPDF
- **Document Processing:** PDF.js, Mammoth (for DOCX), Tesseract-style OCR
- **Backend (Optional/Full-Stack):** Express.js (for server-side operations)
- **Database/Auth:** Firebase (Firestore & Authentication)

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd precisionhire-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: For client-side only usage, ensure the key is handled securely according to your platform's guidelines.)*

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 📖 Usage

1. **Upload Resumes:** Drag and drop or select one or more resume files (PDF, DOCX, or Image).
2. **Paste Job Description:** Enter the job description you want to match against.
3. **Run Analysis:** Click "Run Precision Analysis" to start the AI-powered matching process.
4. **Review Results:**
   - For single resumes, view the detailed compatibility report.
   - For multiple resumes, check the leaderboard to see the top-ranked candidates.
5. **Export:** Download the results as a PDF for sharing with your team.

## 🛡️ License

This project is licensed under the MIT License.

---

*Built with ❤️ by the PrecisionHire AI Team.*
