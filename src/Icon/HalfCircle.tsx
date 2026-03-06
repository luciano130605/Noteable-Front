import { type SVGProps, useId } from "react";

type HalfCircleIconProps = {
    size?: number;
    strokeColor?: string;
    fillColor?: string;
    side?: "left" | "right";
} & Omit<SVGProps<SVGSVGElement>, "color">;

export default function HalfCircleIcon({
    size = 24,
    strokeColor = "currentColor",
    fillColor = "currentColor",
    side = "left",
    ...rest
}: HalfCircleIconProps) {
    const clipId = useId();

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...rest}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect
                        x={side === "left" ? 0 : 12}
                        y="0"
                        width="12"
                        height="24"
                    />
                </clipPath>
            </defs>

            {/* Mitad rellena */}
            <circle
                cx="12"
                cy="12"
                r="10"
                fill={fillColor}
                stroke="none"
                clipPath={`url(#${clipId})`}
            />

            {/* Contorno completo */}
            <circle cx="12" cy="12" r="10" fill="none" />
        </svg>
    );
}