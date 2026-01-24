# Build stage
# Explicitly use bookworm to match the runtime stage and ensure GLIBC compatibility
FROM golang:1.24-bookworm AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o main ./cmd/server/main.go

# Runtime stage
# Use debian:bookworm-slim which has matching GLIBC version to golang:*-bookworm
FROM debian:bookworm-slim

WORKDIR /app

# Install ca-certificates for HTTPS calls if needed
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port (matched from main.go)
EXPOSE 3000

# The app searches for ../data/ppt.db from CWD.
# If we run from /app, ../data is /data.
# So we expect the volume to be mounted at /data.
CMD ["./main"]
