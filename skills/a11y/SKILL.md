---
name: a11y
description: Use for every component on web and mobile.
---
# Accessibility (WCAG 2.2 AA)
- Text contrast ≥ 4.5:1 measured over the worst background behind the glass; UI parts ≥ 3:1.
- Risk, status, badges: never colour alone.
- Keyboard: all controls by Tab; visible focus 3px; Esc closes drawers; map has keyboard-focusable stop list.
- Map alternative: the ordered stops table is always rendered.
- Live regions: job status changes announced (`aria-live="polite"`); errors `role="alert"`.
- Touch targets ≥ 44px web, ≥ 48dp Android. accessibilityLabel on every Pressable. Support font scale 200%.
- Reduced motion and reduced transparency honoured.
- Dates/times: show IST with label "IST"; tooltips show ISO UTC.
- Test: `@axe-core/playwright` on each web route; RN: manual TalkBack pass (report only if done).
