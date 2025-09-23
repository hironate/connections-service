# Use Node.js version 21.7.0 as the base image
FROM node:21.7.0

# Set the working directory in the container
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Install sequelize-cli globally
RUN npm install -g sequelize-cli
RUN npm install -g nodemon

# Copy source code
COPY . .

EXPOSE 3004
