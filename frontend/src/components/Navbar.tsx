import React from "react";
import { Link, NavLink } from "react-router-dom";
import { X, Menu } from "lucide-react";
import FlameButton from "./DDayButton";

const navLinkClass = (isActive?: boolean) =>
  `relative after:block after:h-[2px] after:bg-blue-500 after:transition-all after:duration-300 after:ease-in-out ${
    isActive ? "after:w-full font-semibold" : "after:w-0 hover:after:w-full"
  }`;

const Navbar: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  // Close the mobile menu on route change (optional safety if parent updates)
  React.useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <nav className="bg-white text-white shadow-md sticky top-0 z-50">
      <div className="py-3 flex flex-row items-center justify-between border-4 border-[#e3772c] shadow-lg w-full px-6">
        {/* Left: Logo + Links (desktop) */}
        <div className="flex flex-row items-center gap-6">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-bold tracking-wide w-32 h-12 flex items-center justify-center"
            style={{
              backgroundImage: "url('/assets/logo.png')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              color: "black",
            }}
            aria-label="AUBG Olympics Home"
          />

          {/* Desktop links (unchanged) */}
          <ul className="hidden md:flex gap-6 items-center">
            <li>
              <NavLink to="/team" className={({ isActive }) => navLinkClass(isActive)}>
                Meet the team
              </NavLink>
            </li>
            <li>
              <NavLink to="/sponsors" className={({ isActive }) => navLinkClass(isActive)}>
                Sponsors
              </NavLink>
            </li>
            <li>
              {/* External link with same hover animation */}
              <a
                href="https://example.com/challenging-wednesday"
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass(false)}
              >
                Challenging Wednesday
              </a>
            </li>
          </ul>
        </div>

        {/* Right: DDAY button (desktop unchanged) */}
        <div className="hidden md:block">
          <FlameButton
            className="relative"
            animationPath="https://lottie.host/f730669c-cc04-4845-ae9c-33256dd4c101/tfcOC1ofYf.lottie"
            flameScale={2}
          >
            DDAY
          </FlameButton>
        </div>

        {/* Mobile hamburger (only on < md) */}
        <button
          type="button"
          className="md:hidden inline-flex items-center text-white bg-blue-500 justify-center rounded-md p-2 ring-1 ring-blue-500/10 text-black hover:bg-blue-500/5"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile panel */}
      <div
        className={`md:hidden overflow-hidden border-x-4 border-b-4 border-[#e3772c] shadow-lg transition-[max-height,opacity] duration-300 ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white px-6 pt-2 pb-4">
          <ul className="flex flex-col gap-4 py-2">
            <li>
              <NavLink
                to="/team"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${navLinkClass(isActive)} inline-block text-blue-500`
                }
              >
                Meet the team
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/sponsors"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${navLinkClass(isActive)} inline-block text-blue-500`
                }
              >
                Sponsors
              </NavLink>
            </li>
            <li>
              <a
                href="https://example.com/challenging-wednesday"
                target="_blank"
                rel="noopener noreferrer"
                className={`${navLinkClass(false)} inline-block text-blue-500`}
                onClick={() => setOpen(false)}
              >
                Challenging Wednesday
              </a>
            </li>
          </ul>

          {/* Mobile DDAY button */}
          <div className="pt-2">
            <FlameButton
              className="relative w-full justify-center"
              animationPath="https://lottie.host/f730669c-cc04-4845-ae9c-33256dd4c101/tfcOC1ofYf.lottie"
              flameScale={2}
            >
              DDAY
            </FlameButton>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
