import { useEffect, useState } from "react";

export function Preloader() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHide(true), 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div id="preloader" className={hide ? "hide" : ""}>
      <div className="preloader-inner">
        <span className="mono">Л</span>
        <span className="mono-amp">&amp;</span>
        <span className="mono">М</span>
        <div className="preloader-line" />
      </div>
    </div>
  );
}
