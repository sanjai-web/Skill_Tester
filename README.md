# SkillTester (formerly AI Interview Prep Platform)

SkillTester is a comprehensive, AI-powered mock interview application designed to help job seekers practice for technical and behavioral interviews. Instead of relying on static question banks, the platform uses advanced AI to conduct dynamic, real-time interviews. It simulates a natural interview environment by adapting to the candidate's uploaded resume, supporting voice-based conversational Q&A, and providing an interactive coding environment for technical rounds.

## ✨ Key Features

- **Context-Aware AI Formatting (Resume Parsing):** Upload your resume and the AI will generate hyper-personalized questions based on your actual experience and listed skills.
- **Voice-Enabled Interactions:** Practice answering questions verbally using your microphone, just like in a real interview setting. The AI interviewer will also speak back to you!
- **Live Code Execution Environment:** A fully integrated code editor (powered by Monaco Editor) supports multiple languages (Python, Java, C, C++). The backend compiles and runs your code in real-time.
- **Ultra-Fast AI Engine:** Powered by Groq's LPUs, ensuring the AI interviewer answers almost instantaneously and the conversation flows naturally without awkward pauses.
- **Authentication & User Dashboard:** Secure user authentication with a dedicated dashboard to track past mock interviews, review feedback, and manage your profile.

## 🛠️ Technical Stack

### Frontend
- **Framework:** React.js (Vite)
- **Routing:** React Router DOM
- **Code Editor:** `@monaco-editor/react`
- **Voice Capabilities:** `react-speech-recognition`, Web Speech API
- **Icons:** `lucide-react`
- **Authentication:** Firebase Auth

### Backend
- **Framework:** Node.js, Express.js
- **AI Integration:** `groq-sdk`
- **Database / Storage:** PostgreSQL (via `@supabase/supabase-js`)
- **File Parsing:** `multer`, `pdf-parse` (for resume data extraction)
- **Code Execution:** Wandbox API integration
- **Payments:** `razorpay`

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v18 or higher recommended)
- API Keys for:
  - Groq
  - Firebase
  - Supabase
  - Razorpay

### 1. Clone the Repository
```bash
git clone https://github.com/sanjai-web/AIinterview.git
cd AIinterview
```

### 2. Setup the Backend
Navigate to the backend directory, install the dependencies, and configure your environment variables.
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory (you can use `.env.example` as a reference) and add your respective API keys:
```env
PORT=5000
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
# ... add other required keys
```
Start the backend server:
```bash
npm run dev
# OR
npm start
```

### 3. Setup the Frontend
Open a new terminal window, navigate to the frontend directory, install dependencies, and run the development server.
```bash
cd Frontend
npm install
```
Create a `.env` file in the `Frontend` directory (use `.env.example` as a reference):
```env
VITE_API_URL=http://localhost:5000/api
# ... add your Firebase config keys
```
Start the frontend application:
```bash
npm run dev
```

### 4. Open the App
Once both servers are running, open your browser and navigate to `http://localhost:5173` (or the port specified by Vite) to explore the application!

## 📝 License

This project is open-source and available under the ISC License.
