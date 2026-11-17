export const minimumPlaybackSpeed = 0.25
export const maximumPlaybackSpeed = 2
export const playbackSpeedStep = 0.05
export const speedWheelPixelsPerStep = 12

/** Work in integer hundredths so every native-media detent is exactly 0.05. */
export function playbackSpeedSteps(supported?: readonly number[]) {
  if (supported !== undefined) {
    const rates = [...new Set(supported.filter((rate) => Number.isFinite(rate) && rate >= minimumPlaybackSpeed && rate <= maximumPlaybackSpeed))].sort((left, right) => left - right)
    return rates.length ? rates : [1]
  }
  return Array.from({ length: 36 }, (_, index) => (25 + index * 5) / 100)
}

export function nearestPlaybackSpeedIndex(steps: readonly number[], rate: number) {
  let nearest = 0
  for (let index = 1; index < steps.length; index++) {
    if (Math.abs(steps[index] - rate) < Math.abs(steps[nearest] - rate)) nearest = index
  }
  return nearest
}

export function draggedPlaybackSpeed(steps: readonly number[], startIndex: number, distance: number) {
  const detents = Math.round(distance / speedWheelPixelsPerStep)
  const target = Math.max(minimumPlaybackSpeed, Math.min(maximumPlaybackSpeed, (Math.round(steps[startIndex] * 100) + detents * 5) / 100))
  // A sparse YouTube range must not become more sensitive than the native wheel.
  return distance >= 0
    ? [...steps].reverse().find((rate) => rate <= target) ?? steps[0]
    : steps.find((rate) => rate >= target) ?? steps[steps.length - 1]
}

export function keyboardPlaybackSpeed(steps: readonly number[], rate: number, key: string) {
  const index = nearestPlaybackSpeedIndex(steps, rate)
  switch (key) {
    case 'Home': return steps[0]
    case 'End': return steps[steps.length - 1]
    case 'ArrowRight':
    case 'ArrowUp': return steps[Math.min(steps.length - 1, index + 1)]
    case 'ArrowLeft':
    case 'ArrowDown': return steps[Math.max(0, index - 1)]
    default: return null
  }
}
