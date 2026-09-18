# 13.0.0 Final

## Campus Connection
- Added user-supplied Campus URL at authentication.
- Added session-scoped Campus target so different users can connect to different Moodle/Campus hosts without cross-session state.
- Dynamic same-campus proxy and redirect handling.

## Session
- Track web-capable cookies instead of assuming one fixed cookie name.
- Preserve the real web session while obtaining optional REST capability.
- Strengthened web-session recovery and invalidation.

## Course Content
- Added `core_course_get_contents` AJAX read path when a web session is available.
- Course HTML is the compatibility fallback after structured transports.
- Structured-empty courses retain a native Campus fallback instead of being presented as known-empty data.
- Preserved the current Course Graph / Activity Engine pipeline.

## UI
- Added Campus URL field to the existing Nova login design.
- Remember the last Campus URL on the current device.
- Course pages can render a sanitized real Campus compatibility payload without leaving the Nova shell.
- Existing Nova visual design remains intact.
