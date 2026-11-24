import type { ReactNode } from "react";
import { HEADER_SCENES, type HeaderVariant } from "./headers";

export type { HeaderVariant };

/**
 * Per-page LogPose header banner (docs/LogPose Header Art.pdf).
 * Each variant renders its dedicated inline SVG scene, color palette, and display typeface.
 */
export function AnimeHero({
  title,
  subtitle,
  tag = "HOME PORT",
  variant = "home",
  rightSlot,
}: {
  title: string;
  subtitle?: ReactNode;
  tag?: string;
  variant?: HeaderVariant;
  rightSlot?: ReactNode;
}) {
  const Scene = HEADER_SCENES[variant];

  return (
    <div className="lp-hero" data-variant={variant}>
      <Scene />
      <div className="lp-hero__scrim" aria-hidden="true" />
      <div className="lp-hero__content">
        <span className="lp-hero__tag">{tag}</span>
        <h1 className="lp-hero__title">{title}</h1>
        {subtitle ? <div className="lp-hero__subtitle">{subtitle}</div> : null}
      </div>
      {rightSlot ? <div className="lp-hero__actions">{rightSlot}</div> : null}
    </div>
  );
}
