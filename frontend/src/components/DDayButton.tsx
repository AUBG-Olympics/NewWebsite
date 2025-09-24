import React from "react";
import { DotLottieReact, type Data } from "@lottiefiles/dotlottie-react";

type FlameButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Lottie JSON object (imported) */
  animationData?: object;
  /** Or a URL/path to a .lottie or .json file */
  animationPath?: string;
  /** How much the flames extend around the button (inset padding) */
  flameInset?: number; // px, default 16
  /** Flame scale relative to the overlay box */
  flameScale?: number; // 1 = fit, 1.3 = spill out
  /** Show flames only on hover (default) or always */
  hoverOnly?: boolean; // default true
};

const FlameButton: React.FC<FlameButtonProps> = ({
  children,
  className = "",
  animationData,
  animationPath,
  flameScale = 1.3,
  hoverOnly = true,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const [hovered, setHovered] = React.useState(false);

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setHovered(true);
    onMouseEnter?.(e);
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setHovered(false);
    onMouseLeave?.(e);
  };

  // Decide when to show/play
  const showFlames = hoverOnly ? hovered : true;
  // Force re-mount when we switch to "play" so autoplay always kicks in
  const lottieKey = showFlames ? "flame-play" : "flame-idle";

  return (
    <button
      {...rest}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group relative overflow-visible px-6 py-3 rounded-xl font-semibold
                  bg-orange-500 text-white shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-yellow-400
                  transition-transform duration-150 hover:-translate-y-[1px]
                  ${className}`}
    >
      {/* Label layer */}
      <span className="relative z-20 inline-flex items-center gap-2">
        {children}
      </span>

      {/* Flame overlay */}
<div
  className="pointer-events-none absolute z-20 transition-opacity duration-150 overflow-hidden rounded-xl"
  style={{
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: showFlames ? 1 : 0,
    mixBlendMode: "screen",
    filter: "saturate(120%)",
  }}
  aria-hidden
>
  <div
    className="absolute inset-0 overflow-hidden rounded-xl"
    style={{
      transform: `scale(${flameScale})`,
      transformOrigin: "bottom",
    }}
  >
    <DotLottieReact
      key={lottieKey}
      src={animationPath}
      data={animationData as Data}
      autoplay={showFlames}
      loop={showFlames}
      style={{ width: "100%", height: "100%"}}
    />
  </div>
</div>

    </button>
  );
};

export default FlameButton;
