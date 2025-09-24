import { Link, NavLink } from "react-router-dom";
import FlameButton from "./DDayButton";

const navLinkClass = (isActive?: boolean) =>
  `relative after:block after:h-[2px] after:bg-blue-500 after:transition-all after:duration-300 after:ease-in-out ${
    isActive ? "after:w-full font-semibold" : "after:w-0 hover:after:w-full"
  }`;

const Navbar: React.FC = () => (
  <nav className="bg-white text-white shadow-md sticky top-0 z-50">
    <div className="py-3 flex flex-row items-center justify-between border-4 border-[#e3772c] shadow-lg w-full px-6">
      {/* Left side: Logo + Links */}
      <div className="flex flex-row items-center gap-6">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="text-2xl font-bold tracking-wide w-32 h-12 flex items-center justify-center"
          style={{
            backgroundImage: "url('/assets/logo.png')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            color: "black",
          }}
        ></Link>

        {/* Links */}
        <ul className="flex gap-6 items-center">
          <li>
            <NavLink
              to="/team"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Meet the team
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/sponsors"
              className={({ isActive }) => navLinkClass(isActive)}
            >
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

      {/* Right side: Flame button */}
      <FlameButton
        className="relative"
        animationPath="https://lottie.host/f730669c-cc04-4845-ae9c-33256dd4c101/tfcOC1ofYf.lottie"
        flameScale={2}
      >
        DDAY
      </FlameButton>
    </div>
  </nav>
);

export default Navbar;
