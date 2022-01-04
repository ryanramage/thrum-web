import { lock } from './immutable-enumerables.js'

class SongState {
  constructor ({ spp, userState, actions }) {
    lock(this, { spp, userState, actions })
  }
  static set (state) { return new SongState(state) }
}

export { SongState }
