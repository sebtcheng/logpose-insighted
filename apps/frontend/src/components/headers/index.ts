import type { ReactElement } from "react";
import { AdminLogScene, SettingsScene } from "./AdminScenes";
import { KanoScene, OstScene, RaidScene, UsmScene } from "./DiscoveryScenes";
import { HistoryScene, HomeScene, ProjectsScene, WorkloadScene } from "./OverviewScenes";
import type { HeaderVariant } from "./types";

export type { HeaderVariant };

export const HEADER_SCENES: Record<HeaderVariant, () => ReactElement> = {
  home: HomeScene,
  usm: UsmScene,
  history: HistoryScene,
  ost: OstScene,
  workload: WorkloadScene,
  raid: RaidScene,
  projects: ProjectsScene,
  kano: KanoScene,
  settings: SettingsScene,
  adminLog: AdminLogScene,
};
