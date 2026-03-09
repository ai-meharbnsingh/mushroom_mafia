import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


class RoomType(str, enum.Enum):
    SPAWN_RUN = "SPAWN_RUN"
    FRUITING = "FRUITING"
    INCUBATION = "INCUBATION"
    STORAGE = "STORAGE"


class PlantType(str, enum.Enum):
    OYSTER = "OYSTER"
    BUTTON = "BUTTON"
    SHIITAKE = "SHIITAKE"
    MIXED = "MIXED"


class DeviceType(str, enum.Enum):
    ESP32 = "ESP32"
    ESP8266 = "ESP8266"
    ARDUINO = "ARDUINO"
    PLC = "PLC"


class RelayType(str, enum.Enum):
    CO2 = "CO2"
    HUMIDITY = "HUMIDITY"
    TEMPERATURE = "TEMPERATURE"


class TriggerType(str, enum.Enum):
    MANUAL = "MANUAL"
    AUTO = "AUTO"
    SCHEDULE = "SCHEDULE"


class ThresholdParameter(str, enum.Enum):
    CO2 = "CO2"
    HUMIDITY = "HUMIDITY"
    TEMPERATURE = "TEMPERATURE"


class AlertType(str, enum.Enum):
    CO2_HIGH = "CO2_HIGH"
    CO2_LOW = "CO2_LOW"
    TEMP_HIGH = "TEMP_HIGH"
    TEMP_LOW = "TEMP_LOW"
    HUMIDITY_HIGH = "HUMIDITY_HIGH"
    HUMIDITY_LOW = "HUMIDITY_LOW"
    DEVICE_OFFLINE = "DEVICE_OFFLINE"
    SENSOR_ERROR = "SENSOR_ERROR"


class Severity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class ReportType(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    CUSTOM = "CUSTOM"


class ReportFormat(str, enum.Enum):
    PDF = "PDF"
    EXCEL = "EXCEL"
    CSV = "CSV"


class SubscriptionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED = "EXPIRED"


class CommunicationMode(str, enum.Enum):
    HTTP = "HTTP"
    MQTT = "MQTT"


class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    CONFIG_CHANGE = "CONFIG_CHANGE"
