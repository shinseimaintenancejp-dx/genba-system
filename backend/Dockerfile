# =============================================================================
# Genba Management System — Backend Dockerfile (Multi-Stage)
# Follows TEST§3.1 multi-stage pattern
# =============================================================================

# Stage 1: Base — shared Python runtime
FROM python:3.11-slim AS base

WORKDIR /app

# Prevent Python from writing .pyc files and enable stdout buffering
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies needed by psycopg2/asyncpg and cryptography libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# -------------------------------------------------------------------
# Stage 2: Dependencies — install Python packages
# -------------------------------------------------------------------
FROM base AS deps

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# -------------------------------------------------------------------
# Stage 3: Development — hot reload with uvicorn --reload
# -------------------------------------------------------------------
FROM deps AS dev

# Copy application code
COPY . .

EXPOSE 8000

# Run with hot reload for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"]

# -------------------------------------------------------------------
# Stage 4: Production — hardened, non-root user, 4 workers
# -------------------------------------------------------------------
FROM deps AS prod

COPY . .

# Create non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Set proper permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
