import type { Subject } from '../types/types'

export function resolveCorr(input: string, allSubjects: Subject[]): string {
    const val = input.trim()

    const byCode = allSubjects.find(
        s => s.code && s.code.toLowerCase() === val.toLowerCase()
    )
    if (byCode) return byCode.code

    const byName = allSubjects.filter(
        s => s.name.toLowerCase() === val.toLowerCase()
    )
    if (byName.length === 1) return byName[0].name
    if (byName.length > 1) {
        return byName[0].code || byName[0].name
    }

    const partial = allSubjects.filter(
        s => s.name.toLowerCase().includes(val.toLowerCase())
    )
    if (partial.length === 1) return partial[0].name
    if (partial.length > 1) {
        return partial[0].code || partial[0].name
    }

    return val
}


export function formatCorrLabel(value: string, type: 'approved' | 'regular'): string {
    if (type === 'regular') return `Regularidad ${value}`
    return value
}