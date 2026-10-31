"""Fast physical-input hook callbacks; never wait for UI or MCP work."""

import ctypes
import math
import time
from typing import Any

_ACTIVITY_WINDOW = 2.5  # seconds
_ACTIVITY_PX = 24.0  # net pixels inside the window


def _note_pointer_activity(owner: Any, dx: float, dy: float) -> None:
    """Count pointer movement as user activity only when it nets a real move.

    Sensor drift and high-DPI noise trickle out tiny move events (~2 px/s
    measured while the user is away); feeding every event to
    _last_physical_event kept the 10 s hand-off window permanently closed.
    A net of 24 px inside 2.5 s sits an order of magnitude above drift,
    and a real hand clears it instantly.
    """
    now = time.monotonic()
    if now - getattr(owner, "_activity_window_start", 0.0) > _ACTIVITY_WINDOW:
        owner._activity_window_start = now
        owner._activity_net = [0.0, 0.0]
    net = owner._activity_net
    net[0] += dx
    net[1] += dy
    if math.hypot(net[0], net[1]) >= _ACTIVITY_PX:
        owner._activity_net = [0.0, 0.0]
        owner._activity_window_start = now
        owner._last_physical_event = now

from windows_mcp.desktop.control_win32 import (
    _CHORD,
    _KeyHookData,
    _MouseHookData,
    _key,
    _mouse_button,
    _read_raw_mouse,
    _user32,
)


def physical_mouse(owner: Any, code: int, wparam: int, lparam: int) -> int:
    """Handle a physical mouse hook callback without waiting on other threads."""
    if code < 0:
        return _user32.CallNextHookEx(owner._mouse_hook, code, wparam, lparam)
    valid = False
    button = None
    try:
        data = ctypes.cast(lparam, ctypes.POINTER(_MouseHookData)).contents
        if data.flags & 1:  # LL mouse injection flags.
            return _user32.CallNextHookEx(owner._mouse_hook, code, wparam, lparam)
        valid = True
        if wparam == 0x200:
            last = getattr(owner, "_activity_last_pt", None)
            if last is None:
                owner._activity_last_pt = (data.pt.x, data.pt.y)
            else:
                _note_pointer_activity(owner, data.pt.x - last[0], data.pt.y - last[1])
                owner._activity_last_pt = (data.pt.x, data.pt.y)
        else:
            # Clicks, wheel, buttons: unambiguous activity, no threshold.
            owner._last_physical_event = time.monotonic()
        if wparam == 0x200 and owner._suppress:
            # Pure pointer movement must not pause AI control: the user can
            # move the mouse while the AI works without taking over.
            pass
        button = _mouse_button(wparam, data.mouseData)
        if button:
            if button[1]:
                owner._mouse_down.add(button[0])
                _BUTTON_TIMES[button[0]] = time.monotonic()
            else:
                owner._mouse_down.discard(button[0])
            _publish_live(owner)
        owner._queue(("point", data.pt.x, data.pt.y, int(wparam)))
        if owner._suppress and not owner._emergency:
            if time.monotonic() <= owner._deadline:
                # Physical input passes through while the AI works; a click
                # or key press hands control back instead of being swallowed.
                pass
            else:
                owner._fail_open()
    except Exception:
        owner._fail_open()
    if valid and button:
        if button[1]:
            owner._delivered_mouse.add(button[0])
        else:
            owner._delivered_mouse.discard(button[0])
    return _user32.CallNextHookEx(owner._mouse_hook, code, wparam, lparam)


def physical_key(owner: Any, code: int, wparam: int, lparam: int) -> int:
    """Track each physical key independently and honor the takeover chord."""
    if code < 0:
        return _user32.CallNextHookEx(owner._key_hook, code, wparam, lparam)
    vk = None
    down = False
    try:
        data = ctypes.cast(lparam, ctypes.POINTER(_KeyHookData)).contents
        if data.flags & 0x10:  # LLKHF_INJECTED: AI SendInput stays usable.
            return _user32.CallNextHookEx(owner._key_hook, code, wparam, lparam)
        owner._last_physical_event = time.monotonic()
        vk = int(data.vkCode)
        down = wparam in (0x100, 0x104)
        was_down = vk in owner._pressed
        if down:
            owner._pressed.add(vk)
            owner._last_key = vk
            if not was_down:
                _remember_chord(owner)
        else:
            owner._pressed.discard(vk)
        _publish_live(owner)
        if vk in owner._quarantine:
            if not down:
                owner._quarantine.discard(vk)
                owner._queue(("key",))  # Idle starts after the last chord key is released.
            return 1
        if (
            down
            and vk in _CHORD
            and not was_down
            and not owner._fast_takeover
            and (owner._suppress or owner._visual_armed)
            and _CHORD.issubset({_key(held) for held in owner._pressed})
        ):
            owner._quarantine.update(held for held in owner._pressed if _key(held) in _CHORD)
            owner._fast_takeover = True
            owner._suppress = False  # Release first, then tell the coordinator.
            owner.input_ledger.block_new()
            owner._queue(("hotkey",))
            return 1
        owner._queue(("key",))
        if owner._suppress and not owner._emergency:
            if time.monotonic() <= owner._deadline:
                pass  # Physical keys pass through; the coordinator yields.
            else:
                owner._fail_open()
    except Exception:
        owner._fail_open()
    if vk is not None and down:
        owner._delivered_keys.add(vk)
    elif vk is not None:
        owner._delivered_keys.discard(vk)
    return _user32.CallNextHookEx(owner._key_hook, code, wparam, lparam)


