import { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import type { Theme } from "../../supabase/Supabase";

interface ThemeButtonProps {
    value: Theme
    onChange: (v: Theme) => void
}

const ThemeButton = ({ value, onChange }: ThemeButtonProps) => {
    const isDark = value === 'dark'
    const [isAnimating, setIsAnimating] = useState(false)

    const handleClick = () => {
        if (isAnimating) return
        setIsAnimating(true)
        onChange(isDark ? 'light' : 'dark')
        setTimeout(() => setIsAnimating(false), 700)
    }

    return (
        <MotionConfig transition={{ type: "spring", duration: 0.7, bounce: 0 }}>
            <motion.button
                layout
                onClick={handleClick}
                className="hdr-menu__item"
                style={{ width: '100%', overflow: 'hidden' }}
            >
                <motion.div layout>
                    <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20" height="20"
                        viewBox="0 0 100 100"
                        fill="none"
                        className="hdr-menu__item-icon"
                        initial={false}
                        animate={{ rotate: isDark ? 180 : 0 }}
                    >
                        <motion.path
                            d="M50 18C58.4869 18 66.6262 21.3714 72.6274 27.3726C78.6286 33.3737 82 41.513 82 50C82 58.4869 78.6286 66.6262 72.6275 72.6274C66.6263 78.6286 58.487 82 50.0001 82L50 50L50 18Z"
                            initial={false}
                            animate={{ fill: isDark ? '#f8fafc' : 'currentColor' }}
                        />
                        <motion.circle cx="50" cy="50" r="30" strokeWidth="4"
                            initial={false}
                            animate={{ stroke: isDark ? '#f8fafc' : 'currentColor' }}
                        />
                        <motion.circle cx="50" cy="50" r="12"
                            initial={false}
                            animate={{ fill: isDark ? '#f8fafc' : 'currentColor' }}
                        />
                        <motion.path
                            d="M50 62C53.1826 62 56.2348 60.7357 58.4853 58.4853C60.7357 56.2348 62 53.1826 62 50C62 46.8174 60.7357 43.7652 58.4853 41.5147C56.2348 39.2643 53.1826 38 50 38L50 50L50 62Z"
                            initial={false}
                            animate={{ fill: isDark ? 'currentColor' : '#94a3b8' }}
                        />
                    </motion.svg>
                </motion.div>

                <span className="hdr-menu__item-label">Tema</span>

                <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                        key={isDark ? "Oscuro" : "Claro"}
                        className="hdr-menu__item-value2"
                        initial={{ opacity: 0, y: -48 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 48 }}
                        style={{ minWidth: 38 }}
                    >
                        {isDark ? "Oscuro" : "Claro"}
                    </motion.span>
                </AnimatePresence>
            </motion.button>
        </MotionConfig>
    )
}

export default ThemeButton