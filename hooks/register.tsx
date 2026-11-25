import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { buildScene, type Phase } from './scene.js'

const PLUGIN = 'moonlit-isle'

const { theme, problems } = makeColors({
  label: 'Moonlit isle',
  only: 'dark',
  roles: { accent: '#6fa8ff', danger: '#ff6b7a', success: '#5fd39a', warning: '#f0b75a', pro: '#b49cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07112a',
        'surface-1': '#0b1834',
        'surface-2': '#0f1e3d',
        'surface-3': '#122444',
        'text-primary': '#e8f0ff',
        'text-secondary': '#bccbe8',
        'text-muted': '#93a7cc',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'moonlit-isle', glass: { blur: 18, tint: '#06102a', opacity: 0.55 } },
}

export const register: Register = on => {
  // Module state: what the scene draws next.
  let phase: Phase = 'idle'
  let pct = 0
  let settle: { cancel: () => void } | undefined

  const bucket = (p: number) => Math.round(p / 5) * 5

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      settle?.cancel()
      settle = undefined
      try {
        pct = bucket((await $.session.usage()).context.percent ?? pct)
      } catch {
        // keep the last reading
      }
      phase = 'busy'
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && phase === 'busy') {
      phase = 'settling'
      $.ui.invalidate('ui.render')
      settle = $.clock.after(4000, () => {
        settle = undefined
        phase = 'idle'
        $.ui.invalidate('ui.render')
      })
    }
    return next(e)
  })

  on('session.measure', ($, e, next) => {
    const p = e.context.percent
    if (p !== undefined && bucket(p) !== pct) {
      pct = bucket(p)
      if (phase === 'busy') {
        $.ui.invalidate('ui.render')
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.plugin !== PLUGIN) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={buildScene(phase, pct)}
        alt="A lone tree on a misty island under a giant moon, mirrored in calm water beneath a starry sky"
        isInteractive
      />
    )
  })
}
