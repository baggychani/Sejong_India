const shapes = {
  map: <><circle cx="12" cy="12" r="9.6"/>{Array.from({ length: 24 }, (_, i) => <path key={i} d="M12 3v7.5" transform={`rotate(${i * 15} 12 12)`} strokeWidth=".65"/>)}<circle cx="12" cy="12" r="1.6" fill="currentColor"/></>,
  hindi: <><path d="M3 6h18"/><path d="M8 6v4.5c-2.6 0-4 1.4-4 3.3S5.6 17 8 15.6M8 10.5c2 0 3 1 3 2.6M16 6v14m0-7h-3"/></>,
  study: <><path d="M13 13H8l-4 3v-3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2Z"/><path d="M18 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2v3l-4-3h-5a2 2 0 0 1-2-2"/><path d="M6 8h5"/></>,
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
