/** 1. modulis — komerciālā noliktava (pavadzīmes, pirkšana/pārdošana). Tiks būvēts atsevišķi. */
export function WarehousePage() {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold">Noliktava</h2>
        <p className="text-sm text-gray-500 mt-1">1. modulis — preču uzskaite un pavadzīmes</p>
      </div>

      <div className="card text-center py-10 px-4 space-y-4">
        <p className="text-5xl" aria-hidden>
          📦
        </p>
        <p className="font-medium text-gray-800 text-lg">Drīzumā</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Šeit būs TRIOIT preču noliktava: katalogs, ienākošās un izejošās pavadzīmes,
          atlikumi, pirkšana un pārdošana. Atsevišķs bloks — nav jājauc ar servisa
          materiāliem pie atgadījumiem.
        </p>
      </div>
    </div>
  );
}
