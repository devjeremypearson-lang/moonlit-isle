# moonlit-isle

A Claude Code theme for the desktop and mobile apps: a lone tree on a misty island under a giant moon, mirrored in calm water beneath a night sky. The scene sits on the right edge so it stays clear of messages. Animated with SMIL only.

- Rain falls while Claude works, heavier as more of the context window is used, with ripples landing at random spots on the water.
- Stars appear only while Claude works, twinkling in and out, with the odd shooting star.
- When a prompt finishes, the rain and stars fade out and the scene settles still.

## Install

At the prompt of a terminal session:

```
/plugin install moonlit-isle --marketplace devjeremypearson-lang/moonlit-isle
```

From a shell:

```bash
claude plugin install moonlit-isle --marketplace devjeremypearson-lang/moonlit-isle
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `devjeremypearson-lang/moonlit-isle`, then Add plugin.

For Claude Code cloud sessions, add the shell line above to the cloud environment's setup script so the theme loads in every new session.

## Files

- `hooks/scene.ts` builds the SVG scene for each state (idle, working, settling).
- `hooks/register.tsx` sets the theme and redraws the scene on turn start, turn end and context changes.
- `hooks/make-colors.js` is the design system's color helper, copied unchanged.
