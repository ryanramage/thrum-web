import { lengths } from './lengths.js'
import { Cyclist } from './cyclist.js'
import { SongState } from './songState.js'



function tickBuffer (barLength, tickFunction) {
  this.bufferLength = 2 * lengths[barLength] // we store 2 bar lengths
  this.spp = 0 // we keep an internal spp for
  this.buffer = new Cyclist(this.bufferLength)
  this.tickFunction = tickFunction
  // calculate out the full buffer


}
