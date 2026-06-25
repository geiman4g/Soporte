import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";
import { parseFile, downloadSampleCSV } from "../utils/parser";
import { TicketRecord } from "../types";

interface UploadZoneProps {
  onDataLoaded: (data: TicketRecord[]) => void;
  onClearData: () => void;
  dataCount: number;
}

export function UploadZone({ onDataLoaded, onClearData, dataCount }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    // Basic file validation
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "xlsx" && fileExt !== "csv" && fileExt !== "xls") {
      setError("Solo se admiten archivos Excel (.xlsx, .xls) o de valores separados por comas (.csv).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const parsedData = await parseFile(file);
      onDataLoaded(parsedData);
      setSuccessMsg(`¡Cargado con éxito! Se procesaron ${parsedData.length} registros del archivo "${file.name}". Se ha sobrescrito la base de datos anterior.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al analizar el archivo. Asegúrate de que las columnas coincidan exactamente con la plantilla.");
    } finally {
      setLoading(false);
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 pb-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#005bbf]" />
            Carga de Archivo de Datos de Soporte
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Sube un archivo Excel (.xlsx, .xls) o CSV con el formato corporativo. Cada nueva carga eliminará y reemplazará la información actual.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#005bbf] bg-[#005bbf]/10 hover:bg-[#005bbf]/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Plantilla CSV
          </button>
          {dataCount > 0 && (
            <button
              onClick={onClearData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              Restablecer Datos
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-[#005bbf] bg-[#005bbf]/5 scale-[0.995]"
            : "border-gray-300 hover:border-[#005bbf] hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={loading}
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-t-[#005bbf] border-gray-200 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-700">Analizando registros y estructurando bases de datos...</p>
            <p className="text-xs text-gray-400">Por favor, espera un momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#005bbf]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Arrastra tu archivo aquí o <span className="text-[#005bbf] underline">explora tus archivos</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Soporta formatos .xlsx, .xls o .csv (Max. 20MB)</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-mono">
              <span>Columnas esperadas: Nombre de Cuenta, ID de Ticket, Prioridad, Tiempo de primera respuesta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Alerts & Messages */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Error de carga:</span> {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>{successMsg}</div>
        </div>
      )}
    </div>
  );
}
