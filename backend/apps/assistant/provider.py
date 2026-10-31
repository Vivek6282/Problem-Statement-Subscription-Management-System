"""
Provider-neutral AI adapter. Optional: nothing else in the app depends on it.

Never log the API key, the prompt or the output.
"""
from dataclasses import dataclass

from django.conf import settings

from .models import AssistantSettings


class AIDisabled(Exception):
    pass


class AIUnavailable(Exception):
    pass


class AIInvalidOutput(Exception):
    pass


@dataclass(frozen=True)
class AIResult:
    text: str
    provider: str
    model: str


def data_block(label, text):
    """User-supplied text goes only inside this delimited block; system prompts say it is data."""
    return f'<data name="{label}">\n{text}\n</data>'


class FakeProvider:
    """Deterministic provider for tests and local demos. Can be told to fail."""
    name = 'fake'
    model = 'fake-model'

    def __init__(self, text='A concise, neutral description of this product.', fail=None):
        self.text = text
        self.fail = fail  # None, 'unavailable' or 'timeout'
        self.calls = []

    def generate(self, system, user):
        self.calls.append({'system': system, 'user': user})
        if self.fail:
            raise AIUnavailable(f'fake provider failure: {self.fail}')
        return AIResult(text=self.text, provider=self.name, model=self.model)


class AnthropicProvider:
    name = 'anthropic'

    def __init__(self):
        import anthropic
        self._anthropic = anthropic
        self.model = settings.AI_MODEL
        self.client = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.AI_TIMEOUT_SECONDS,
            max_retries=1,
        )

    def generate(self, system, user):
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
                system=system,
                messages=[{'role': 'user', 'content': user}],
            )
        except self._anthropic.AnthropicError as exc:  # covers API, connection and timeout errors
            raise AIUnavailable(type(exc).__name__) from None
        text = ''.join(b.text for b in response.content if getattr(b, 'type', '') == 'text')
        return AIResult(text=text, provider=self.name, model=self.model)


def configuration_problem():
    """Return None when the configured provider can run, else a short reason."""
    provider = settings.AI_PROVIDER
    if provider == 'fake':
        return None
    if provider == 'anthropic':
        if not settings.ANTHROPIC_API_KEY or not settings.AI_MODEL:
            return 'not_configured'
        return None
    return 'not_configured'


def availability():
    """(available, reason) where reason is 'disabled', 'not_configured' or None."""
    if not settings.AI_ENABLED or not AssistantSettings.load().ai_enabled:
        return False, 'disabled'
    problem = configuration_problem()
    if problem:
        return False, problem
    return True, None


def get_provider():
    if settings.AI_PROVIDER == 'anthropic':
        return AnthropicProvider()
    return FakeProvider()


def generate(system, user):
    available, _reason = availability()
    if not available:
        raise AIDisabled('AI assistant is not available')
    if len(user) > settings.AI_MAX_INPUT_CHARS:
        raise AIInvalidOutput('Input is too long')  # rejected before any network call
    return get_provider().generate(system, user)
