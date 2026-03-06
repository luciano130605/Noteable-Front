import { type SVGProps } from "react";

type HalfCircleIconProps = {
    size?: number | string;
    strokeColor?: string;
    fillColor?: string;
    side?: "left" | "right";
} & Omit<SVGProps<SVGSVGElement>, "color">;

export default function HalfCircleIcon({
    size = 14,

}: HalfCircleIconProps) {

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size}
            height={size} color="currentColor" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 15C5 11.134 8.13401 8 12 8C15.866 8 19 11.134 19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15Z" />
            <path d="M7.5 9.5V6.5C7.5 4.01472 9.51472 2 12 2C13.5602 2 14.935 2.79401 15.7422 4" />
            <path d="M12 15H12.009" />
        </svg>
    );
}


