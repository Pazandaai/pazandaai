from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pazanda AI bot sozlamalari.

    Barcha maxfiy qiymatlar faqat environment variable orqali o'qiladi.
    Kod ichida hardcoded qiymat bo'lmasligi kerak.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # =========================
    # BOT
    # =========================
    BOT_TOKEN: SecretStr
    ADMIN_ID: int = Field(gt=0)
    MODE: Literal["polling", "webhook"] = "polling"

    PORT: int = Field(default=10000, ge=1, le=65535)
    HEALTH_PORT: int = Field(default=10001, ge=1, le=65535)

    WEBAPP_URL: str
    BOT_USERNAME: str = ""

    # =========================
    # WEBHOOK OPTIONAL
    # =========================
    WEBHOOK_HOST: str | None = None
    WEBHOOK_PATH: str = "/webhook"
    WEBHOOK_SECRET: SecretStr | None = None

    # =========================
    # SUPABASE
    # =========================
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: SecretStr

    # =========================
    # CLOUDFLARE R2
    # =========================
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: SecretStr
    R2_SECRET_ACCESS_KEY: SecretStr
    R2_BUCKET_NAME: str = "pazanda-media"
    R2_PUBLIC_BASE_URL: str = ""
    R2_UPLOAD_PREFIX: str = "uploads"

    # =========================
    # SCHEDULER
    # =========================
    TIMEZONE: str = "Asia/Tashkent"

    DAILY_RECIPE_HOUR: int = Field(default=9, ge=0, le=23)
    DAILY_RECIPE_MINUTE: int = Field(default=0, ge=0, le=59)

    DAILY_BACKUP_HOUR: int = Field(default=2, ge=0, le=23)
    DAILY_BACKUP_MINUTE: int = Field(default=30, ge=0, le=59)

    # =========================
    # MIDDLEWARE
    # =========================
    ENABLE_THROTTLING: bool = True
    THROTTLE_RATE: float = Field(default=0.5, gt=0)

    # =========================
    # PREMIUM PAYMENT
    # =========================
    PREMIUM_PRICE_UZS: int = Field(default=25000, ge=0)
    PAYMENT_CARD_NUMBER: str = ""
    PAYMENT_CARD_HOLDER: str = ""

    # =========================
    # VALIDATORS
    # =========================

    @field_validator("WEBAPP_URL", "SUPABASE_URL")
    @classmethod
    def validate_required_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")

        if not value:
            raise ValueError("URL bo'sh bo'lishi mumkin emas.")

        if not value.startswith(("http://", "https://")):
            raise ValueError("URL http:// yoki https:// bilan boshlanishi kerak.")

        return value

    @field_validator("R2_PUBLIC_BASE_URL")
    @classmethod
    def validate_optional_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")

        if value and not value.startswith(("http://", "https://")):
            raise ValueError("R2_PUBLIC_BASE_URL http:// yoki https:// bilan boshlanishi kerak.")

        return value

    @field_validator("R2_UPLOAD_PREFIX")
    @classmethod
    def normalize_upload_prefix(cls, value: str) -> str:
        return value.strip("/")

    @model_validator(mode="after")
    def validate_webhook_mode(self):
        if self.MODE == "webhook":
            if not self.WEBHOOK_HOST:
                raise ValueError("MODE=webhook bo'lsa, WEBHOOK_HOST majburiy.")

            if not self.WEBHOOK_SECRET:
                raise ValueError("MODE=webhook bo'lsa, WEBHOOK_SECRET majburiy.")

        return self

    # =========================
    # SAFE ACCESSORS
    # =========================

    @property
    def token(self) -> str:
        return self.BOT_TOKEN.get_secret_value()

    @property
    def supabase_service_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()

    @property
    def r2_access_key(self) -> str:
        return self.R2_ACCESS_KEY_ID.get_secret_value()

    @property
    def r2_secret_key(self) -> str:
        return self.R2_SECRET_ACCESS_KEY.get_secret_value()

    @property
    def r2_endpoint(self) -> str:
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    @property
    def webhook_url(self) -> str | None:
        if self.MODE != "webhook" or not self.WEBHOOK_HOST:
            return None

        host = self.WEBHOOK_HOST.rstrip("/")
        path = self.WEBHOOK_PATH if self.WEBHOOK_PATH.startswith("/") else f"/{self.WEBHOOK_PATH}"

        return f"{host}{path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
