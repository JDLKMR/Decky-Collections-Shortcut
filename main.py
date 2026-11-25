import json
import os

import decky

DEFAULTS = {
    "enabled": True,
    "position": "below",
    "route": "/library/collections",
    "debug": False,
}


class Plugin:
    def _settings_path(self) -> str:
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")

    async def get_settings(self) -> dict:
        try:
            with open(self._settings_path(), "r", encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, ValueError):
            data = {}
        if not isinstance(data, dict):
            data = {}
        merged = dict(DEFAULTS)
        for key in DEFAULTS:
            if key in data and isinstance(data[key], type(DEFAULTS[key])):
                merged[key] = data[key]
        return merged

    async def set_settings(self, settings: dict) -> bool:
        clean = {}
        for key, default in DEFAULTS.items():
            value = settings.get(key, default) if isinstance(settings, dict) else default
            clean[key] = value if isinstance(value, type(default)) else default
        if clean["position"] not in ("above", "below"):
            clean["position"] = DEFAULTS["position"]
        os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
        with open(self._settings_path(), "w", encoding="utf-8") as f:
            json.dump(clean, f, indent=2)
        return True

    async def save_debug_report(self, text: str) -> str:
        os.makedirs(decky.DECKY_PLUGIN_LOG_DIR, exist_ok=True)
        path = os.path.join(decky.DECKY_PLUGIN_LOG_DIR, "debug-report.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text if isinstance(text, str) else str(text))
        return path

    async def _main(self):
        decky.logger.info("Collections Shortcut loaded")

    async def _unload(self):
        decky.logger.info("Collections Shortcut unloaded")
