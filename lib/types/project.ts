export type ProjectSettings = {
  id: string;
  appName: string;
  appDescription: string;
  targetAudience: string;
  marketingAngle: string;
  defaultCta: string;
  contentStyle: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSettingsInput = Pick<
  ProjectSettings,
  | "appName"
  | "appDescription"
  | "targetAudience"
  | "marketingAngle"
  | "defaultCta"
  | "contentStyle"
>;

