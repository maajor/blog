import type { RefObject } from 'react'
import { useEffect } from 'react'

const keyControlMap = {
    ArrowDown: 'brake',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'forward',
    a: 'left',
    d: 'right',
    s: 'brake',
    w: 'forward',
    A: 'left',
    D: 'right',
    S: 'brake',
    W: 'forward',
} as const

type KeyCode = keyof typeof keyControlMap
type GameControl = (typeof keyControlMap)[KeyCode]

const keyCodes = Object.keys(keyControlMap) as KeyCode[]
const isKeyCode = (v: unknown): v is KeyCode => keyCodes.includes(v as KeyCode)

export type Controls = Record<GameControl, boolean>

export function useKeyboardControls(controls: RefObject<Controls>) {
    useEffect(() => {
        const handleKeydown = ({ key }: KeyboardEvent) => {
            if (!isKeyCode(key)) return
            controls.current[keyControlMap[key]] = true
        }
        window.addEventListener('keydown', handleKeydown)

        const handleKeyup = ({ key }: KeyboardEvent) => {
            if (!isKeyCode(key)) return
            controls.current[keyControlMap[key]] = false
        }
        window.addEventListener('keyup', handleKeyup)

        return () => {
            window.removeEventListener('keydown', handleKeydown)
            window.removeEventListener('keyup', handleKeyup)
        }
    }, [controls])
}
