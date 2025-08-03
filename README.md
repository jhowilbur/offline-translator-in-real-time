# Wilbur AI

Wilbur AI Offline Interpreter. 
- Lightweight, real-time offline translation tool for on-device use using Gemma 3n.

![Image](https://github.com/user-attachments/assets/3feb0fb4-5ee1-4ba2-84a1-fa199acbbdcd)

## The impact

**Imagine you're traveling in a remote village, trying to communicate a medical emergency. Your phone has no signal. Language becomes a barrier between help and harm.**

This scenario plays out millions of times daily — in emergency rooms where doctors desperately try to understand a patient's symptoms, during natural disasters when cellular towers fail and families are separated by language barriers, in immigration offices where people's futures hang on miscommunication, in nursing homes where elderly residents can't express their pain to caregivers, and yes, even in classrooms where students sit silently, unable to participate because translation tools demand internet they don't have.

**Here's the harsh reality: real-time offline translation doesn't exist anywhere in the world.**

---

**Wilbur AI changes everything.**

This isn't just another translation app — it's the world's first real-time offline translator. A breakthrough that puts the power of real-time, multimodal translation directly in your hands, completely offline. What was previously impossible is now reality. Built on Google's revolutionary **Gemma 3n**, the first open model designed for mobile-first AI, Wilbur AI runs privately and efficiently on your available device.

No internet required. No data sent to remote servers. No barriers between you and clear communication.

This is technology that serves **accessibility** (breaking down language barriers for individuals with disabilities), **sustainability** (reducing reliance on energy-intensive cloud services), **crisis response** (maintaining communication when infrastructure fails), and **privacy-first AI** (keeping your conversations completely local).

**Wilbur AI isn't just about convenience — it's about restoring human connection when it matters most.** Whether you're a healthcare worker treating diverse patients, an educator reaching multilingual students, a traveler exploring off-the-grid destinations. This offline app empowers you to communicate freely, anywhere, anytime completely local.

**This is translation liberated from the limitations of the connected world. This is AI that works for you.**


---

## The APP

**Simple. Powerful. Completely Offline.**

Wilbur AI features an elegant, user-friendly interface designed for instant communication across language barriers. The app provides:

<img width="566" height="893" alt="Image" src="https://github.com/user-attachments/assets/277dd4e0-ecc9-417b-b7b1-49c79eb85a16" />

- **Dual Language Selection**: Choose your spoken language and target translation language from 10+ supported languages including English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, and Russian

<img width="625" height="550" alt="Image" src="https://github.com/user-attachments/assets/54ef5fea-cd78-481c-9d13-d721653cf885" />

- **One-Touch Voice Translation**: Simply select your languages, hit connect, and start speaking using the integrated microphone

<img width="599" height="546" alt="Image" src="https://github.com/user-attachments/assets/6c92b180-3834-40db-9b50-97492fde8070" />

- **Real-Time Conversation View**: See your translations appear instantly in a clean conversation interface

<img width="539" height="883" alt="Image" src="https://github.com/user-attachments/assets/39ad6541-f8d2-4a22-ab0f-5dbc637715ed" />

- **Flexible Audio Setup**: Configure your preferred microphone and audio codec for optimal performance
- **Connection Status Monitoring**: Clear visual indicators show when you're connected and ready to translate
- **Privacy-First Design**: Notice the "Disconnected" status indicator — because everything happens locally on your device

**No complex setup. No internet dependency. Just pure, instant translation at your fingertips.**

---

## 🚀 Quick Start

### 1️⃣ Start the Wilbur AI Offline Interpreter

#### 🔧 Set Up the Environment
1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

#### ▶️ Run the Server
```bash
python server.py
```

### 2️⃣ Set Up and Run the Frontend Client

#### 🔧 Navigate to Frontend Directory
```bash
cd typescript
```

#### 📦 Install Frontend Dependencies
```bash
npm install
```

#### ▶️ Run the Frontend Client
```bash
npm run dev
```

#### 🌐 Open in Browser
Visit the frontend application:
```
http://localhost:5173
```

> **Note**: The frontend client will communicate with the Python server running on `http://localhost:7860`

## 📌 Requirements

- Google Gemma AI
- Ollama running on the address 'http://localhost:11434/v1' with the Gemma3n model 'gemma3n:e2b'
- Modern web browser with WebRTC support to open localhost
- Python **3.10+**
- Node.js **16+** (for JavaScript components)
- **NO INTERNET**

---

### 💡 Notes
- Ensure all dependencies are installed before running.