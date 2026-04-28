export const baseUrl = import.meta.env.BASE_URL || "/";

const trimLeadingSlash = (value: string) => value.replace(/^\/+/, "");

export const publicUrl = (path: string) => `${baseUrl}${trimLeadingSlash(path)}`;

export const imageUrl = (fileName: string) => publicUrl(`images/${encodeURIComponent(fileName)}`);

export const badgeUrl = (fileName: string) => publicUrl(`images/VisualizationBadges/${encodeURIComponent(fileName)}`);

export const dbUrl = (fileName: string) => publicUrl(`db/${encodeURIComponent(fileName)}`);
