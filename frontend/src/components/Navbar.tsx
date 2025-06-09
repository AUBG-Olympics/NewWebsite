import { Link, NavLink } from "react-router-dom";

const Navbar: React.FC = () => (
  <nav className="bg-[#005C69] text-white shadow-md">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      {/* Logo/Brand */}
      <Link to="/" className="text-2xl font-bold tracking-wide">
        Olympics
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
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? "underline underline-offset-4 font-semibold" : "hover:underline"
            }
          >
            About
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? "underline underline-offset-4 font-semibold" : "hover:underline"
            }
          >
            Contact
          </NavLink>
        </li>
      </ul>
    </div>
  </nav>
);

export default Navbar;
