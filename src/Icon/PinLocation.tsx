import { type SVGProps } from "react";

type HalfCircleIconProps = {
    size?: number;
    strokeColor?: string;
    fillColor?: string;
    side?: "left" | "right";
} & Omit<SVGProps<SVGSVGElement>, "color">;

export default function Archive({
    size = 24,
    strokeColor = "currentColor",
    fillColor = "none",
}: HalfCircleIconProps) {

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size}
            height={size}
            fill={fillColor}
            stroke={strokeColor}
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="6" r="4" />
            <path d="M5 16C3.7492 16.6327 3 17.4385 3 18.3158C3 20.3505 7.02944 22 12 22C16.9706 22 21 20.3505 21 18.3158C21 17.4385 20.2508 16.6327 19 16" />
            <path d="M12 10L12 18" />
        </svg>
    );
}