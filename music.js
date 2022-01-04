export function tick (state) {
  if (state.spp % 96 === 0) state.actions.push({to: 'midi', note: 'C5' })
  return state
}
