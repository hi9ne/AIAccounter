"""
Pydantic schemas for Reports
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ReportType(str, Enum):
    """Тип отчёта"""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    PERIOD = "period"


class ReportRequest(BaseModel):
    """Запрос на генерацию отчёта за период"""
    start_date: date = Field(..., description="Начальная дата")
    end_date: date = Field(..., description="Конечная дата")
    include_transactions: bool = Field(True, description="Включить список всех транзакций")


class ReportResponse(BaseModel):
    """Ответ с информацией об отчёте"""
    report_type: str
    start_date: date
    end_date: date
    pdf_url: str = Field(..., description="URL для скачивания PDF")
    generated_at: datetime


class ReportHistoryItem(BaseModel):
    """Элемент истории отчётов"""
    report_id: int
    report_type: str
    start_date: date
    end_date: date
    pdf_url: str
    generated_at: datetime
    generated_by: int
