---
name: autopilot
description: Execute TASK.md step-by-step (agent mode)
invokable: true
---

Autopilot mode.

1) Open TASK.md and STATUS.md.
2) Find the first unchecked step.
3) Execute it strictly.
4) After each step:
   - mark [x] in TASK.md
   - update STATUS.md
   - git commit: feat(step-N): short summary
5) If ambiguity/blocker:
   - write options to DECISIONS.md
   - set Blocked: yes in STATUS.md
   - STOP.

Loop until all steps completed.

After finishing:
- run build/test commands appropriate for the project
- ensure no errors
- write final summary to STATUS.md
