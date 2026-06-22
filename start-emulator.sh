#!/bin/bash
# Start Firebase Emulator Suite
# Requires Java 21+ to be installed

# Set up Java environment
export JAVA_HOME=$HOME/.local/java/amazon-corretto-21.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# Verify java is available
java -version || {
  echo "Error: Java 21 not found at $JAVA_HOME/bin/java"
  echo "Install it with:"
  echo "  mkdir -p ~/.local/java && cd ~/.local/java"
  echo "  curl -L -o corretto21.tar.gz https://corretto.aws/downloads/latest/amazon-corretto-21-aarch64-macos-jdk.tar.gz"
  echo "  tar -xzf corretto21.tar.gz"
  exit 1
}

# Navigate to project directory
cd "$(dirname "$0")" || exit 1

echo "Starting Firebase emulator suite..."
echo "Firestore:  http://localhost:8080"
echo "Functions:  http://localhost:5001"
echo "Hosting:    http://localhost:5002"
echo "Emulator UI: http://localhost:4001"
echo ""

# Start emulators (including Storage for file uploads)
./node_modules/.bin/firebase emulators:start --only firestore,functions,hosting,storage "$@"
