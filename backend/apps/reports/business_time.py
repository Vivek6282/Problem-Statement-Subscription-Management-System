"""Business-calendar helpers: "today" and month boundaries in settings.BUSINESS_TIMEZONE."""
import calendar
import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone


def business_tz():
    return ZoneInfo(settings.BUSINESS_TIMEZONE)


def business_today():
    """Current calendar date in the business timezone."""
    return timezone.now().astimezone(business_tz()).date()


def business_month_start(d=None):
    d = d or business_today()
    return d.replace(day=1)


def business_month_end(d=None):
    d = d or business_today()
    return d.replace(day=calendar.monthrange(d.year, d.month)[1])
