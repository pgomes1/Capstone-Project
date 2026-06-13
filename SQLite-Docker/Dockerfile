# Opting to use Alpine, since it's vanilla with good support.
FROM alpine:latest

RUN apk add --no-cache sqlite

# Directory for the database file and scripts.
WORKDIR /app

# Copy the initialization script into the container.
COPY init.sql .
COPY entrypoint.sh .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Use the entrypoint script to initialize and keep container running
ENTRYPOINT ["/app/entrypoint.sh"]
