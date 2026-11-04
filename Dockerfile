# syntax=docker/dockerfile:1
# Thin runtime image. CI builds vscode-reh-web on the host and copies it into ./server.

FROM node:24-bookworm-slim

WORKDIR /app

COPY server/ /app/

RUN chmod +x /app/bin/koshakb-server 2>/dev/null || true \
  && chmod +x /app/node 2>/dev/null || true

EXPOSE 8000

ENV HOME=/tmp

CMD ["./bin/koshakb-server", "--host", "0.0.0.0", "--port", "8000", "--without-connection-token"]
