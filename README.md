<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Examito - AI-Powered Learning Platform

Examito is a comprehensive AI-powered learning platform that provides personalized education experiences with intelligent tutoring, adaptive testing, and progress tracking.

## Features

✅ **AI Tutor**: Interactive chat with file upload support (images, PDFs)  
✅ **Test Generator**: Create custom tests on any topic  
✅ **Daily Questions**: AI-generated daily practice questions  
✅ **Progress Reports**: AI-powered progress analysis  
✅ **Timeline Management**: Track your learning journey  
✅ **Responsive Design**: Works on desktop and mobile  

## Run Locally

**Prerequisites:** Node.js (v16 or higher)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tanmay2813/Examito.git
   cd Examito
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Update `.env` with your API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:3000` (or the port shown in the terminal)
   - Enter your name and academic board to start learning!

## Build for Production

```bash
npm run build
npm run preview
```

## Technologies Used

- **Frontend**: React 19, TypeScript, Vite
- **AI Integration**: Google Generative AI (Gemini)
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **File Processing**: PDF.js for PDF analysis
- **Notifications**: React Hot Toast

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
