const paths = {
  location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  experience: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v6c4 3 8 3 12 0v-6M21 9v7" /></>,
  format: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  language: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  music: <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
  fitness: <><path d="M7 12h10M3 8v8M7 6v12M17 6v12M21 8v8M3 12h4M17 12h4" /></>,
  skill: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20" /></>,
  edit: <><path d="m15 5 4 4M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15v5Z" /></>,
  remove: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v3" /></>,
  book: <><path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z" /><path d="M5 8h4M15 8h4M5 12h4M15 12h4" /></>,
  palette: <><path d="M21 12a9 9 0 1 0-9 9h2a2 2 0 0 0 2-2c0-1-2-2-1-3 1-2 6 0 6-4Z" /><circle cx="7" cy="9" r="1" /><circle cx="11" cy="6" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="6" cy="14" r="1" /></>,
  car: <><path d="m5 10 2-6h10l2 6M3 10h18v9H3v-9ZM5 19v2M19 19v2M6 14h2M16 14h2" /></>,
  beauty: <><ellipse cx="9" cy="8" rx="5" ry="6" /><path d="M7 14v6a2 2 0 0 0 4 0v-6M18 3v7M15 6.5h6M18 15v5M15.5 17.5h5" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V3h8v4M3 12c5 3 13 3 18 0M10 12h4v4h-4z" /></>,
  cooking: <><path d="M3 12h18c0 6-3 9-9 9s-9-3-9-9ZM8 21h8M14 11l6-8M18 3c-3 0-6 5-5 7 3 1 7-3 7-5 0-1-1-2-2-2Z" /></>,
  scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8.5 7.5 12 13m-12-4 12-13M12 12l-2-2" /></>,
  sprout: <><path d="M12 22v-8M12 14C4 14 2 9 3 4c7 0 10 4 9 10ZM12 17c0-8 4-12 10-12 0 7-4 11-10 12Z" /></>,
  hammer: <><path d="m13 11-9 9-3-3 9-9M9 3l4-2 9 8-4 4-5-5-2 2-4-4 2-3Z" /></>,
  conversation: <><path d="M3 3h14v10H8l-5 4V3ZM17 8h4v13l-5-4h-5v-4M6 7h8M6 10h5" /></>,
  paw: <><ellipse cx="5" cy="8" rx="2" ry="3" /><ellipse cx="10" cy="5" rx="2" ry="3" /><ellipse cx="16" cy="5" rx="2" ry="3" /><ellipse cx="21" cy="9" rx="2" ry="3" /><path d="M7 21c-4-1-2-5 0-7 3-4 6-4 9 0 2 2 4 6 0 7-3 0-3-2-5-1-1 0-2 1-4 1Z" /></>,
  camera: <><path d="M3 6h4l2-3h6l2 3h4v15H3V6Z" /><circle cx="12" cy="13" r="4" /><path d="M18 9h1" /></>,
  laptop: <><rect x="4" y="3" width="16" height="13" rx="1" /><path d="M4 16 1 21h22l-3-5M9 18h6" /></>,
  sparkles: <><path d="m10 2 2.5 6.5L19 11l-6.5 2.5L10 20l-2.5-6.5L1 11l6.5-2.5L10 2ZM20 2v4M18 4h4M20 17v5M17.5 19.5h5" /></>,
}

export default function CommunityIcon({ name }) {
  if (name === 'hybrid') return <span className="format-combination" aria-hidden="true"><CommunityIcon name="format" /><CommunityIcon name="people" /></span>
  return <svg className="community-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.skill}</svg>
}
