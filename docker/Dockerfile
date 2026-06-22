FROM node:20-slim
WORKDIR /app

# Install dependencies as a separate layer so rebuilds after code changes stay fast.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source so the image is self-contained for CI/production builds.
# In development the relevant files are volume-mounted overtop (see docker-compose.dev.yml),
# so the container's node_modules are used while the host files stay editable.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
