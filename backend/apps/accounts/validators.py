import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexPasswordValidator:
    """
    Validate that password is at least 9 characters long and contains:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one special character
    """
    def __init__(self, min_length=9):
        self.min_length = min_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                _(f"Password must be at least {self.min_length} characters long."),
                code='password_too_short',
            )
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter (A-Z)."),
                code='password_no_upper',
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter (a-z)."),
                code='password_no_lower',
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;/\']', password):
            raise ValidationError(
                _("Password must contain at least one special character (!@#$%^&* etc.)."),
                code='password_no_special',
            )

    def get_help_text(self):
        return _(
            f"Your password must contain at least {self.min_length} characters, "
            "including uppercase, lowercase, and special characters."
        )

