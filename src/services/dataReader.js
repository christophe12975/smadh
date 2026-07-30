import * as XLSX from "xlsx";

export async function loadExcel(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error("Fichier introuvable : " + path);
  }

  const buffer = await response.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(sheet, {
    defval: null
  });

  return data.map(row => ({
    ...row,
    Date: row.Date instanceof Date
      ? new Date(row.Date.getTime() + 24 * 60 * 60 * 1000)
      : row.Date,
    // Utilise "Debit" ou "Débit" selon ce qui est présent dans le fichier pour éviter les NaN
    Débit: Number(row.Débit !== undefined ? row.Débit : row.Debit) || 0
  }));
}