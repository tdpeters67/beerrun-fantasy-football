// An Aero "window" panel: glossy title bar with caption + fake window controls,
// over a frosted-glass body. Pure component — usable from server or client.
export function Panel({ title, icon = "🪟", children, bodyStyle }) {
  return (
    <section className="win">
      <div className="win-bar">
        <span className="win-ico">{icon}</span>
        <span className="win-cap">{title}</span>
        <span className="win-btns" aria-hidden="true"><i /><i /><i className="close" /></span>
      </div>
      <div className="win-body" style={bodyStyle}>{children}</div>
    </section>
  );
}
