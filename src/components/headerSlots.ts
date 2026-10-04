import { createContext, useContext } from 'react'

export type HeaderSlots = { actions: HTMLElement | null; panel: HTMLElement | null }

export const HeaderSlotsContext = createContext<HeaderSlots>({ actions: null, panel: null })

export function useHeaderSlots() {
  return useContext(HeaderSlotsContext)
}
