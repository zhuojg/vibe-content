#!/bin/bash

ln -s "$CONDUCTOR_ROOT_PATH/.env" .env

set -e

if [ -z "$CONDUCTOR_ROOT_PATH" ]; then
  echo "Error: CONDUCTOR_ROOT_PATH is not set"
  exit 1
fi
