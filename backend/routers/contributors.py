"""
Layer 4 infrastructure: contributor catalog + API key auth dependency.

- Staff routes under /api/contributors manage contributor records and issue keys.
- Public routes elsewhere (/api/contribute/*) use `require_contributor` to
  look up the key from the X-API-Key header and attach the Contributor to
  the request.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_role
from database import get_db
from models import Contributor, User
from schemas import (
    ContributorCreate,
    ContributorResponse,
    ContributorUpdate,
    ContributorWithKey,
)

_any_staff = get_current_user
_admin_only = require_role("admin")

router = APIRouter(prefix="/api/contributors", tags=["Contributors"])


def _new_key() -> str:
    return f"rg_{secrets.token_urlsafe(32)}"


def _hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


def require_contributor(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> Contributor:
    """
    Dependency for public contribute endpoints. Looks up the API key,
    rejects inactive or unknown keys, bumps last_used_at.
    """
    key_hash = _hash_key(x_api_key)
    c = db.query(Contributor).filter(Contributor.api_key_hash == key_hash).first()
    if not c:
        raise HTTPException(401, "Invalid API key")
    if not c.active:
        raise HTTPException(403, "This contributor key has been revoked")
    c.last_used_at = datetime.utcnow()
    db.commit()
    return c


@router.get("", response_model=List[ContributorResponse])
def list_contributors(db: Session = Depends(get_db), _: User = Depends(_admin_only)):
    return db.query(Contributor).order_by(Contributor.id.desc()).all()


@router.post("", response_model=ContributorWithKey, status_code=201)
def create_contributor(payload: ContributorCreate, db: Session = Depends(get_db), _: User = Depends(_admin_only)):
    """Create a new contributor. The API key is returned ONCE here only."""
    plaintext = _new_key()
    c = Contributor(
        name=payload.name,
        contributor_type=payload.contributor_type,
        trust_level=payload.trust_level,
        contact_email=payload.contact_email,
        notes=payload.notes,
        api_key_hash=_hash_key(plaintext),
        api_key_prefix=plaintext[:8],
        active=True,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    # Return the plaintext api_key exactly once
    return ContributorWithKey(
        id=c.id,
        name=c.name,
        contributor_type=c.contributor_type,
        trust_level=c.trust_level,
        contact_email=c.contact_email,
        notes=c.notes,
        active=c.active,
        created_at=c.created_at,
        last_used_at=c.last_used_at,
        api_key_prefix=c.api_key_prefix,
        api_key=plaintext,
    )


@router.put("/{cid}", response_model=ContributorResponse)
def update_contributor(cid: int, payload: ContributorUpdate, db: Session = Depends(get_db), _: User = Depends(_admin_only)):
    c = db.query(Contributor).filter(Contributor.id == cid).first()
    if not c:
        raise HTTPException(404, "Contributor not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.post("/{cid}/rotate-key", response_model=ContributorWithKey)
def rotate_key(cid: int, db: Session = Depends(get_db), _: User = Depends(_admin_only)):
    """Issue a fresh API key, invalidating the old one."""
    c = db.query(Contributor).filter(Contributor.id == cid).first()
    if not c:
        raise HTTPException(404, "Contributor not found")
    plaintext = _new_key()
    c.api_key_hash = _hash_key(plaintext)
    c.api_key_prefix = plaintext[:8]
    db.commit()
    db.refresh(c)
    return ContributorWithKey(
        id=c.id,
        name=c.name,
        contributor_type=c.contributor_type,
        trust_level=c.trust_level,
        contact_email=c.contact_email,
        notes=c.notes,
        active=c.active,
        created_at=c.created_at,
        last_used_at=c.last_used_at,
        api_key_prefix=c.api_key_prefix,
        api_key=plaintext,
    )


@router.delete("/{cid}", status_code=204)
def delete_contributor(cid: int, db: Session = Depends(get_db), _: User = Depends(_admin_only)):
    c = db.query(Contributor).filter(Contributor.id == cid).first()
    if not c:
        raise HTTPException(404, "Contributor not found")
    db.delete(c)
    db.commit()
