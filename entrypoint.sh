#!/bin/sh
echo "Starting entrypoint script"
echo "Running migrations..."
npm run migrate
echo "Migrations completed"
npm run start
