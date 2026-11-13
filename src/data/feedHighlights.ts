export type OfficialAnnouncement = {
  id: string;
  title: string;
  body: string;
  /** ISO date or timestamp, displayed in the viewer's locale. */
  publishedAt: string;
};

// Curated content is supplied by the team; community posts are never treated as official.
// Entries with mock IDs and titles are sample announcements for layout previews.
export const featuredProjectIds: string[] = ["3db46c6c-b342-48d7-b214-3d19467eeaba"];
export const officialAnnouncements: OfficialAnnouncement[] = [
  {
    id: "codecanvas-public-launch-2026",
    title: "CodeCanvas goes public on November 18!",
    body: "CodeCanvas opens to everyone on November 18, 2026. Discover community projects, share your own creations, and connect with fellow builders. We look forward to seeing what you create!",
    publishedAt: "2026-11-13",
  },
];
