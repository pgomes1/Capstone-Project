# Opting to use Alpine, since it's vanilla with good support.
FROM alpine:latest

RUN apk add --no-cache sqlite

# Directory for the database file and scripts.
WORKDIR /app

# Copy the initialization script into the container.
COPY init.sql .

RUN sqlite3 /app/fit4life.db < /app/init.sql

CMD ["sqlite3", "/app/fit4life.db"]
