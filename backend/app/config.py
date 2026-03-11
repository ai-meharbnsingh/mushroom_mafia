from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://mushroom:mushroom_dev@localhost:5432/mushroom_farm"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3801"

    # Environment: "development" or "production"
    ENVIRONMENT: str = "development"

    # MQTT / EMQX
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_USERNAME: str = "backend_service"
    MQTT_PASSWORD: str = "backend_mqtt_secret"
    MQTT_USE_TLS: bool = False
    MQTT_CA_CERTS: str = "../certs/ca.crt"
    EMQX_API_URL: str = "http://localhost:18083"

    # API base URL (used in device provisioning responses so ESP32 knows where to call)
    API_BASE_URL: str = "http://localhost:3800/api/v1"

    # Device password encryption (Fernet key)
    DEVICE_ENCRYPTION_KEY: str = "change-me-32-byte-base64-key-pad="

    # Login lockout settings
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        """Set Secure flag on cookies. True in production (HTTPS), False in dev (HTTP)."""
        return self.is_production

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
