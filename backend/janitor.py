from datetime import datetime, timedelta

from models import JobRun


def sweep_stale_jobs(db, stale_after_seconds: int = 600) -> int:
    cutoff = datetime.utcnow() - timedelta(seconds=stale_after_seconds)
    stale = (
        db.query(JobRun)
        .filter(JobRun.status.in_(("queued", "running")))
        .filter(JobRun.created_at < cutoff)
        .all()
    )
    now = datetime.utcnow()
    for job in stale:
        job.status = "failed"
        job.error = "stuck — timed out by janitor"
        job.finished_at = now
    if stale:
        db.commit()
    return len(stale)
