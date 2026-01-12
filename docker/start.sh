#!/bin/sh
# Start API server in background
cd /app/server && node dist/index.js &

# Start frontend server
serve -s /app/public -l 3000
