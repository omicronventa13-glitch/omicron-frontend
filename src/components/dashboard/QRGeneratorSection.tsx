import React, { useState } from 'react';
import { QrCode, Download, FileText, ArrowRight, Printer } from 'lucide-react';
import QRCode from 'qrcode'; // Necesitarás instalar: npm install qrcode @types/qrcode
import { Document, Page, View, Image, StyleSheet, Text, pdf } from '@react-pdf/renderer';

interface QRGeneratorSectionProps {
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

// Estilos PDF para Grid de QRs
const styles = StyleSheet.create({
  page: { padding: 20, flexDirection: 'row', flexWrap: 'wrap' },
  qrContainer: { width: '20%', height: 120, padding: 5, alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' },
  image: { width: 80, height: 80 },
  label: { fontSize: 8, marginTop: 4, textAlign: 'center' }
});

const QRSheetPDF = ({ codes, images }: { codes: string[], images: string[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {codes.map((code, i) => (
        <View key={i} style={styles.qrContainer}>
          <Image src={images[i]} style={styles.image} />
          <Text style={styles.label}>{code}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

export default function QRGeneratorSection({ isDark, onNotify }: QRGeneratorSectionProps) {
  const [prefix, setPrefix] = useState('ART-');
  const [startNum, setStartNum] = useState(1);
  // CAMBIO: Valor por defecto ajustado a 30
  const [endNum, setEndNum] = useState(30);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  
  const generatePreview = () => {
    const codes = [];
    for (let i = startNum; i <= endNum; i++) {
        // Formato con padding ceros: ART-0001
        codes.push(`${prefix}${String(i).padStart(4, '0')}`);
    }
    setGeneratedCodes(codes);
  };

  const handleDownloadPDF = async () => {
    if (generatedCodes.length === 0) {
        onNotify('error', 'Primero genera una vista previa de los códigos.');
        return;
    }

    try {
      onNotify('success', 'Generando hoja de QRs...');
      
      // Generar imágenes Base64 para cada código
      const imagePromises = generatedCodes.map(code => QRCode.toDataURL(code, { width: 200, margin: 1 }));
      const images = await Promise.all(imagePromises);

      const blob = await pdf(<QRSheetPDF codes={generatedCodes} images={images} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Plantilla_QR_${prefix}${startNum}-${endNum}.pdf`;
      link.click();
    } catch (e) {
      console.error(e);
      onNotify('error', 'Error al generar el PDF de códigos.');
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`;

  return (
    <div className="max-w-4xl mx-auto pb-20">
       
       <div className={`p-8 rounded-3xl border shadow-xl mb-8 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400"><QrCode size={24}/></div>
               <div>
                   <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Generador de Plantillas QR</h3>
                   <p className="text-slate-500 text-sm">Crea hojas de etiquetas para pegar en tus productos nuevos.</p>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prefijo</label>
                   <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className={inputClass} placeholder="Ej: PROD-" />
               </div>
               <div className="flex gap-2 items-center">
                   <div className="flex-1">
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Inicio</label>
                       <input type="number" value={startNum} onChange={e => setStartNum(Number(e.target.value))} className={inputClass} />
                   </div>
                   <ArrowRight className="text-slate-500 mt-6" />
                   <div className="flex-1">
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fin</label>
                       <input type="number" value={endNum} onChange={e => setEndNum(Number(e.target.value))} className={inputClass} />
                   </div>
               </div>
               <button onClick={generatePreview} className="h-[50px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-colors">
                   Generar Vista Previa
               </button>
           </div>
       </div>

       {/* Vista Previa */}
       {generatedCodes.length > 0 && (
           <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
               <div className="flex justify-between items-center mb-6">
                   <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Vista Previa ({generatedCodes.length} etiquetas)</h4>
                   <button onClick={handleDownloadPDF} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg">
                       <FileText size={18} /> Descargar PDF
                   </button>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                   {generatedCodes.slice(0, 10).map(code => (
                       <div key={code} className={`p-3 rounded-lg border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                           {/* QR Mockup visual (en producción real usarías un componente <QRCode value={code} />) */}
                           <div className="aspect-square bg-white rounded p-1 mb-2 flex items-center justify-center">
                               <QrCode size={48} className="text-black"/> 
                           </div>
                           <p className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{code}</p>
                       </div>
                   ))}
                   {generatedCodes.length > 10 && (
                       <div className="flex items-center justify-center text-slate-500 text-sm italic">
                           ... y {generatedCodes.length - 10} más
                       </div>
                   )}
               </div>
           </div>
       )}
    </div>
  );
}