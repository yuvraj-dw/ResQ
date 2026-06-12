import logging
import sys
import time
from colorlog import ColoredFormatter


LOG_COLORS = {
    "DEBUG": "cyan",
    "INFO": "green",
    "WARNING": "yellow",
    "ERROR": "red",
    "CRITICAL": "bold_red",
}

MODULE_ICONS = {
    "app.main": "[START]",
    "app.core.database": "[DB]",
    "app.core.security": "[AUTH]",
    "app.services.ai_parser": "[AI]",
    "app.services.geocoder": "[GEO]",
    "app.services.matching": "[MATCH]",
    "app.services.sms_service": "[SMS]",
    "app.services.notification_service": "[NOTIF]",
    "app.services.distance": "[DIST]",
    "app.services.scheduler": "[SCHED]",
    "app.services.auth_service": "[AUTH]",
    "app.services.ws_manager": "[WS]",
    "app.api.v1.auth": "[AUTH]",
    "app.api.v1.requests": "[REQ]",
    "app.api.v1.volunteers": "[VOL]",
    "app.api.v1.sms": "[SMS]",
    "app.api.v1.tracking": "[TRACK]",
    "app.api.v1.websocket": "[WS]",
    "app.api.v1.notifications": "[NOTIF]",
    "resq.request": "[HTTP]",
}

STATUS_COLORS = {
    "2": "green",
    "3": "cyan",
    "4": "yellow",
    "5": "red",
}


class ResQFormatter(ColoredFormatter):
    def format(self, record):
        icon = MODULE_ICONS.get(record.name, "[APP]")
        record.icon = icon
        record.short_name = record.name.replace("app.", "").replace("app.api.v1.", "")
        return super().format(record)


CONSOLE_FORMAT = (
    "%(log_color)s%(icon)-8s%(reset)s "
    "%(log_color)s%(levelname)-7s%(reset)s "
    "%(message)s"
)

FILE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def setup_logging():
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers.clear()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_formatter = ResQFormatter(
        CONSOLE_FORMAT,
        log_colors=LOG_COLORS,
        secondary_log_colors={},
        datefmt="%H:%M:%S",
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)

    return root_logger


class RequestLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        if scope["type"] == "websocket":
            path = scope.get("path", "")
            logger = logging.getLogger("resq.request")
            logger.info(f"WS CONNECT {path}")
            await self.app(scope, receive, send)
            logger.info(f"WS DISCONNECT {path}")
            return

        start_time = time.time()
        request_method = scope.get("method", "")
        request_path = scope.get("path", "")
        query_string = scope.get("query_string", b"").decode()

        if request_path in ("/", "/health", "/docs", "/redoc", "/openapi.json"):
            await self.app(scope, receive, send)
            return

        logger = logging.getLogger("resq.request")

        async def send_with_logging(message):
            if message["type"] == "http.response.start":
                status_code = message.get("status", 0)
                duration = (time.time() - start_time) * 1000
                path_display = request_path
                if query_string:
                    path_display += f"?{query_string}"

                duration_str = f"{duration:.0f}ms" if duration < 1000 else f"{duration/1000:.2f}s"

                if status_code < 400:
                    level = logging.INFO
                elif status_code < 500:
                    level = logging.WARNING
                else:
                    level = logging.ERROR

                logger.log(
                    level,
                    f"{request_method:7s} {status_code} {path_display} ({duration_str})",
                )
            await send(message)

        await self.app(scope, receive, send_with_logging)


def print_banner():
    banner_lines = [
        "",
        "\033[1;36m" + "=" * 55 + "\033[0m",
        "\033[1;36m██████╗ ███████╗███████╗ ██████╗\033[0m",
        "\033[1;36m██╔══██╗██╔════╝██╔════╝██╔═══██╗\033[0m",
        "\033[1;36m██████╔╝█████╗  ███████╗██║   ██║\033[0m",
        "\033[1;36m██╔══██╗██╔══╝  ╚════██║██║▄▄ ██║\033[0m",
        "\033[1;36m██║  ██║███████╗███████║╚██████╔╝\033[0m",
        "\033[1;36m╚═╝  ╚═╝╚══════╝╚══════╝ ╚══▀▀═╝ \033[0m",
        "\033[1;36m" + "=" * 55 + "\033[0m",
        "\033[1;37m  AI-Powered Emergency Response Platform\033[0m",
        "\033[90m  v1.0.0 | MongoDB | DeepInfra | SMS Gate\033[0m",
        "",
    ]
    for line in banner_lines:
        print(line)