# Docker Build & Push Workflow Rule

Whenever bumping or releasing a new version, or when requested to push updates:
1. Always build the Docker image locally:
   ```bash
   docker build -t ghcr.io/uri-travoski/quicknotes:latest -t ghcr.io/uri-travoski/quicknotes:<version> .
   ```
   (or `npm run docker:build`)
2. Push both the `<version>` and `latest` tags to GitHub Container Registry:
   ```bash
   docker push ghcr.io/uri-travoski/quicknotes:<version> && docker push ghcr.io/uri-travoski/quicknotes:latest
   ```
   (or `npm run docker:push`)
3. Ensure git commits and tags are pushed to `origin main`.