def raw_input(owner: Any, lparam: int) -> None:
    """Queue relative mouse data from a device, independent of injected input."""
    raw = _read_raw_mouse(lparam)
    if raw is None:
        return  # Null devices can be touchpads; do not infer source.
    _note_pointer_activity(owner, raw[1], raw[2])
    owner._queue(("raw", *raw))


# --- live input snapshot for the control banner (thread-safe) ---
import threading as _threading
_LIVE_LOCK = _threading.Lock()
_LIVE = {"keys": (), "buttons": (), "recent": (), "button_times": {}, "ai_actions": (), "pointer": None, "version": 0}
# 每个鼠标键最近一次按下的时刻；松开后保留，用来让高亮逐渐熄灭。
_BUTTON_TIMES: dict[str, float] = {}
# AI 自己发起的动作（Click / Type / 快捷键 / Move）：物理钩子会过滤注入事件，
# 这里单独记一份，横幅才能把 AI 的点击和输入画出来。
_AI_ACTIONS: list[tuple[str, object, float]] = []


def note_ai_action(kind: str, detail: object = None) -> None:
    """Record one AI-driven input action for the banner."""
    now = time.monotonic()
    with _LIVE_LOCK:
        if kind == "click" and isinstance(detail, dict):
            _BUTTON_TIMES[str(detail.get("button") or "left")] = now
            _LIVE["button_times"] = dict(_BUTTON_TIMES)
        _AI_ACTIONS.append((kind, detail, now))
        del _AI_ACTIONS[:-8]
        _LIVE["ai_actions"] = tuple(_AI_ACTIONS)
        _LIVE["version"] += 1


def note_pointer_direction(dx: float, dy: float) -> None:
    """Record the latest AI pointer movement so the mouse can tilt that way."""
    with _LIVE_LOCK:
        _LIVE["pointer"] = (float(dx), float(dy), time.monotonic())
        _LIVE["version"] += 1


def _publish_live(owner) -> None:
    with _LIVE_LOCK:
        _LIVE["keys"] = tuple(sorted(getattr(owner, "_pressed", ())))
        _LIVE["buttons"] = tuple(sorted(getattr(owner, "_mouse_down", ())))
        _LIVE["button_times"] = dict(_BUTTON_TIMES)
        _LIVE["ai_actions"] = tuple(_AI_ACTIONS)
        _LIVE["version"] += 1


def live_input() -> dict:
    with _LIVE_LOCK:
        return dict(_LIVE)


_LIVE_RECENT: list[tuple[tuple[str, ...], float]] = []
_LIVE_KEY_NAMES = {0x11: "Ctrl", 0x10: "Shift", 0x12: "Alt", 0x5B: "Win", 0x5C: "Win", 0x1B: "Esc", 0x0D: "Enter", 0x20: "Space", 0x09: "Tab", 0x08: "Backspace", 0x2E: "Del"}


def _live_label(code: int) -> str:
    if code in _LIVE_KEY_NAMES:
        return _LIVE_KEY_NAMES[code]
    if 0x30 <= code <= 0x39 or 0x41 <= code <= 0x5A:
        return chr(code)
    return ""


def _remember_chord(owner) -> None:
    vk = owner._last_key
    if vk in _LIVE_KEY_NAMES:
        return
    mods = []
    for code in (0x11, 0x10, 0x12, 0x5B, 0x5C):
        if code in owner._pressed:
            label = _live_label(code)
            if label and label not in mods:
                mods.append(label)
    key = _live_label(vk)
    if not key:
        return
    with _LIVE_LOCK:
        _LIVE_RECENT.append((tuple(mods + [key]), time.monotonic()))
        del _LIVE_RECENT[:-3]
        _LIVE["recent"] = tuple(_LIVE_RECENT)
