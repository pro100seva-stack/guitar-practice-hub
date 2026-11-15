/** BPM always measures quarter notes; the meter's denominator sets each click's note value. */
export function metronomeBeatSeconds(quarterNoteBpm: number, beatUnit: number) {
  const bpm = Number.isFinite(quarterNoteBpm) && quarterNoteBpm > 0 ? quarterNoteBpm : 100
  const unit = Number.isFinite(beatUnit) && beatUnit > 0 ? beatUnit : 4
  return (60 / bpm) * (4 / unit)
}
