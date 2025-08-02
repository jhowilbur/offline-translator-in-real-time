# Wilbur AI

Wilbur AI Offline Interpreter. 
- Lightweight, real-time offline translation tool for on-device use using Gemma 3n.

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

### 2️⃣ Connect Using the Client App

Open your browser and visit:
```
http://localhost:7860
```

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