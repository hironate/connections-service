# Use Node.js version 21.7.0 as the base image
FROM node:21.7.0

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Copy the startup script
COPY entrypoint.sh .

# Make the startup script executable
RUN chmod +x entrypoint.sh

# Expose the port on which the app will run
EXPOSE 3004

ENTRYPOINT ["./entrypoint.sh"]

# Start the application
# CMD ["npm", "start"]