import React from "react";

// Este componente dibuja las tarjetas azules del Dashboard
export default function StatCard({
  title,
  count,
  icon,
  color = "bg-blue-500",
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-shadow">
      {/* Icono con fondo de color */}
      <div
        className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20`}
      >
        {icon}
      </div>

      {/* Información */}
      <div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-800">{count}</p>
      </div>
    </div>
  );
}
