import React from "react";
import { DotLottieReact, type Data } from "@lottiefiles/dotlottie-react";

type FlameButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Lottie JSON object (imported) */
  animationData?: object;
  /** Or a URL/path to a .lottie or .json file */
  animationPath?: string;
  /** Flame scale relative to the flame box */
  flameScale?: number;
  /** Show flames only on hover (default) or always */
  hoverOnly?: boolean;
};

const FlameButton: React.FC<FlameButtonProps> = ({
  children,
  className = "",
  animationData,
  animationPath,
  flameScale = 2,
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

  const showFlames = hoverOnly ? hovered : true;
  const lottieKey = showFlames ? "flame-play" : "flame-idle";

  return (
    <button
      {...rest}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group relative isolate overflow-hidden rounded-xl px-6 py-3 font-semibold
                  bg-orange-500 text-white shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-yellow-400
                  transition-transform duration-150 hover:-translate-y-[1px]
                  ${className}`}
    >
      {/* Flames: full-button coverage behind label (clipped to rounded-xl) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-150"
        style={{ opacity: showFlames ? 1 : 0 }}
        aria-hidden
      >
        <div
          className="absolute inset-0 h-full w-full origin-center"
          style={{
            transform: `translateY(-40%) scale(${flameScale})`,
            mixBlendMode: "screen",
            filter: "saturate(125%)",
          }}
        >
          <DotLottieReact
            key={lottieKey}
            src={animationPath}
            data={animationData as Data}
            autoplay={showFlames}
            loop={showFlames}
            style={{
              width: "100%",
              height: "100%",
              minWidth: "100%",
              minHeight: "100%",
              display: "block",
              objectFit: "cover",
              objectPosition: "center center",
            }}
          />
        </div>
      </div>

      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
};

export default FlameButton;
