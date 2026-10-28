# ADR 003: Storage Abstraction with Expiring Signed URLs for Sensitive Documents

## Status
Accepted

## Context
Schools store both public assets (school logos, marketing pictures) and highly confidential records (student medical notes, disciplinary hearing documents, official transcripts). Storing confidential documents in public CDN buckets or public Cloudinary links poses serious privacy and compliance risks.

## Decision
1. Introduce a generic `StorageService` interface decoupling domain logic from physical storage providers.
2. Provide a local disk implementation for self-hosted deployments and an S3-compatible adapter for cloud deployments.
3. Access to private documents is strictly mediated through short-lived (5-minute) HMAC-signed download URLs.
4. Uploads require server-side MIME type validation and file size restrictions.

## Consequences
- **Positive**: Complete privacy for sensitive student records; flexibility to swap between local storage, MinIO, AWS S3, or Cloudinary without touching business code.
- **Negative**: Downloads must go through the signing endpoint before files can be viewed or downloaded.
