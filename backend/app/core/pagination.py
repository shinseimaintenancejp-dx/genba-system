"""
Genba Management System — Shared Pagination Schema & Utilities.

Provides a generic PaginatedResponse type used across all list endpoints.
See BE§5.2 for the pagination schema specification.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field, computed_field


T = TypeVar("T")

# Pagination limits (prevent abuse)
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 1000
MIN_PAGE = 1


# =============================================================================
# Pagination Schemas
# =============================================================================
class PaginationMeta(BaseModel):
    """Metadata about the current page in a paginated response."""

    page: int = Field(description="Current page number (1-indexed)")
    limit: int = Field(description="Number of items per page")
    total_items: int = Field(description="Total number of items matching the query")
    total_pages: int = Field(description="Total number of pages")

    @computed_field
    @property
    def has_next(self) -> bool:
        """Whether there is a next page available."""
        return self.page < self.total_pages

    @computed_field
    @property
    def has_previous(self) -> bool:
        """Whether there is a previous page available."""
        return self.page > 1


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response wrapper.

    All list endpoints MUST return this structure (INT§1.2):
    {
        "data": [...items],
        "meta": {
            "page": 1,
            "limit": 20,
            "total_items": 150,
            "total_pages": 8,
            "has_next": true,
            "has_previous": false
        }
    }
    """

    data: list[T]
    meta: PaginationMeta


# =============================================================================
# Pagination Parameters
# Used as query parameters in list endpoints via FastAPI Depends()
# =============================================================================
class PaginationParams(BaseModel):
    """Query parameters for pagination."""

    page: int = Field(default=1, ge=1, description="Page number (starts at 1)")
    limit: int = Field(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
        description=f"Items per page (max {MAX_PAGE_SIZE})",
    )

    @property
    def offset(self) -> int:
        """Calculate the SQL OFFSET value."""
        return (self.page - 1) * self.limit


# =============================================================================
# Pagination Utility
# =============================================================================
def build_paginated_response(
    items: list[T],
    total_items: int,
    params: PaginationParams,
) -> PaginatedResponse[T]:
    """
    Build a PaginatedResponse from query results.

    Args:
        items: The list of items for the current page
        total_items: Total count of all matching items
        params: The pagination parameters from the request

    Returns:
        A properly structured PaginatedResponse
    """
    total_pages = max(1, -(-total_items // params.limit))  # Ceiling division

    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            page=params.page,
            limit=params.limit,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )
