import { useState } from "react"
import './Onboarding.css'

interface Step {
    icon: string
    iconBg: string
    iconBorder: string
    title: string
    desc: string
    tip: string
    visual?: string | null
}

interface OnboardingProps {
    onFinish: () => void
}

const steps: Step[] = [
    {
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke-width="1.5" stroke-linecap="round">
    
    <path 
        d="M12 20.9462L11.0477 21.2055C8.35403 21.939 7.00722 22.3057 5.94619 21.6832C4.88517 21.0607 4.52429 19.692 3.80253 16.9546L2.78182 13.0833C2.06006 10.3459 1.69918 8.97718 2.31177 7.89892C2.84167 6.96619 4 7.00015 5.5 7.00003"
        stroke="#e8e8f4"
    />

    <path 
        d="M12.8809 7.01656L17.6538 8.28825M11.8578 10.8134L14.2442 11.4492M11.9765 17.9664L12.9311 18.2208C15.631 18.9401 16.981 19.2998 18.0445 18.6893C19.108 18.0787 19.4698 16.7363 20.1932 14.0516L21.2163 10.2548C21.9398 7.57005 22.3015 6.22768 21.6875 5.17016C21.0735 4.11264 19.7235 3.75295 17.0235 3.03358L16.0689 2.77924C13.369 2.05986 12.019 1.70018 10.9555 2.31074C9.89196 2.9213 9.53023 4.26367 8.80678 6.94841L7.78366 10.7452C7.0602 13.4299 6.69848 14.7723 7.3125 15.8298C7.92652 16.8874 9.27651 17.2471 11.9765 17.9664Z"
        stroke="#6366f1"
    />

</svg>`,
        iconBg: "rgba(99,102,241,0.1)",
        iconBorder: "rgba(99,102,241,0.2)",
        title: "Bienvenido a Noteable",
        desc: `Tu organizador académico personal. Acá podés seguir el progreso de toda tu carrera: materias, notas, finales y mucho más.<br><br>Este tutorial te guía por las funciones principales en menos de 2 minutos.`,
        tip: "Podés cerrar este tutorial cuando quieras y volver a verlo desde el menú.",
        visual: null
    },
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#10b981">
<g clip-path="url(#clip0_4418_7041)">
<path d="M12.0101 16.9993C11.1601 16.9993 10.3001 16.7793 9.63007 16.3493L3.61007 12.4193C2.49007 11.6893 1.82007 10.4593 1.82007 9.1193C1.82007 7.7793 2.49007 6.5493 3.61007 5.8193L9.64007 1.8993C10.9801 1.0293 13.0701 1.0293 14.4001 1.9093L20.3901 5.8393C21.5001 6.5693 22.1701 7.7993 22.1701 9.1293C22.1701 10.4593 21.5001 11.6893 20.3901 12.4193L14.4001 16.3493C13.7301 16.7893 12.8701 16.9993 12.0101 16.9993ZM12.0101 2.7493C11.4401 2.7493 10.8701 2.8793 10.4601 3.1593L4.44007 7.0793C3.74007 7.5393 3.33007 8.2793 3.33007 9.1193C3.33007 9.9593 3.73007 10.6993 4.44007 11.1593L10.4601 15.0893C11.2901 15.6293 12.7501 15.6293 13.5801 15.0893L19.5701 11.1593C20.2701 10.6993 20.6701 9.9593 20.6701 9.1193C20.6701 8.2793 20.2701 7.5393 19.5701 7.0793L13.5801 3.1493C13.1601 2.8893 12.5901 2.7493 12.0101 2.7493Z" fill="white" style="fill: var(--fillg);"/>
<path d="M11.9999 22.7501C11.5599 22.7501 11.1099 22.6901 10.7499 22.5701L7.55994 21.5101C6.04994 21.0101 4.85994 19.3601 4.86994 17.7701L4.87994 13.0801C4.87994 12.6701 5.21994 12.3301 5.62994 12.3301C6.03994 12.3301 6.37994 12.6701 6.37994 13.0801L6.36994 17.7701C6.36994 18.7101 7.14994 19.7901 8.03994 20.0901L11.2299 21.1501C11.6299 21.2801 12.3699 21.2801 12.7699 21.1501L15.9599 20.0901C16.8499 19.7901 17.6299 18.7101 17.6299 17.7801V13.1401C17.6299 12.7301 17.9699 12.3901 18.3799 12.3901C18.7899 12.3901 19.1299 12.7301 19.1299 13.1401V17.7801C19.1299 19.3701 17.9499 21.0101 16.4399 21.5201L13.2499 22.5801C12.8899 22.6901 12.4399 22.7501 11.9999 22.7501Z" fill="white" style="fill: var(--fillg);"/>
<path d="M21.3999 15.75C20.9899 15.75 20.6499 15.41 20.6499 15V9C20.6499 8.59 20.9899 8.25 21.3999 8.25C21.8099 8.25 22.1499 8.59 22.1499 9V15C22.1499 15.41 21.8099 15.75 21.3999 15.75Z" fill="white" style="fill: var(--fillg);"/>
</g>
<defs>
<clipPath id="clip0_4418_7041">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`,
        iconBg: "rgba(16,185,129,0.1)",
        iconBorder: "rgba(16,185,129,0.2)",
        title: "Creá tu carrera y materias",
        desc: `Primero creá una <strong>carrera</strong> desde el menú (arriba a la derecha). Después usá el botón <strong>+</strong> para agregar tus materias, o importalas directamente desde el SIU.`,
        tip: "Podés tener múltiples carreras y cambiar entre ellas desde el menú.",

    },
    {
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        iconBg: "rgba(245,158,11,0.1)",
        iconBorder: "rgba(245,158,11,0.2)",
        title: "Estados de las materias",
        desc: `Cada materia tiene un <strong>estado</strong> que refleja tu situación real. Podés cambiarlo con un click. Noteable calcula tu progreso automáticamente.`,
        tip: "Hacé click en el estado de una materia para ciclarlo rápidamente.",

    },
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_9971)">
<path d="M8 2V5" stroke="#f472b6" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
<path d="M16 2V5" stroke="#f472b6" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
<path d="M3.5 9.08984H20.5" stroke="#f472b6" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
<path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="#f472b6" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
s
<path d="M15.6947 16.6992H15.7037" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M11.9955 13.6992H12.0045" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M11.9955 16.6992H12.0045" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M8.29431 13.6992H8.30329" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M8.29431 16.6992H8.30329" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_9971">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`,
        iconBg: "rgba(244,114,182,0.1)",
        iconBorder: "rgba(244,114,182,0.2)",
        title: "Calendario y finales",
        desc: `Abrí el <strong>Calendario</strong> desde el menú para registrar fechas de finales y parciales. Noteable te avisa cuando se acercan y los muestra en la barra lateral.`,
        tip: "También podés importar materias desde el SIU con el historial de notas ya cargado.",

    }
]

export default function Onboarding({ onFinish }: OnboardingProps) {
    const [current, setCurrent] = useState(0)
    const [direction, setDirection] = useState<'next' | 'prev'>('next')
    const [animating, setAnimating] = useState(false)

    function navigate(to: number) {
        if (animating) return
        setDirection(to > current ? 'next' : 'prev')
        setAnimating(true)
        setTimeout(() => {
            setCurrent(to)
            setAnimating(false)
        }, 180)
    }

    function next() {
        if (current < steps.length - 1) navigate(current + 1)
        else onFinish()
    }

    function prev() {
        if (current > 0) navigate(current - 1)
    }

    const step = steps[current]

    return (
        <div className="ob-wrap">
            <div className="ob-progress">
                {steps.map((_, i) => {
                    let cls = ""
                    if (i < current) cls = "done"
                    else if (i === current) cls = "active"
                    return (
                        <button
                            key={i}
                            className={`ob-pip ${cls}`}
                            onClick={() => navigate(i)}
                            aria-label={`Paso ${i + 1}`}
                        />
                    )
                })}
            </div>

            <div className={`ob-card ${animating ? `ob-card--exit-${direction}` : 'ob-card--enter'}`}>
                <div
                    className="ob-icon"
                    style={{ background: step.iconBg, borderColor: step.iconBorder }}
                    dangerouslySetInnerHTML={{ __html: step.icon }}
                />

                <div className="ob-step-num">Paso {current + 1} de {steps.length}</div>
                <div className="ob-title">{step.title}</div>
                <div className="ob-desc" dangerouslySetInnerHTML={{ __html: step.desc }} />

                {step.visual && (
                    <div className="ob-visual" dangerouslySetInnerHTML={{ __html: step.visual }} />
                )}

                <div className="ob-tip">
                    <div className="ob-tip-dot" />
                    <div className="ob-tip-text">{step.tip}</div>
                </div>

                <div className="ob-footer">
                    <button className="ob-skip" onClick={onFinish}>
                        Saltear tutorial
                    </button>
                    <div style={{ display: "flex", gap: 10 }}>
                        {current > 0 && (
                            <button className="btn" onClick={prev}>Anterior</button>
                        )}
                        <button className="btn btn--primary" onClick={next}>
                            {current === steps.length - 1 ? "¡Empezar!" : "Siguiente"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}