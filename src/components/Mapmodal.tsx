import { useState, useEffect, useRef, useCallback } from 'react'
import { renderToString } from 'react-dom/server'
import type { ReactNode } from 'react'
import { X, Navigation, Clock, MapPin, Loader } from 'lucide-react'
import Car from '../Icon/Car'
import Byke from '../Icon/Byke'
import Walking from '../Icon/Walking'
import Waze from '../Icon/Waze'
import GoogleMaps from '../Icon/GoogleMaps'
import './Mapmodal.css'

interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
}

interface RouteInfo {
    distanceKm: number
    durationMin: number
}

interface EcobiciStation {
    station_id: string
    name: string
    address?: string
    lat: number
    lon: number
    bikes?: number
    docks?: number
}

type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit'
type BikeType = 'propia' | 'ecobici'

interface ModeConfig {
    key: TravelMode
    label: string
    icon: ReactNode
    orsProfile: string
    color: string
    dash?: string
}

const MODES: ModeConfig[] = [
    { key: 'driving', label: 'Auto', icon: <Car size={18} color='#6366f1' />, orsProfile: 'driving-car', color: '#6366f1' },
    { key: 'cycling', label: 'Bici', icon: <Byke size={18} color='#f59e0b' />, orsProfile: 'cycling-regular', color: '#f59e0b', dash: '7,5' },
    { key: 'walking', label: 'Caminando', icon: <Walking size={18} color='#38bdf8' />, orsProfile: 'foot-walking', color: '#38bdf8', dash: '3,7' },
]

const ORS_KEY = '5b3ce3597851110001cf6248a355efb1d2e94c7bb3f1b739bcaeb32c'
const ECOBICI_STATION_INFO = 'https://buenosaires.publicbikesystem.net/customer/gbfs/v2/en/station_information.json'
const ECOBICI_STATION_STATUS = 'https://buenosaires.publicbikesystem.net/customer/gbfs/v2/en/station_status.json'

interface Props {
    onClose: () => void
    initialDestination?: string
}

function dist(a: [number, number], b: [number, number]) {
    const R = 6371
    const dLat = ((b[0] - a[0]) * Math.PI) / 180
    const dLon = ((b[1] - a[1]) * Math.PI) / 180
    const x = Math.sin(dLat / 2) ** 2 +
        Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function sanitizeQuery(q: string) {
    return q.trim().replace(/[^\p{L}\p{N}\s,.-]/gu, '').slice(0, 100)
}

async function geocode(query: string): Promise<NominatimResult[]> {
    const safeQuery = sanitizeQuery(query)
    if (safeQuery.length < 3) return []
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(safeQuery)}&format=json&limit=5&addressdetails=0`,
            { headers: { 'Accept-Language': 'es', 'User-Agent': 'CorrelApp/1.0' } }
        )
        return await res.json()
    } catch { return [] }
}

function validCoord(lat: number, lon: number) {
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

async function getRoute(from: [number, number], to: [number, number], mode: TravelMode): Promise<{ coords: [number, number][]; info: RouteInfo } | null> {
    const cfg = MODES.find(m => m.key === mode)!
    if (!validCoord(from[0], from[1]) || !validCoord(to[0], to[1])) return null
    try {
        const res = await fetch(
            `https://api.openrouteservice.org/v2/directions/${cfg.orsProfile}/geojson`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': ORS_KEY },
                body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] }),
            }
        )
        if (res.ok) {
            const data = await res.json()
            const feat = data.features?.[0]
            if (feat) {
                const coords: [number, number][] = feat.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon])
                let durationMin = feat.properties.summary.duration / 60
                if (mode === 'transit') durationMin *= 1.8
                return { coords, info: { distanceKm: feat.properties.summary.distance / 1000, durationMin } }
            }
        }
    } catch { /* fallback */ }
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const data = await res.json()
        if (data.code !== 'Ok') return null
        const r = data.routes[0]
        const distKm = r.distance / 1000
        let durationMin = r.duration / 60
        if (mode === 'walking') durationMin = (distKm / 5) * 60
        if (mode === 'cycling') durationMin = (distKm / 15) * 60
        if (mode === 'transit') durationMin *= 1.8
        return {
            coords: r.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
            info: { distanceKm: distKm, durationMin },
        }
    } catch { return null }
}

