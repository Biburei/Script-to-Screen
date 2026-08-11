"""
================================================================================
PIPELINE FATAL ERROR LOGGER MODULE (logger.py)
================================================================================
Structured logging system for the Python automation pipeline with:
- Dedicated FATAL error logging level (level 50)
- Uncaught exception hooks (sys.excepthook, threading.excepthook)
- Stack trace recording & file persistence (logs/fatal_errors.log)
- Telemetry & HTTP reporting to central backend server endpoint (/api/logs/fatal)
- Environmental metric snapshots (memory, OS, Python runtime)
================================================================================
"""

import os
import sys
import time
import json
import traceback
import logging
import threading
from pathlib import Path
from typing import Dict, Any, Optional

from pathlib import Path
from typing import Dict, Any, Optional, Union

try:
    import requests
except ImportError:
    requests = None


# Create logs directory
LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

FATAL_LOG_FILE = LOGS_DIR / "fatal_errors.log"
PIPELINE_LOG_FILE = LOGS_DIR / "pipeline.log"
RUN_HISTORY_LOG_FILE = LOGS_DIR / "run_history.jsonl"


def log_pipeline_run(
    metadata: Dict[str, Any],
    log_file: Union[str, Path] = "logs/run_history.jsonl"
) -> str:
    """
    Appends pipeline run audit metadata (randomized choices, model selection, voice, color profile, etc.)
    to a JSON Lines (.jsonl) file with a precise ISO timestamp.
    Ensures the target logs directory exists.
    """
    log_path = Path(log_file)
    if not log_path.is_absolute():
        log_path = LOGS_DIR.parent / log_path

    log_path.parent.mkdir(parents=True, exist_ok=True)

    record = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "unix_timestamp": time.time(),
        **metadata
    }

    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    setup_logger("AuditLogger").info(
        f"📜 Logged pipeline execution run audit to {log_path.name}: "
        f"subreddit={record.get('subreddit')}, model={record.get('openrouter_model') or record.get('model')}, voice={record.get('kokoro_voice') or record.get('voice')}"
    )
    return str(log_path)

# Define custom FATAL level
FATAL_LEVEL_NUM = 50
logging.addLevelName(FATAL_LEVEL_NUM, "FATAL")


def fatal(self, message, *args, **kws):
    if self.isEnabledFor(FATAL_LEVEL_NUM):
        self._log(FATAL_LEVEL_NUM, message, args, **kws)

logging.Logger.fatal = fatal


class PipelineFormatter(logging.Formatter):
    """Custom formatter with high visibility for fatal errors."""

    def format(self, record):
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        if record.levelno >= FATAL_LEVEL_NUM:
            return f"🚨 [{timestamp}] [FATAL_ERROR] [{record.name}] {record.getMessage()}"
        elif record.levelno >= logging.ERROR:
            return f"❌ [{timestamp}] [ERROR] [{record.name}] {record.getMessage()}"
        elif record.levelno >= logging.WARNING:
            return f"⚠️ [{timestamp}] [WARN] [{record.name}] {record.getMessage()}"
        else:
            return f"ℹ️ [{timestamp}] [{record.levelname}] [{record.name}] {record.getMessage()}"


def setup_logger(name: str = "Pipeline") -> logging.Logger:
    """Configures structured logger with console, file, and fatal error reporting handlers."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    if not logger.handlers:
        # Console handler
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)
        ch.setFormatter(PipelineFormatter())
        logger.addHandler(ch)

        # File handler for all logs
        fh = logging.FileHandler(PIPELINE_LOG_FILE, encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] [%(name)s] %(message)s"))
        logger.addHandler(fh)

        # File handler specifically for FATAL errors
        ffh = logging.FileHandler(FATAL_LOG_FILE, encoding="utf-8")
        ffh.setLevel(FATAL_LEVEL_NUM)
        ffh.setFormatter(logging.Formatter("%(asctime)s [FATAL] [%(name)s]\n%(message)s\n" + "-" * 80 + "\n"))
        logger.addHandler(ffh)

    return logger


def report_fatal_error(
    module_name: str,
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    server_url: str = "http://localhost:3000/api/logs/fatal"
) -> Dict[str, Any]:
    """
    Constructs a detailed fatal error report with stack traces and runtime telemetry.
    Appends to local fatal log file and posts report to central server endpoint.
    """
    stack_trace = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    
    error_report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "module": module_name,
        "errorName": error.__class__.__name__,
        "message": str(error),
        "stack": stack_trace,
        "recovered": False,
        "context": context or {},
        "pythonVersion": sys.version.split()[0],
        "processId": os.getpid()
    }

    # Log to local console and fatal log file
    logger = setup_logger(module_name)
    logger.fatal(f"FATAL EXCEPTION OCCURRED: {error.__class__.__name__}: {error}\n{stack_trace}")

    # Post report to local server API if accessible
    if requests:
        try:
            requests.post(server_url, json=error_report, timeout=3)
        except Exception:
            pass  # Fail silently if backend server is not running locally

    return error_report


def _global_uncaught_exception_hook(exctype, value, tb):
    """Global hook to trap all uncaught exceptions in Python process and report as fatal errors."""
    if issubclass(exctype, KeyboardInterrupt):
        sys.__excepthook__(exctype, value, tb)
        return

    stack_trace = "".join(traceback.format_exception(exctype, value, tb))
    report_fatal_error(
        module_name="UNCAUGHT_PROCESS_EXCEPTION",
        error=value,
        context={"uncaught": True, "stack_trace": stack_trace}
    )

def _threading_exception_hook(args):
    """Global hook for uncaught exceptions in worker threads."""
    report_fatal_error(
        module_name=f"THREAD_FATAL_{args.thread.name}",
        error=args.exc_value,
        context={"thread_name": args.thread.name}
    )


# Attach uncaught exception handlers at module import time
sys.excepthook = _global_uncaught_exception_hook
if hasattr(threading, "excepthook"):
    threading.excepthook = _threading_exception_hook
