"use client";

/**
 * Last-resort boundary for a failure in the root layout itself.
 *
 * It replaces the layout, so none of the site's CSS, fonts, theme class or
 * components are available (Next's docs: global-error renders its own
 * document). So everything is inline: the lattice from `app/error.tsx` as a
 * 3×3 grid with the last cell knocked loose, the paper/ink tokens for both OS
 * colour schemes, and a faint dot field. Kept deliberately compact — this
 * file ships with every route, and almost nobody will ever see it.
 */
const CSS = `:root{--b:#fbfbfa;--f:#16161a;--m:#66666e;--s:#97979f;--l:#d0d0ca;--a:#c4401f}
@media(prefers-color-scheme:dark){:root{--b:#0b0b0c;--f:#ededf0;--m:#9a9aa3;--s:#68686f;--l:#36363c;--a:#f07a52}}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;background:var(--b) radial-gradient(var(--l) 1px,transparent 1px) 0 0/18px 18px;color:var(--f);font-family:ui-sans-serif,system-ui,sans-serif}
.g{display:grid;grid-template-columns:repeat(3,36px);gap:10px;justify-content:center;margin-bottom:28px}
.g i{height:36px;border-radius:5px;display:grid;place-items:center}
.k{background:var(--f)}.j{background:var(--a)}.d:after{content:"";width:5px;height:5px;border-radius:9px;background:var(--s)}
.x{outline:1.5px dashed var(--s)}.x:after{content:"";width:36px;height:36px;border-radius:5px;background:var(--f);box-shadow:0 0 0 2.5px var(--a);transform:translate(8px,10px) rotate(11deg)}
h1{font:500 clamp(32px,6vw,48px)/1.08 ui-serif,Georgia,serif;letter-spacing:-.025em;margin:0 auto 14px;max-width:16ch;text-wrap:balance}
p{color:var(--m);line-height:1.6;max-width:44ch;margin:0 auto 26px}
.b{font:500 14px ui-sans-serif,system-ui,sans-serif;height:44px;padding:0 18px;border-radius:8px;display:inline-flex;align-items:center;margin:4px;cursor:pointer;border:0;text-decoration:none;background:var(--f);color:var(--b)}
.p{background:var(--b);color:var(--f);box-shadow:0 0 0 1px var(--l)}small{display:block;margin-top:28px;font:11px ui-monospace,monospace;color:var(--s)}`;

/** Cell classes in reading order: ink, dot, joint, fault (`x`). */
const GRID = ["k", "d", "d", "k", "d", "d", "j", "k", "x"];

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · Lattice</title>
        <style>{CSS}</style>
        <main>
          <div className="g" aria-hidden="true">
            {GRID.map((c, i) => (
              <i key={i} className={c} />
            ))}
          </div>
          <h1>The site failed to load.</h1>
          <p>
            Trying again usually fixes it. If it keeps happening, the whole index
            is also available as plain text.
          </p>
          <button type="button" className="b" onClick={() => retry()}>
            ↺ Try again
          </button>
          <a className="b p" href="/llms-full.txt">
            Read the plain-text index
          </a>
          {error.digest ? <small>Reference {error.digest}</small> : null}
        </main>
      </body>
    </html>
  );
}