async function fetchEcobiciStations(): Promise<EcobiciStation[]> {
    try {
        const [infoRes, statusRes] = await Promise.all([fetch(ECOBICI_STATION_INFO), fetch(ECOBICI_STATION_STATUS)])
        if (!infoRes.ok) return []
        const infoData = await infoRes.json()
        const stations: EcobiciStation[] = (infoData.data?.stations ?? []).map((s: any) => ({
            station_id: s.station_id, name: s.name, address: s.address,
            lat: s.lat, lon: s.lon, bikes: undefined, docks: undefined,
        }))
        if (statusRes.ok) {
            const statusData = await statusRes.json()
            const statusMap: Record<string, { bikes: number; docks: number }> = {}
            for (const s of (statusData.data?.stations ?? [])) {
                statusMap[s.station_id] = { bikes: s.num_bikes_available ?? 0, docks: s.num_docks_available ?? 0 }
            }
            for (const st of stations) {
                const s = statusMap[st.station_id]
                if (s) { st.bikes = s.bikes; st.docks = s.docks }
            }
        }
        return stations
    } catch { return [] }
}

function makeDestIcon(L: any) {
    return L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#f43f5e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6],
    })
}

function makeEcobiciIcon(L: any, bikes: number | undefined) {
    const ok = bikes == null || bikes > 0
    const bikeIconHtml = renderToString(<Byke size={12} color="white" />)
    return L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;gap:4px;background:${ok ? '#f59e0b' : '#475569'};color:white;border-radius:8px;padding:2px 6px;font-size:10px;font-weight:700;font-family:sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${bikeIconHtml}${bikes != null ? bikes : ''}</div>`,
        iconSize: [44, 24], iconAnchor: [22, 24],
    })
}

export default function MapModal({ onClose, initialDestination }: Props) {
    const mapRef = useRef<HTMLDivElement>(null)
    const leafletMap = useRef<any>(null)
    const routeLayer = useRef<any>(null)
    const destMarker = useRef<any>(null)
    const ecobiciMarkers = useRef<any[]>([])
    const userPosRef = useRef<[number, number] | null>(null)
    const currentDest = useRef<{ pos: [number, number]; name: string } | null>(null)
    const autoSearchDone = useRef(false)

    const [query, setQuery] = useState(initialDestination ?? '')
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
    const [suggestOpen, setSuggestOpen] = useState(false)
    const [loadingSugg, setLoadingSugg] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const suggestRef = useRef<HTMLDivElement>(null)

    const [route, setRoute] = useState<RouteInfo | null>(null)
    const [status, setStatus] = useState<'idle' | 'locating' | 'routing'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [travelMode, setTravelMode] = useState<TravelMode>('driving')
    const [bikeType, setBikeType] = useState<BikeType>('propia')
    const [destCoords, setDestCoords] = useState<[number, number] | null>(null)

    const [ecobiciStations, setEcobiciStations] = useState<EcobiciStation[]>([])
    const [nearestOrigin, setNearestOrigin] = useState<EcobiciStation | null>(null)
    const [nearestDest, setNearestDest] = useState<EcobiciStation | null>(null)
    const [loadingEcobici, setLoadingEcobici] = useState(false)

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }, [onClose])

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setSuggestOpen(false)
        }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
    }, [])

    const updateEcobici = useCallback(async (L: any, destPos: [number, number]) => {
        for (const m of ecobiciMarkers.current) m.remove()
        ecobiciMarkers.current = []
        setNearestOrigin(null); setNearestDest(null)
        if (bikeType !== 'ecobici') return
        setLoadingEcobici(true)
        let stations = ecobiciStations
        if (stations.length === 0) { stations = await fetchEcobiciStations(); setEcobiciStations(stations) }
        setLoadingEcobici(false)
        if (stations.length === 0) return
        const userPos = userPosRef.current
        let bestOrigin: EcobiciStation | null = null
        if (userPos) {
            const withBikes = stations.filter(s => s.bikes == null || s.bikes > 0)
            bestOrigin = withBikes.reduce((best, s) => {
                const d = dist(userPos, [s.lat, s.lon])
                return !best || d < dist(userPos, [best.lat, best.lon]) ? s : best
            }, null as EcobiciStation | null)
        }
        const withDocks = stations.filter(s => s.docks == null || s.docks > 0)
        const bestDest = withDocks.reduce((best, s) => {
            const d = dist(destPos, [s.lat, s.lon])
            return !best || d < dist(destPos, [best.lat, best.lon]) ? s : best
        }, null as EcobiciStation | null)
        setNearestOrigin(bestOrigin); setNearestDest(bestDest)
        const toPaint = [bestOrigin, bestDest].filter(Boolean) as EcobiciStation[]
        for (const st of toPaint) {
            const m = L.marker([st.lat, st.lon], { icon: makeEcobiciIcon(L, st.bikes) })
                .addTo(leafletMap.current)
                .bindPopup(`<b>${st.name}</b>${st.address ? `<br>${st.address}` : ''}${st.bikes != null ? `<br>🚲 ${st.bikes} bicis · 🔒 ${st.docks ?? '?'} lugares` : ''}`)
            ecobiciMarkers.current.push(m)
        }
    }, [bikeType, ecobiciStations])

    const drawRoute = useCallback(async (L: any, destPos: [number, number], mode: TravelMode) => {
        if (!leafletMap.current) return
        if (routeLayer.current) { routeLayer.current.remove(); routeLayer.current = null }
        setRoute(null); setErrorMsg(null)
        if (!userPosRef.current) return
        setStatus('routing')
        const result = await getRoute(userPosRef.current, destPos, mode)
        setStatus('idle')
        if (!result) { setErrorMsg('No se pudo calcular la ruta.'); return }
        const cfg = MODES.find(m => m.key === mode)!
        setRoute(result.info)
        routeLayer.current = L.polyline(result.coords, { color: cfg.color, weight: 5, opacity: 0.85, dashArray: cfg.dash }).addTo(leafletMap.current)
        leafletMap.current.fitBounds(L.latLngBounds([userPosRef.current, destPos]), { padding: [40, 40] })
    }, [])

    const drawDestination = useCallback(async (L: any, destPos: [number, number], name: string, mode: TravelMode) => {
        if (!leafletMap.current) return
        if (destMarker.current) { destMarker.current.remove(); destMarker.current = null }
        if (routeLayer.current) { routeLayer.current.remove(); routeLayer.current = null }
        setRoute(null); setErrorMsg(null)
        destMarker.current = L.marker(destPos, { icon: makeDestIcon(L) }).addTo(leafletMap.current).bindPopup(name)
        currentDest.current = { pos: destPos, name }
        setDestCoords(destPos)
        await Promise.all([drawRoute(L, destPos, mode), updateEcobici(L, destPos)])
    }, [drawRoute, updateEcobici])

    useEffect(() => {
        const L = (window as any).L
        if (!L || !leafletMap.current || !currentDest.current || !userPosRef.current) return
        if (travelMode !== 'cycling') {
            for (const m of ecobiciMarkers.current) m.remove()
            ecobiciMarkers.current = []
            setNearestOrigin(null); setNearestDest(null)
        }
        drawRoute(L, currentDest.current.pos, travelMode)
    }, [travelMode, drawRoute])

    useEffect(() => {
        const L = (window as any).L
        if (!L || !leafletMap.current || !currentDest.current || travelMode !== 'cycling') return
        updateEcobici(L, currentDest.current.pos)
    }, [bikeType, updateEcobici])

    const handleSelect = useCallback(async (r: NominatimResult) => {
        const destPos: [number, number] = [parseFloat(r.lat), parseFloat(r.lon)]
        const name = r.display_name.split(',').slice(0, 2).join(', ')
        setQuery(name); setSuggestOpen(false); setSuggestions([])
        await drawDestination((window as any).L, destPos, name, travelMode)
    }, [drawDestination, travelMode])

    useEffect(() => {
        if (!mapRef.current) return
        const init = async () => {
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link')
                link.id = 'leaflet-css'; link.rel = 'stylesheet'
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                document.head.appendChild(link)
            }
            if (!(window as any).L) {
                await new Promise<void>((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
                    s.onload = () => res(); s.onerror = rej
                    document.head.appendChild(s)
                })
            }
            const L = (window as any).L
            if (leafletMap.current || !mapRef.current) return
            leafletMap.current = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: 13 })
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(leafletMap.current)

            setStatus('locating')
            const onLoc = async (coords: [number, number]) => {
                userPosRef.current = coords; setStatus('idle')
                const userIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:14px;height:14px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 0 0 3px rgba(99,102,241,0.3);"></div>`,
                    iconSize: [14, 14], iconAnchor: [7, 7],
                })
                L.marker(coords, { icon: userIcon }).addTo(leafletMap.current).bindPopup('Tu ubicación')
                leafletMap.current.setView(coords, 14)
                if (initialDestination && !autoSearchDone.current) {
                    autoSearchDone.current = true
                    setLoadingSugg(true)
                    const results = await geocode(initialDestination)
                    setLoadingSugg(false)
                    if (results.length > 0) {
                        const best = results[0]
                        const destPos: [number, number] = [parseFloat(best.lat), parseFloat(best.lon)]
                        const name = best.display_name.split(',').slice(0, 2).join(', ')
                        setQuery(name)
                        await drawDestination(L, destPos, name, travelMode)
                    } else setErrorMsg(`No se encontró "${initialDestination}". Buscalo manualmente.`)
                }
            }
            const onErr = async () => {
                setStatus('idle')
                setErrorMsg('No pudimos obtener tu ubicación. Activá el GPS.')
                if (initialDestination && !autoSearchDone.current) {
                    autoSearchDone.current = true
                    setLoadingSugg(true)
                    const results = await geocode(initialDestination)
                    setLoadingSugg(false)
                    if (results.length > 0) {
                        const best = results[0]
                        const destPos: [number, number] = [parseFloat(best.lat), parseFloat(best.lon)]
                        const name = best.display_name.split(',').slice(0, 2).join(', ')
                        setQuery(name)
                        await drawDestination(L, destPos, name, travelMode)
                    }
                }
            }
            navigator.geolocation.getCurrentPosition(
                pos => onLoc([pos.coords.latitude, pos.coords.longitude]),
                onErr, { timeout: 10000 }
            )
        }
        init()
        return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null } }
    }, [])

    const handleQueryChange = (val: string) => {
        setQuery(val); setSuggestOpen(true)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (val.length < 3) { setSuggestions([]); return }
        setLoadingSugg(true)
        debounceRef.current = setTimeout(async () => { setSuggestions(await geocode(val)); setLoadingSugg(false) }, 400)
    }

    const fmt = (min: number) => min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`

    const arrivalTime = route ? (() => {
        const now = new Date()
        now.setMinutes(now.getMinutes() + Math.round(route.durationMin))
        return now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    })() : null

    const activeCfg = MODES.find(m => m.key === travelMode)!
    const wazeUrl = destCoords ? `https://waze.com/ul?ll=${destCoords[0]},${destCoords[1]}&navigate=yes` : null
    const gmapsUrl = destCoords ? `https://www.google.com/maps/dir/?api=1&destination=${destCoords[0]},${destCoords[1]}` : null

    return (
        <div className="map-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="map-modal">

                {/* Header */}
                <div className="map-header">
                    <MapPin size={16} color="#6366f1" />
                    <span className="map-header__title">
                        {initialDestination ? `Cómo llegar · ${initialDestination}` : 'Cómo llegar'}
                    </span>
                    <button className="map-header__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="map-search" ref={suggestRef}>
                    <div className="map-search__input-wrap">
                        <Navigation size={14} color="var(--muted, #888)" />
                        <input
                            className="map-search__input"
                            value={query}
                            onChange={e => handleQueryChange(e.target.value)}
                            onFocus={() => query.length >= 3 && setSuggestOpen(true)}
                            placeholder="¿A dónde querés ir?"
                        />
                        {loadingSugg && <Loader size={13} color="var(--muted)" className="map-spin" />}
                    </div>
                    {suggestOpen && suggestions.length > 0 && (
                        <div className="map-search__dropdown">
                            {suggestions.map(r => (
                                <button key={r.place_id} className="map-search__item" onClick={() => handleSelect(r)}>
                                    <span className="map-search__item-name">{r.display_name.split(',')[0]}</span>
                                    <span className="map-search__item-sub">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mode selector */}
                <div className="map-modes">
                    {MODES.map(m => {
                        const on = travelMode === m.key
                        return (
                            <button
                                key={m.key}
                                className="map-mode-btn"
                                onClick={() => setTravelMode(m.key)}
                                style={{
                                    border: on ? `1px solid ${m.color}55` : '1px solid rgba(255,255,255,0.07)',
                                    background: on ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <span>{m.icon}</span>
                                <span className="map-mode-btn__label" style={{ color: on ? m.color : 'var(--muted, #888)', fontWeight: on ? 600 : 400 }}>
                                    {m.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Bike type */}
                {travelMode === 'cycling' && (
                    <div className="map-biketype">
                        {(['propia', 'ecobici'] as const).map(bt => {
                            const on = bikeType === bt
                            return (
                                <button
                                    key={bt}
                                    className="map-biketype-btn"
                                    onClick={() => setBikeType(bt)}
                                    style={{
                                        border: on ? '1px solid #f59e0b55' : '1px solid rgba(255,255,255,0.07)',
                                        background: on ? '#f59e0b18' : 'rgba(255,255,255,0.03)',
                                        color: on ? '#f59e0b' : 'var(--muted, #888)',
                                        fontWeight: on ? 600 : 400,
                                    }}
                                >
                                    <Byke size={14} color='currentColor' />
                                    {bt === 'propia' ? 'Bici propia' : 'EcoBici'}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Route info */}
                {(route || status !== 'idle' || errorMsg) && (
                    <div className="map-route-info">
                        {status !== 'idle' && (
                            <span className="map-status">
                                <Loader size={12} className="map-spin" />
                                {status === 'locating' ? 'Obteniendo ubicación...' : 'Calculando ruta...'}
                            </span>
                        )}
                        {route && status === 'idle' && (
                            <>
                                <div className="map-route-chip" style={{ background: `${activeCfg.color}20`, border: `1px solid ${activeCfg.color}44`, color: activeCfg.color }}>
                                    <Navigation size={11} /> {route.distanceKm.toFixed(1)} km
                                </div>
                                <div className="map-route-chip" style={{ background: `${activeCfg.color}20`, border: `1px solid ${activeCfg.color}44`, color: activeCfg.color }}>
                                    <Clock size={11} /> {fmt(route.durationMin)}
                                </div>
                                {arrivalTime && (
                                    <div className="map-route-chip" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                                        <Clock size={11} /> Llegás a las {arrivalTime}
                                    </div>
                                )}
                            </>
                        )}
                        {errorMsg && <div className="map-route-error">{errorMsg}</div>}
                    </div>
                )}

                {/* Ecobici panel */}
                {travelMode === 'cycling' && bikeType === 'ecobici' && (nearestOrigin || nearestDest || loadingEcobici) && (
                    <div className="map-ecobici">
                        {loadingEcobici && (
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Loader size={11} className="map-spin" /> Buscando estaciones EcoBici...
                            </span>
                        )}
                        {nearestOrigin && (
                            <div className="map-ecobici__row">
                                <span className="map-ecobici__label">Retirá en: </span>
                                <strong>{nearestOrigin.name}</strong>
                                {nearestOrigin.address && <span style={{ opacity: 0.6 }}> · {nearestOrigin.address}</span>}
                                {nearestOrigin.bikes != null && (
                                    <span style={{ marginLeft: 6, color: nearestOrigin.bikes > 0 ? '#4ade80' : '#f87171' }}>
                                        <Byke size={14} color='currentColor' /> {nearestOrigin.bikes} disponibles
                                    </span>
                                )}
                            </div>
                        )}
                        {nearestDest && (
                            <div className="map-ecobici__row">
                                <span className="map-ecobici__label">Devolvé en: </span>
                                <strong>{nearestDest.name}</strong>
                                {nearestDest.address && <span style={{ opacity: 0.6 }}> · {nearestDest.address}</span>}
                                {nearestDest.docks != null && (
                                    <span style={{ marginLeft: 6, color: nearestDest.docks > 0 ? '#4ade80' : '#f87171' }}>
                                        {nearestDest.docks} lugares libres
                                    </span>
                                )}
                            </div>
                        )}
                        {!loadingEcobici && !nearestOrigin && !nearestDest && (
                            <span style={{ color: '#f87171' }}>No se encontraron estaciones EcoBici cercanas.</span>
                        )}
                    </div>
                )}

                {/* External nav links */}
                {destCoords && (
                    <div className="map-nav-links">
                        {wazeUrl && (
                            <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="map-nav-link map-nav-link--waze">
                                <Waze size={13} color="#60a5fa" /> Abrir en Waze
                            </a>
                        )}
                        {gmapsUrl && (
                            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="map-nav-link map-nav-link--gmaps">
                                <GoogleMaps size={13} color="#4ade80" /> Abrir en Google Maps
                            </a>
                        )}
                    </div>
                )}

                {/* Map */}
                <div ref={mapRef} className="map-leaflet" />
            </div>

            <style>{`.leaflet-container { background: #1a1a2e !important; }`}</style>
        </div>
    )
}