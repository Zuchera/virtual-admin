#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed on this Mac. It is free and takes a minute."
  echo "Opening the download page. Install the LTS version, then open this file again."
  open https://nodejs.org/en/download
  read -p "Press Enter to close"
  exit 1
fi
node server.js
