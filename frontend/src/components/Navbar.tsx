import { Link, NavLink } from "react-router-dom";

const Navbar: React.FC = () => (
  <nav className="bg-white text-white shadow-md sticky top-0 z-50">
    <div className="py-3 flex flex-row items-center justify-center border-4 border-[#e3772c] shadow-lg">
      {/* Logo/Brand */}
      <Link to="/" className="text-2xl font-bold tracking-wide w-32 h-12 flex items-center justify-center"
      style={{ backgroundImage: "url('/assets/logo.png')", backgroundSize: "contain", backgroundRepeat: "no-repeat", color: "black" }}>
      </Link>
      {/* Links */}
      <ul className="flex gap-6 items-center">
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "underline underline-offset-4 font-semibold" : "hover:underline"
            }
          >
            Meet the team
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? "underline underline-offset-4 font-semibold" : "hover:underline"
            }
          >
            Sponsors
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? "underline underline-offset-4 font-semibold" : "hover:underline"
            }
          >
            D-Day
          </NavLink>
        </li>
      </ul>
    </div>
  </nav>
);

export default Navbar;
