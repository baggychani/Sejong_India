const shapes = {
  map: <><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2z"/><path d="M9 3v15m6-12v15"/></>,
  study: <><path d="M12 6C9 4 6 4 3 4v14c3 0 6 0 9 2 3-2 6-2 9-2V4c-3 0-6 0-9 2Zm0 0v14"/></>,
  lessons: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/></>,
  library: <><rect x="3" y="4" width="4" height="16" rx="1"/><path d="M10 4v16m3-15 4-1 4 15-4 1z"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></>,
  arrow: <path d="m9 6 6 6-6 6"/>,
  back: <path d="m11 5-7 7 7 7M4 12h16"/>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></>,
};

export function Icon({ name }: { name: keyof typeof shapes }) {
  return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
