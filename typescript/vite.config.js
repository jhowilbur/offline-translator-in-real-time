import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// HTTPS Configuration
// uncomment the line below to enable HTTPS
const USE_HTTPS = true;

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0', // Bind to all network interfaces
        
        // HTTPS Configuration (conditional)
        // To enable HTTPS: set USE_HTTPS=true or uncomment the USE_HTTPS line above
        // Make sure you have generated certificates first (see README.md)
        ...(USE_HTTPS && {
            https: {
                key: './localhost+3-key.pem',
                cert: './localhost+3.pem'
            }
        }),
        
        allowedHosts: true, // Allows external connections like ngrok
        proxy: {
            // Proxy /api requests to the backend server
            '/api': {
                target: 'http://0.0.0.0:7860', // Replace with your backend URL
                changeOrigin: true,
            },
        },
    },
});
