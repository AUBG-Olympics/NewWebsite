import React from "react";
import { Mail, Instagram, Facebook } from "lucide-react";
import { useLocation } from "react-router-dom";

// TikTok brand icon as inline SVG (since lucide-react doesn't include it yet)
const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="currentColor"
    className="transition-colors"
  >
    <path d="M41,15.09A12.84,12.84,0,0,1,34,13.11a13,13,0,0,1-2-1.25V30.44a10.8,10.8,0,1,1-9.37-10.7V24.7a6.31,6.31,0,1,0,4.59,6.07V2H33.21a8.48,8.48,0,0,0,.14,1.64,8.63,8.63,0,0,0,7.62,6.82Z" />
  </svg>
);

const Footer: React.FC = () => {
  const location = useLocation();

  // Check current path
  const isSponsorsPage = location.pathname === "/sponsors";

  const bgColor = isSponsorsPage ? "bg-black" : "bg-blue-600";
  const textColor = isSponsorsPage ? "text-blue-400" : "text-white";
  const hoverText = isSponsorsPage ? "hover:text-blue-200" : "hover:text-gray-200";

  return (
    <footer
      className={`${bgColor} ${textColor} py-8 shadow-inner transition-colors duration-300`}
    >
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 gap-6">
        {/* Left side: copyright */}
        <span className="text-sm">
          © {new Date().getFullYear()} Olympics Website. All rights reserved.
        </span>

        {/* Right side: social/contact links */}
        <div className="flex gap-6">
          <a
            href="mailto:aubgolympicscommittee@gmail.com"
            className={`flex items-center gap-2 ${hoverText} ${textColor} transition`}
          >
            <Mail size={18} /> <span className="hidden sm:inline">Email</span>
          </a>
          <a
            href="https://www.instagram.com/aubg_olympics"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 hover:text-pink-500 ${textColor} transition`}
          >
            <Instagram size={18} /> <span className="hidden sm:inline">Instagram</span>
          </a>
          <a
            href="https://www.tiktok.com/@aubgolympics"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 hover:text-[#FE2C55] ${textColor} transition`}
          >
            <TikTokIcon size={18} /> <span className="hidden sm:inline">TikTok</span>
          </a>
          <a
            href="https://www.facebook.com/AUBGOlympics/?locale=bg_BG"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 hover:text-blue-900 ${textColor} transition`}
          >
            <Facebook size={18} /> <span className="hidden sm:inline">Facebook</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
