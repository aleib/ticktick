import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";

const MORPH_TIME = 0.7; // seconds for morph animation
const COOLDOWN_TIME = 0.15; // seconds to hold after morph completes

/**
 * Hook that manages morphing animation for a single character.
 * Only animates when the value actually changes.
 * Adapted from Magic UI's MorphingText.
 */
const useMorphingDigit = (value: string) => {
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());
  const currentValueRef = useRef(value);
  const targetValueRef = useRef(value);
  const isMorphingRef = useRef(false);

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback((fraction: number) => {
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (!current1 || !current2) return;

    // text2 fades in (the new value)
    current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

    // text1 fades out (the old value)
    const invertedFraction = 1 - fraction;
    current1.style.filter = `blur(${Math.min(
      8 / invertedFraction - 8,
      100
    )}px)`;
    current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

    current1.textContent = currentValueRef.current;
    current2.textContent = targetValueRef.current;
  }, []);

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / MORPH_TIME;

    if (fraction > 1) {
      cooldownRef.current = COOLDOWN_TIME;
      fraction = 1;
    }

    setStyles(fraction);

    // Animation complete - swap values
    if (fraction === 1) {
      currentValueRef.current = targetValueRef.current;
      isMorphingRef.current = false;
    }
  }, [setStyles]);

  const setStableState = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
      current2.textContent = currentValueRef.current;
    }
  }, []);

  // Detect value changes and start morph
  useEffect(() => {
    if (value !== currentValueRef.current && value !== targetValueRef.current) {
      targetValueRef.current = value;
      morphRef.current = 0;
      cooldownRef.current = 0;
      isMorphingRef.current = true;
    }
  }, [value]);

  // Animation loop
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      // Only animate if morphing is active
      if (isMorphingRef.current) {
        morphRef.current += dt;
        cooldownRef.current -= dt;

        if (cooldownRef.current <= 0) {
          doMorph();
        }
      } else {
        setStableState();
      }
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, setStableState]);

  return { text1Ref, text2Ref };
};

type MorphingDigitProps = {
  value: string;
  className?: string;
};

/**
 * A single character that morphs smoothly when its value changes.
 * Uses the Magic UI blur/threshold effect.
 */
const MorphingDigit = ({ value, className }: MorphingDigitProps) => {
  const { text1Ref, text2Ref } = useMorphingDigit(value);

  return (
    <span
      className={cn(
        "relative inline-flex justify-center [filter:url(#threshold)_blur(0.6px)]",
        className
      )}
      style={{ width: "1ch" }}
    >
      <span
        ref={text1Ref}
        className="absolute inset-0 flex justify-center"
        aria-hidden="true"
      />
      <span ref={text2Ref} className="flex justify-center" />
    </span>
  );
};

/**
 * SVG filter for the liquid morph threshold effect.
 * Only needs to be included once in the DOM.
 */
const SvgFilters = () => (
  <svg
    id="morphing-filters"
    className="fixed h-0 w-0"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
);

type MorphingTimeProps = {
  time: string;
  className?: string;
};

/**
 * Renders a time string with per-digit morphing animation.
 * Only digits that change will animate - static digits remain stable.
 */
export const MorphingTime = ({ time, className }: MorphingTimeProps) => {
  return (
    <>
      <SvgFilters />
      <span className={cn("inline-flex", className)}>
        {time.split("").map((char, index) =>
          char === ":" ? (
            <span
              key={`sep-${index}`}
              className="inline-flex justify-center"
              style={{ width: "0.6ch" }}
            >
              :
            </span>
          ) : (
            <MorphingDigit key={`pos-${index}`} value={char} />
          )
        )}
      </span>
    </>
  );
};
