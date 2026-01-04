import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

interface AdminButtonProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const AdminButton: React.FC<AdminButtonProps> = ({
  title,
  description,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-all ${
        disabled
          ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
          : "bg-white text-blue-900 hover:bg-yellow-50 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1"
      }`}
      style={{ fontFamily: "'Lato', sans-serif" }}
    >
      {disabled && (
        <div className="absolute top-2 right-2">
          <Lock size={20} className="text-gray-400" />
        </div>
      )}
      <h3
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        {title}
      </h3>
      <p className="text-sm text-blue-700">{description}</p>
    </button>
  );
};

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(`/admin/${path}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-6xl text-blue-900 mb-4"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            Admin Panel
          </h1>
          <p className="text-blue-700 text-lg" style={{ fontFamily: "'Lato', sans-serif" }}>
            Manage your website settings and content
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminButton
            title="Challenging Wednesday"
            description="Enable/disable the navigation button and configure event parameters"
            onClick={() => handleNavigate("challenging-wednesday")}
          />
          <AdminButton
            title="Meet The Team"
            description="Manage team members and information"
            onClick={() => {}}
            disabled={true}
          />
          <AdminButton
            title="Posters"
            description="Upload and manage event posters"
            onClick={() => {}}
            disabled={true}
          />
          <AdminButton
            title="Sponsors"
            description="Manage sponsor information and logos"
            onClick={() => {}}
            disabled={true}
          />
          <AdminButton
            title="D-Day"
            description="Create, edit, and delete challenges"
            onClick={() => handleNavigate("dday")}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

