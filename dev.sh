#!/usr/bin/env bash
# Runs the Conduit API and web app together. Ctrl-C stops both.
set -e
(cd server && npm run dev) &
SERVER_PID=$!
(cd web && npm run dev) &
WEB_PID=$!
trap "kill $SERVER_PID $WEB_PID 2>/dev/null" EXIT
wait
