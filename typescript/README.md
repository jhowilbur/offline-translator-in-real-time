# Typescript Implementation

Basic implementation.

## Setup

1. Run the python server.

```bash
cd ..
python server.py
```

2. Install dependencies:

```bash
npm install
```

3. Run the client app:

```bash
npm run dev
```

5. Visit http://localhost:5173 in your browser.

-----

## Docker (Production)

```bash
# Build
docker build -t wilbur-translator .

# Run
docker run -p 3000:80 wilbur-translator
```

Access: http://localhost:3000

Backend proxy: nginx routes `/api` to `host.docker.internal:7860`

-----

## HTTPS Setup (Optional)

For WebRTC applications and secure contexts, you may want to run the development server with HTTPS. This is especially useful when:
- Testing on other devices in your network
- Using WebRTC features that require secure contexts
- Testing features that require HTTPS

### Prerequisites - worked on Windows 11

1. **Install mkcert** (one-time setup):
   ```bash
   winget install FiloSottile.mkcert
   ```

2. **Install local Certificate Authority** (one-time setup):
   ```bash
   mkcert -install
   ```

### Generate SSL Certificates

Navigate to your project directory and generate certificates:

```bash
cd path/to/your/project
mkcert localhost 192.168.2.28 127.0.0.1 ::1
```

> **Note**: Replace `192.168.2.28` with your actual local IP address. You can find it by running `ipconfig` on Windows.

This creates two files:
- `localhost+3-key.pem` (private key)
- `localhost+3.pem` (certificate)

### Update Vite Configuration

The `vite.config.js` is already configured to use HTTPS with the generated certificates. If you need to modify it, ensure it looks like this:

```javascript
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0', // Bind to all network interfaces
        https: {
            key: './localhost+3-key.pem',
            cert: './localhost+3.pem'
        },
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://0.0.0.0:7860',
                changeOrigin: true,
            },
        },
    },
});
```


### Running with HTTPS

You have two simple options:

#### Option 1: Enable HTTPS (Edit vite.config.js)
Change this line in `vite.config.js`:
```javascript
const USE_HTTPS = true;  // Change false to true
```

#### Option 2: Default HTTP (No changes needed)
Keep the default setting:
```javascript
const USE_HTTPS = false;  // Default setting
```

Then start the development server:
```bash
npm run dev
```

### Access Your Application

**With HTTPS enabled:**
- **Local**: `https://localhost:5173/`
- **Network**: `https://YOUR_IP_ADDRESS:5173/` (e.g., `https://192.168.2.28:5173/`)

**With HTTP (default):**
- **Local**: `http://localhost:5173/`
- **Network**: `http://YOUR_IP_ADDRESS:5173/` (e.g., `http://192.168.2.28:5173/`)

### Benefits

- ✅ No browser security warnings
- ✅ WebRTC APIs work properly
- ✅ Access from other devices on your network
- ✅ All HTTPS-required web APIs function correctly