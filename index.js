import { SongState } from './modules/songState.js'
import { lengths } from './modules/lengths.js'
let tick = () => {}
let lastModified = null

const midi_in = JZZ.gui.SelectMidiIn({ at: 'select_midi_in' })
const midi_out = JZZ.gui.SelectMidiOut({ at: 'select_midi_out' })

console.log('search', window.location.search)

if (!window.location.search) {
  console.log('no search')
  // user needs to set an entry point
  document.getElementById('load').addEventListener('click', () => {
    const tickFile = document.getElementById('tickFile').value
    console.log('tick', tickFile)
    // just check that its valid before sending them off
    import(tickFile)
      .then(module => {
        window.location = `${window.location.origin}?${encodeURIComponent(tickFile)}` 
      })
      .catch(err => document.getElementById('error').innerHTML = err.toString() )
  })
} else {

  document.getElementById('tickFile').setAttribute("readonly", true)
  document.getElementById('load').style.display = 'none'
  
  const tickFile = decodeURIComponent(window.location.search.substring(1))
  import(tickFile).then(module => tick = module.tick)
  // start hot reload
  setInterval(() => {
    fetch(`${tickFile}?d=${Date.now()}`, {method: 'HEAD'}).then(resp => {
      let modified = resp.headers.get('Last-Modified')
      if (lastModified && modified !== lastModified) {
        import(`${tickFile}?d=${Date.now()}`).then(module => tick = module.tick) // reload the module using cache busting
      }
      lastModified = modified
    })
  }, 1200)  
}

let initialState = SongState.set({spp: 0, userState: {}, actions: []})
let lastState = initialState
let futureActions = Immutable.List([])
const onClock = (spp) => {
  let thisState = SongState.set({...lastState, spp, actions: []})
  // clear any future actions. eg: scheduled midi off notes
  futureActions = dispatchMemoActions(futureActions, thisState)
  lastState = tick(thisState)
  if (lastState) futureActions = futureActions.concat(dispatch(spp, lastState.actions))
}
const onStop = () => {}
const onMidi = (msg) => {}

function dispatchMemoActions (futureActions, state) {
  return futureActions.filter(action => {
    if (action.spp !== spp) return true
    if (action.name === 'midiOff') midiOff(action.msg)
    if (action.name === 'midiOn') state.actions.push(action.msg)
    return false // so filter works
  })
}
function midiOff (msg) {
  let channel = msg.channel || 0
  let velocity = msg.velocity || 127
  midi_out.noteOff(channel, msg.note)
}

// returns a list of memo (future actions)
function dispatch (spp, actions) {
  return Immutable.List([]).withMutations(futureActions => {
    if (!actions) actions = []
    actions.forEach(a => {
      let to = null
      let msg = null
      if (Array.isArray(a)) {
        to = a[0]
        msg = a[1]
      } else if (a.futureSpp) {
        let futureSpp = a.futureSpp
        delete a.futureSpp
        futureActions.concat({ spp: futureSpp, name: 'midiOn', msg: a })
      } else {
        to = a.to
        msg = a
      }
      if (!to) return
      let fa = null //fn.call(spp, msg)
      if (to === 'midi') fa = toMidi(spp, msg)
      if (to === 'cc') fa = toCC(spp, msg)
      if (fa) futureActions.concat(fa)
      return true
    })
    return futureActions
  })
}

function toMidi (spp, msg) {
  let channel = msg.channel || 0
  let velocity = msg.velocity || 127
  let length = msg.length || lengths['8n']
  if (typeof length === 'string') length = lengths[length]
  midi_out.noteOn(channel, msg.note, velocity) // request an acutal midi note
  let offSpp = spp + length
  return {spp: offSpp, name: 'midiOff', msg} // schedule a midi off note
}

function toCC (spp, msg, context) {
  let channel = msg.channel || 0
  midi_out.control(channel, msg.knob, msg.value)
}

let spp = 0
midi_in.onSelect = () => {
  midi_in.connect(msg => {
    switch (msg[0]) {
      // Clock
      case 0xF2:
        let a = (msg[2] << 7) + msg[1] // data2 is msb, data1 is lsb
        spp = (a * 6)
        console.log('MIDI clock received', spp)
        break
      case 0xF8:
        if (spp !== null) onClock(spp++)
        break
      case 0xFA:
        console.log('MIDI', 'Start Received')
        break
      case 0xFB:
        console.log('MIDI', 'Continue Received')
        break
      case 0xFC:
        console.log('MIDI', 'Stop Received')
        // do an all notes off
        onStop()
        break
      default:
        onMidi(msg)
        break
    }
  })
}
midi_out.onSelect = function(name) {
  console.log('MIDI-out selected:', name);
};
