# Railway Deployment Instructions

## Critical Railway Configuration

### 1. Environment Variables
Set these in Railway Dashboard → Environment Variables:

```
GOOGLE_APPLICATION_CREDENTIALS=/app/google-credentials.json
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"rehacentrum-469314",...}
```

### 2. Build Command (MOST IMPORTANT)
In Railway Dashboard → Settings → Build Command:

```bash
echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/google-credentials.json && npm run build
```

Or if you don't have a build script:

```bash
echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/google-credentials.json
```

### 3. Why This Works
- Railway can't handle JSON objects in environment variables reliably
- The build command writes the JSON to a file during deployment
- The app reads from the file path (most reliable method)
- Server binds to 0.0.0.0:PORT (required for Railway)

### 4. Environment Variable Format
The `GOOGLE_APPLICATION_CREDENTIALS_JSON` must be:
- Single line JSON (no line breaks)
- No outer quotes when pasting into Railway
- Keep `\n` sequences inside private_key unchanged

### 5. Deployment Flow
1. Railway runs build command → writes JSON to file
2. Sets GOOGLE_APPLICATION_CREDENTIALS to file path
3. App loads credentials from file (most reliable)
4. Falls back to environment variables if file missing

## Troubleshooting
- "Application failed to respond" = server not binding to 0.0.0.0
- Credential errors = JSON malformed or build command not set
- Check Railway deployment logs for specific errors