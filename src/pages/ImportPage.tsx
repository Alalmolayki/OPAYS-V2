import { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, Plus, Trash2, X, Loader2, Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseEOkulPdf } from '../lib/pdfParser';

// jsPDF standard fonts use WinAnsi (Latin-1) encoding.
// İ (U+0130), ı (U+0131), Ş (U+015E), ş (U+015F), Ğ (U+011E), ğ (U+011F)
// are NOT in that encoding → they print as garbage (0, ^, etc.).
// Ü, Ö, Ç are in WinAnsi so they stay as-is.
function pdfSafe(str: string): string {
  return str.replace(/[İışŞĞğ]/g, c =>
    ({ 'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g' } as Record<string, string>)[c] ?? c
  );
}

interface CsvRow {
  studentName: string;
  studentNo: string;
  class: string;
  section: string;
}

export default function ImportPage() {
  const { codes: allCodes, generateCodes, deleteCodeSession, deleteCode, selectedSchoolId, schools } = useStore();
  const codes = allCodes.filter(c => c.schoolId === selectedSchoolId);
  const currentSchool = schools.find(s => s.id === selectedSchoolId);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualRows, setManualRows] = useState<CsvRow[]>([{ studentName: '', studentNo: '', class: '', section: '' }]);
  const [activeSession, setActiveSession] = useState<string>('all');
  const [downloadClass, setDownloadClass] = useState<string>('all');
  const [codeSearch, setCodeSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Group codes by session
  const sessions = (() => {
    const map: Record<string, { sessionId: string; sessionDate: string; count: number }> = {};
    codes.forEach(c => {
      if (c.sessionId && !map[c.sessionId]) {
        map[c.sessionId] = { sessionId: c.sessionId, sessionDate: c.sessionDate || c.createdAt, count: 0 };
      }
      if (c.sessionId) map[c.sessionId].count++;
    });
    return Object.values(map).sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  })();

  const sessionCodes = activeSession === 'all' ? codes : codes.filter(c => c.sessionId === activeSession);
  const searchTerm = codeSearch.trim().toLowerCase();
  const displayedCodes = searchTerm
    ? sessionCodes.filter(c =>
        c.studentName.toLowerCase().includes(searchTerm) ||
        c.code.toLowerCase().includes(searchTerm) ||
        `${c.class}/${c.section}`.toLowerCase().includes(searchTerm) ||
        c.studentNo?.toLowerCase().includes(searchTerm)
      )
    : sessionCodes;
  // Sort: Hazırlık first, then numeric classes (9→10→11→12), then alphabetical within same class
  const sortClasses = (a: string, b: string) => {
    const rank = (s: string) => {
      const cls = s.split('/')[0];
      if (/hazırlık|hazirlık/i.test(cls)) return 0;
      const n = parseInt(cls);
      return isNaN(n) ? 999 : n;
    };
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, 'tr');
  };
  const uniqueClasses = [...new Set(sessionCodes.map(c => `${c.class}/${c.section}`).filter(Boolean))].sort(sortClasses);

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').filter(Boolean);
    const dataLines = lines[0].toLowerCase().includes('ad') ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
      return { studentName: cols[0] || '', studentNo: cols[1] || '', class: cols[2] || '', section: cols[3] || '' };
    }).filter(r => r.studentName && r.studentNo);
  };

  const handleCsvFile = (file: File) => {
    setError('');
    setImported(false);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parseCsv(e.target?.result as string);
        if (rows.length === 0) { setError('CSV dosyasında geçerli öğrenci satırı bulunamadı.'); return; }
        setPreview(rows);
      } catch {
        setError('CSV dosyası okunamadı. Lütfen formatı kontrol edin.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handlePdfFile = async (file: File) => {
    setError('');
    setImported(false);
    setLoading(true);
    try {
      const rows = await parseEOkulPdf(file);
      if (rows.length === 0) {
        setError('PDF\'den öğrenci verisi okunamadı. Lütfen e-okul sınıf listesi PDF\'i yüklediğinizden emin olun.');
      } else {
        setPreview(rows);
      }
    } catch {
      setError('PDF dosyası okunamadı veya desteklenmeyen format.');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      handlePdfFile(file);
    } else if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      handleCsvFile(file);
    } else {
      setError('Lütfen CSV veya e-okul PDF dosyası yükleyin.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    const rawRows = preview.length > 0 ? preview : manualRows.filter(r => r.studentName && r.studentNo);
    if (rawRows.length === 0) { setError('İçe aktarılacak öğrenci yok.'); return; }
    const rows = rawRows.map(r => ({ ...r, schoolId: selectedSchoolId }));
    generateCodes(rows, selectedSchoolId);
    setImported(true);
    setPreview([]);
    setManualRows([{ studentName: '', studentNo: '', class: '', section: '' }]);
  };

  const downloadTemplate = () => {
    const csv = 'Ad Soyad,Öğrenci No,Sınıf,Şube\nAhmet Yılmaz,S009,9,A\nFatma Çelik,S010,9,B';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opays_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCodes = (classFilter: string) => {
    // Use the full sessionCodes (not search-filtered) for download
    const base = activeSession === 'all' ? codes : codes.filter(c => c.sessionId === activeSession);
    const filtered = classFilter === 'all'
      ? base.filter(c => !c.isUsed)
      : base.filter(c => `${c.class}/${c.section}` === classFilter && !c.isUsed);

    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(c => {
      const key = `${c.class}/${c.section}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const schoolName = pdfSafe(currentSchool?.name || 'OPAYS');
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`OPAYS Aktivasyon Kodlari — ${schoolName}`, 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(dateStr, 14, 24);
    doc.setTextColor(0, 0, 0);

    let startY = 30;

    const entries = Object.entries(grouped);
    entries.forEach(([cls, rows], idx) => {
      // Section heading
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${pdfSafe(cls)}. Sinif — ${rows.length} ogrenci`, 14, startY);

      autoTable(doc, {
        startY: startY + 4,
        head: [['Ad Soyad', 'Ogrenci No', 'Aktivasyon Kodu']],
        body: rows.map(r => [pdfSafe(r.studentName), r.studentNo, r.code]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [8, 145, 178],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          2: { font: 'courier', fontStyle: 'bold', textColor: [8, 100, 160] },
        },
        margin: { left: 14, right: 14 },
      });

      // Get Y after table; add spacing before next section
      const tableResult = (doc as any).lastAutoTable;
      startY = (tableResult?.finalY ?? startY + 20) + (idx < entries.length - 1 ? 12 : 0);
    });

    const label = classFilter === 'all' ? 'tum-siniflar' : classFilter.replace('/', '-');
    doc.save(`opays-kodlar-${label}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Upload size={16} className="text-cyan-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Öğrenci İçe Aktar</h1>
          {currentSchool && (
            <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{currentSchool.name}</span>
          )}
        </div>
        <button onClick={downloadTemplate} className="btn-secondary">
          <Download size={16} /> Şablon İndir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-white">{codes.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Toplam Kod</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{codes.filter(c => !c.isUsed).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Kullanılmayan</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">{codes.filter(c => c.isUsed).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Kullanılan</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* CSV / PDF Upload */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white">Dosya ile İçe Aktar</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !loading && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${loading ? 'cursor-wait opacity-60' : 'cursor-pointer'} ${dragging ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/20'}`}
          >
            {loading ? (
              <>
                <Loader2 size={32} className="mx-auto text-cyan-400 mb-3 animate-spin" />
                <p className="text-slate-300 font-medium mb-1">PDF okunuyor…</p>
                <p className="text-xs text-slate-500">Lütfen bekleyin</p>
              </>
            ) : (
              <>
                <FileText size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium mb-1">CSV veya e-okul PDF Sürükle & Bırak</p>
                <p className="text-xs text-slate-500">veya tıklayarak seç · CSV / PDF</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded px-2 py-0.5">.csv</span>
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded px-2 py-0.5">.pdf e-okul</span>
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {imported && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2.5 rounded-lg">
              <CheckCircle size={14} /> Aktivasyon kodları başarıyla oluşturuldu!
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-sm text-slate-400 mb-2">{preview.length} öğrenci bulundu:</p>
              <div className="card overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0f1d30]">
                    <tr className="border-b border-slate-800/60">
                      <th className="text-left px-3 py-2 text-slate-500">Ad Soyad</th>
                      <th className="text-left px-3 py-2 text-slate-500">No</th>
                      <th className="text-left px-3 py-2 text-slate-500">Sınıf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/40 last:border-0">
                        <td className="px-3 py-2 text-slate-300">{r.studentName}</td>
                        <td className="px-3 py-2 text-slate-500">{r.studentNo}</td>
                        <td className="px-3 py-2 text-slate-500">{r.class}/{r.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setPreview([]); setError(''); }} className="btn-secondary flex-1 justify-center text-sm">
                  <X size={14} /> İptal
                </button>
                <button onClick={handleImport} className="btn-primary flex-1 justify-center">
                  {preview.length} Öğrenci İçin Kod Oluştur
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual Entry */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white">Manuel Giriş</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {manualRows.map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-2">
                <input type="text" placeholder="Ad Soyad" value={row.studentName} onChange={e => setManualRows(rows => rows.map((r, j) => j === i ? { ...r, studentName: e.target.value } : r))} className="input col-span-2 text-xs py-2" />
                <input type="text" placeholder="No" value={row.studentNo} onChange={e => setManualRows(rows => rows.map((r, j) => j === i ? { ...r, studentNo: e.target.value } : r))} className="input text-xs py-2" />
                <input type="text" placeholder="Sınıf" value={row.class} onChange={e => setManualRows(rows => rows.map((r, j) => j === i ? { ...r, class: e.target.value } : r))} className="input text-xs py-2" />
                <div className="flex items-center gap-1">
                  <input type="text" placeholder="Şub" value={row.section} onChange={e => setManualRows(rows => rows.map((r, j) => j === i ? { ...r, section: e.target.value } : r))} className="input text-xs py-2 flex-1" />
                  {manualRows.length > 1 && (
                    <button onClick={() => setManualRows(rows => rows.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setManualRows(r => [...r, { studentName: '', studentNo: '', class: '', section: '' }])} className="btn-secondary w-full justify-center text-sm">
            <Plus size={14} /> Satır Ekle
          </button>
          <button onClick={handleImport} className="btn-primary w-full justify-center">
            Kod Oluştur
          </button>
        </div>
      </div>

      {/* Generated Codes — with session tabs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Oluşturulan Kodlar</h2>
          {/* Print / Download controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={downloadClass}
              onChange={e => setDownloadClass(e.target.value)}
              className="input text-xs py-1.5 pr-8 w-auto"
            >
              <option value="all">Tüm Sınıflar</option>
              {uniqueClasses.map(c => <option key={c} value={c}>{c}. Sınıf</option>)}
            </select>
            <button onClick={() => downloadCodes(downloadClass)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 transition-colors">
              <Download size={13} /> İndir
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-800/40">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="İsim, kod, öğrenci no veya sınıf ara…"
              value={codeSearch}
              onChange={e => setCodeSearch(e.target.value)}
              className="input pl-8 text-sm py-2 w-full"
            />
            {codeSearch && (
              <button
                onClick={() => setCodeSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {codeSearch && (
            <p className="text-xs text-slate-500 mt-1.5">
              {displayedCodes.length} sonuç bulundu
            </p>
          )}
        </div>

        {/* Session tabs */}
        {sessions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-0 border-b border-slate-800/60">
            <button
              onClick={() => setActiveSession('all')}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-t-lg border border-b-0 transition-all ${activeSession === 'all' ? 'bg-slate-800 text-white border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              Tümü ({codes.length})
            </button>
            {sessions.map(s => (
              <div key={s.sessionId} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs rounded-t-lg border border-b-0 transition-all ${activeSession === s.sessionId ? 'bg-slate-800 text-white border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                <button onClick={() => setActiveSession(s.sessionId)}>
                  {format(new Date(s.sessionDate), 'd MMM yyyy HH:mm', { locale: tr })} ({s.count})
                </button>
                <button
                  onClick={() => { deleteCodeSession(s.sessionId); if (activeSession === s.sessionId) setActiveSession('all'); }}
                  className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                  title="Bu oturumu sil (kullanılmayan kodlar)"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0f1d30]">
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase">Kod</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase">Öğrenci</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase">Sınıf</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {displayedCodes.map(code => (
                <tr key={code.code} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{code.code}</td>
                  <td className="px-4 py-3 text-slate-300">{code.studentName}</td>
                  <td className="px-4 py-3 text-slate-500">{code.class}/{code.section}</td>
                  <td className="px-4 py-3">
                    {code.isUsed
                      ? <span className="badge bg-slate-700/60 text-slate-500 border border-slate-700">Kullanıldı</span>
                      : <span className="badge bg-green-500/15 text-green-400 border border-green-500/20">Bekliyor</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!code.isUsed && (
                      <button
                        onClick={() => deleteCode(code.code)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                        title="Kodu sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
