'use client'

import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ExportButtonsProps {
  onExportPdf: () => void
  onExportExcel: () => void
  isExporting?: boolean
}

export function ExportButtons({
  onExportPdf,
  onExportExcel,
  isExporting = false,
}: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onExportPdf}
        disabled={isExporting}
        title="Exportar PDF"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileDown size={14} />
        )}
        PDF
      </button>

      <button
        type="button"
        onClick={onExportExcel}
        disabled={isExporting}
        title="Exportar Excel"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={14} className="text-emerald-600" />
        )}
        Excel
      </button>
    </div>
  )
}
