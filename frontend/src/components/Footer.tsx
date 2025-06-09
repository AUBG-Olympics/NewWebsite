const Footer: React.FC = () => (
  <footer className="bg-[#005C69] text-white py-4 mt-10 shadow-inner">
    <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
      <span className="text-sm font-medium tracking-wide">
        © {new Date().getFullYear()} Olympics Website. All rights reserved.
      </span>
      <div className="flex gap-4 mt-2 md:mt-0">
        <a
          href="https://github.com/your-repo"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
        <a
          href="/privacy"
          className="hover:underline"
        >
          Privacy Policy
        </a>
        <a
          href="/terms"
          className="hover:underline"
        >
          Terms of Service
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
