import { type SVGProps, useId } from "react";

type HalfCircleIconProps = {
    size?: string | number
    color?: string
    side?: "left" | "right"
} & SVGProps<SVGSVGElement>;

export default function HalfCircleIcon({
    size = 24,
    color = "currentColor",
    side = "left",
    ...rest
}: HalfCircleIconProps) {
    const clipId = useId();

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            stroke={color}
            {...rest}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect x={side === "left" ? 12 : 0} y="0" width="12" height="24" />
                </clipPath>
            </defs>

            <circle cx="12" cy="12" r="10" fill={color} clipPath={`url(#${clipId})`} />
            <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
}