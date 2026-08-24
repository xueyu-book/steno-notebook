import { ref } from 'vue'
import { NOTE_ANIMATIONS } from '@/constants/notes'
import { getNoteMetrics } from '@/utils/helpers'

function randomVelocity() {
  let speedX = (Math.random() - 0.5) * 2
  let speedY = (Math.random() - 0.5) * 2
  if (Math.abs(speedX) < 0.5) speedX = speedX < 0 ? -0.5 : 0.5
  if (Math.abs(speedY) < 0.5) speedY = speedY < 0 ? -0.5 : 0.5
  return { x: speedX, y: speedY }
}

export function useNoteMotion(notes, notesAreaRef, { persist } = {}) {
  const currentAnimation = ref('')
  const organized = ref(false)

  let inactivityTimer = 0
  let rafId = 0
  let freeMoving = false
  const velocities = new Map()

  function stopFreeMove(resetTimer = true) {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const wasMoving = freeMoving
    freeMoving = false
    velocities.clear()
    if (wasMoving) persist?.()
    if (resetTimer) resetInactivityTimer()
  }

  function tick() {
    const area = notesAreaRef.value
    if (!area || !freeMoving) return
    const { width, height } = getNoteMetrics()
    const maxX = Math.max(0, area.offsetWidth - width)
    const maxY = Math.max(0, area.offsetHeight - height)
    notes.value.forEach((note) => {
      let velocity = velocities.get(note.id)
      if (!velocity) {
        velocity = randomVelocity()
        velocities.set(note.id, velocity)
      }
      note.left += velocity.x
      note.top += velocity.y
      if (note.left < 0) {
        note.left = 0
        velocity.x = -velocity.x
      } else if (note.left > maxX) {
        note.left = maxX
        velocity.x = -velocity.x
      }
      if (note.top < 0) {
        note.top = 0
        velocity.y = -velocity.y
      } else if (note.top > maxY) {
        note.top = maxY
        velocity.y = -velocity.y
      }
    })
    rafId = requestAnimationFrame(tick)
  }

  function startFreeMove() {
    if (!notesAreaRef.value || freeMoving) return
    freeMoving = true
    rafId = requestAnimationFrame(tick)
  }

  function resetInactivityTimer() {
    window.clearTimeout(inactivityTimer)
    inactivityTimer = window.setTimeout(() => {
      if (!freeMoving) startFreeMove()
    }, 10000)
  }

  function touchActivity() {
    resetInactivityTimer()
  }

  function stopAllMotion() {
    currentAnimation.value = ''
    stopFreeMove(false)
  }

  function playRandomAnimation() {
    if (!notes.value.length) return false
    stopFreeMove(false)
    const others = NOTE_ANIMATIONS.filter((item) => item.name !== currentAnimation.value)
    const pool = others.length ? others : NOTE_ANIMATIONS
    currentAnimation.value = pool[Math.floor(Math.random() * pool.length)].name
    touchActivity()
    return true
  }

  function startListening() {
    resetInactivityTimer()
    window.addEventListener('pointerdown', touchActivity)
    window.addEventListener('pointermove', touchActivity)
    window.addEventListener('keydown', touchActivity)
  }

  function stopListening() {
    window.clearTimeout(inactivityTimer)
    stopAllMotion()
    window.removeEventListener('pointerdown', touchActivity)
    window.removeEventListener('pointermove', touchActivity)
    window.removeEventListener('keydown', touchActivity)
  }

  return {
    currentAnimation,
    organized,
    animations: NOTE_ANIMATIONS,
    touchActivity,
    stopFreeMove,
    stopAllMotion,
    playRandomAnimation,
    startListening,
    stopListening
  }
}
