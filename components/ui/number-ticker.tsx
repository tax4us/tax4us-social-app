"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, useTransform, motion } from "framer-motion";

interface NumberTickerProps {
    value: number;
    prefix?: string;
    suffix?: string;
    delay?: number;
    decimalPlaces?: number;
    className?: string;
}

export function NumberTicker({
    value,
    prefix = "",
    suffix = "",
    delay = 0,
    decimalPlaces = 0,
    className = "",
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });
    const displayValue = useTransform(springValue, (latest) =>
        Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
    );
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            const timeout = setTimeout(() => {
                motionValue.set(value);
            }, delay * 1000);
            return () => clearTimeout(timeout);
        }
    }, [motionValue, isInView, delay, value]);

    return (
        <span className={className}>
            {prefix}
            <motion.span ref={ref}>{displayValue}</motion.span>
            {suffix}
        </span>
    );
}
