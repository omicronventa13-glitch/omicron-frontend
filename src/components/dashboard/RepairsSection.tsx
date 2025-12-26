import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Calendar, DollarSign, Smartphone, User as UserIcon, Wrench, Edit, Trash2, X, FileText, Image as ImageIcon, PenTool, Eye, Camera, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Document, Page, Text, View, StyleSheet, Image as PDFImage, pdf } from '@react-pdf/renderer';
import api from '../../api';
import type { RepairOrder } from '../../types';

// --- IMPORTAMOS LOS SUBMÓDULOS ---
import RepairForm from './repairs/RepairForm';
import RepairList from './repairs/RepairList';
import RepairDetailsModal from './repairs/RepairDetailsModal';

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dxdaoojfq"; 
const CLOUDINARY_UPLOAD_PRESET = "novatech_preset"; 

// --- HELPERS DE IMAGEN (Idénticos a StockSection para consistencia) ---
const processImageForUpload = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1000; // 1000px para balance calidad/peso
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
              if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob((blob) => {
                if (blob) {
                  const fileName = `evidence_${Date.now()}.jpg`;
                  resolve(new File([blob], fileName, { type: 'image/jpeg' }));
                } else { resolve(file); }
              }, 'image/jpeg', 0.80);
            } else { resolve(file); }
        } catch (e) { resolve(file); }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData
      });
      if (!response.ok) throw new Error("Error subiendo a Cloudinary");
      const data = await response.json();
      return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
  } catch (err: any) {
      throw new Error(err.message || "Fallo de red");
  }
};

// --- ESTILOS DEL PDF ---
const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerFolio: { fontSize: 12, color: '#666' },
  section: { marginVertical: 10, padding: 10, border: '1px solid #eee', borderRadius: 5 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#444', backgroundColor: '#f9f9f9', padding: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: 'bold', color: '#555' },
  value: { flex: 1, color: '#000' },
  evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 5 },
  evidenceImage: { width: 150, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' },
  legalText: { fontSize: 8, textAlign: 'justify', marginTop: 5, color: '#666', lineHeight: 1.4 },
  footer: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureBox: { alignItems: 'center', width: 200 },
  signatureImage: { width: 150, height: 60, marginBottom: 5 },
  signatureLine: { borderTop: '1px solid #000', width: '100%', marginTop: 2 },
  signatureLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' }
});

// --- DOCUMENTO PDF ---
const RepairOrderPDF = ({ order }: { order: RepairOrder }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.headerContainer}>
        <View>
          <Text style={pdfStyles.headerTitle}>ÓMICRON</Text>
          <Text style={{ fontSize: 10, color: '#888' }}>Centro de Servicio Técnico</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={pdfStyles.headerFolio}>FOLIO DE ORDEN</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#E63946' }}>{order.folio || order._id.slice(-6).toUpperCase()}</Text>
          <Text style={{ fontSize: 8 }}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString()}</Text>
        </View>
      </View>
      
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>INFORMACIÓN DEL CLIENTE Y EQUIPO</Text>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Cliente:</Text><Text style={pdfStyles.value}>{order.clientName}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Teléfono:</Text><Text style={pdfStyles.value}>{order.phone}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Dispositivo:</Text><Text style={pdfStyles.value}>{order.brand} {order.model}</Text></View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>DETALLES DEL SERVICIO</Text>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Servicio:</Text><Text style={pdfStyles.value}>{order.service}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Observaciones:</Text><Text style={pdfStyles.value}>{order.comments || 'Sin observaciones'}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Fecha Entrega:</Text><Text style={pdfStyles.value}>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Por definir'}</Text></View>
        
        <View style={{ flexDirection: 'row', marginTop: 10, borderTop: '1px dashed #ccc', paddingTop: 5 }}>
          <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Costo Total:</Text><Text style={{ fontWeight: 'bold' }}>${order.cost}</Text></View>
          <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Anticipo:</Text><Text>${order.downPayment}</Text></View>
          <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Restante:</Text><Text style={{ fontWeight: 'bold', color: '#E63946' }}>${order.cost - order.downPayment}</Text></View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>EVIDENCIA DE ENTRADA</Text>
        <View style={pdfStyles.evidenceContainer}>
          {order.evidencePhotos && order.evidencePhotos.length > 0 ? (
            order.evidencePhotos.map((photoUrl, index) => (
              <PDFImage key={index} style={pdfStyles.evidenceImage} src={photoUrl} />
            ))
          ) : (
            <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#999' }}>No se adjuntó evidencia fotográfica.</Text>
          )}
        </View>
      </View>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>TÉRMINOS, CONDICIONES Y POLÍTICAS DE SERVICIO</Text>
      <Text style={pdfStyles.legalText}>
        1. DIAGNÓSTICO: En caso de que el equipo requiera revisión interna y el cliente no acepte el presupuesto, se cobrará un costo de revisión de $200.00 MXN.{"\n"}
        2. RESPALDO DE DATOS: El centro de servicio NO se hace responsable por la pérdida parcial o total de información (fotos, contactos, documentos). Es responsabilidad del cliente realizar un respaldo previo.{"\n"}
        3. RIESGOS EN REPARACIÓN: En equipos mojados, golpeados o previamente intervenidos, pueden surgir fallas ocultas durante la manipulación técnica. La empresa no asume responsabilidad por daños preexistentes que se manifiesten durante el servicio.{"\n"}
        4. ABANDONO DE EQUIPOS: Todo equipo no reclamado después de 30 días naturales a partir de la fecha de notificación de término generará un cargo de almacenaje de $10.00 MXN diarios. Pasados 90 días, el equipo será considerado abandonado y la empresa podrá disponer de él para cubrir gastos operativos sin responsabilidad alguna.{"\n"}
        5. GARANTÍA: La garantía es de 30 días exclusivamente sobre la mano de obra y refacciones reemplazadas. No aplica en equipos mojados, intervenidos por terceros, o con daños físicos posteriores a la entrega.{"\n"}
        6. ENTREGA: Para retirar el equipo es indispensable presentar esta nota de servicio o identificación oficial del titular.
      </Text>

      <View style={pdfStyles.footer}>
        <View style={pdfStyles.signatureBox}>
          <View style={{ height: 60 }}></View>
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureLabel}>Firma del Técnico / Receptor</Text>
        </View>

        <View style={pdfStyles.signatureBox}>
          {order.clientSignature ? (
            <PDFImage style={pdfStyles.signatureImage} src={order.clientSignature} />
          ) : (
            <View style={{ height: 60 }}></View>
          )}
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureLabel}>Firma de Conformidad del Cliente</Text>
          <Text style={{ fontSize: 6, color: '#999' }}>Acepto términos y condiciones</Text>
        </View>
      </View>
    </Page>
  </Document>
);

// --- COMPONENTE PRINCIPAL ---
interface RepairsSectionProps {
  repairs: RepairOrder[];
  onReload: () => void;
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function RepairsSection({ repairs, onReload, isDark, onNotify }: RepairsSectionProps) {
  const [selectedRepair, setSelectedRepair] = useState<RepairOrder | null>(null);
  const [editingRepair, setEditingRepair] = useState<RepairOrder | null>(null);
  const [closingRepair, setClosingRepair] = useState<RepairOrder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  // --- FILTRO CRÍTICO: Ocultar entregados ---
  const activeRepairs = (repairs || []).filter(r => r.status !== 'Entregado');

  const handleSubmit = async (formData: FormData, evidenceFiles: File[], signatureBlob: Blob | null) => {
    // 1. Validaciones básicas
    const get = (name: string) => (formData.get(name) as string) || '';
    if (!get('client') || !get('service')) {
        onNotify('error', 'Faltan datos obligatorios: Cliente o Servicio.');
        return;
    }

    setIsUploading(true);

    try {
        // 2. Procesar Evidencias Fotográficas
        const evidenceUrls: string[] = [];
        if (evidenceFiles.length > 0) {
            onNotify('success', `Procesando ${evidenceFiles.length} fotos de evidencia...`);
            for (const file of evidenceFiles) {
                const processed = await processImageForUpload(file);
                const url = await uploadToCloudinary(processed);
                evidenceUrls.push(url);
            }
        }

        // 3. Procesar Firma
        let signatureUrl = '';
        if (signatureBlob) {
            onNotify('success', 'Guardando firma digital...');
            const sigFile = new File([signatureBlob], `signature_${Date.now()}.png`, { type: 'image/png' });
            signatureUrl = await uploadToCloudinary(sigFile);
        }

        // 4. Construir Payload JSON
        // Nota: Si es edición, preservamos las fotos anteriores si no se subieron nuevas, o las combinamos.
        // Aquí asumiremos que se agregan a las existentes.
        
        const currentEvidence = editingRepair ? (editingRepair.evidencePhotos || []) : [];
        const finalEvidence = [...currentEvidence, ...evidenceUrls];
        
        // Si no se subió nueva firma, mantenemos la anterior en edición
        const finalSignature = signatureUrl || (editingRepair ? editingRepair.clientSignature : '');

        const payload = {
            clientName: get('client'),
            phone: get('phone'),
            service: get('service'),
            cost: Number(get('cost') || 0),
            downPayment: Number(get('downPayment') || 0),
            comments: get('comments'),
            deliveryDate: get('deliveryDate') ? new Date(get('deliveryDate')).toISOString() : null,
            brand: get('brand'),
            model: get('model'),
            color: get('color'),
            status: editingRepair ? editingRepair.status : 'Pendiente',
            evidencePhotos: finalEvidence, // Array de Strings (URLs)
            clientSignature: finalSignature // String (URL)
        };

        const config = { headers: { 'Content-Type': 'application/json' } };

        if (editingRepair) {
            await api.put(`/repairs/${editingRepair._id}`, payload, config);
            onNotify('success', 'Orden actualizada correctamente.');
            setEditingRepair(null);
        } else {
            await api.post('/repairs', payload, config);
            onNotify('success', '¡Orden creada con éxito!');
            setFormKey(prev => prev + 1);
        }
        onReload();

    } catch (error: any) {
        console.error(error);
        const msg = error.message || 'Error al procesar la solicitud.';
        onNotify('error', msg);
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/repairs/${deletingId}`);
      onNotify('success', 'Orden eliminada correctamente.');
      onReload();
      setDeletingId(null); 
      setSelectedRepair(null); 
    } catch (e) { 
      onNotify('error', 'Error al eliminar la orden.'); 
    }
  };

  const handleCloseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingRepair) return;
    
    const form = e.target as HTMLFormElement;
    const notes = (new FormData(form)).get('closingNotes');
    
    try {
        await api.put(`/repairs/${closingRepair._id}`, { 
            status: 'Entregado', 
            comments: closingRepair.comments + `\n[CIERRE]: ${notes}`,
            closedAt: new Date().toISOString()
        });
        onNotify('success', 'Orden cerrada y entregada. Se movió a Reportes.');
        setClosingRepair(null);
        setSelectedRepair(null);
        onReload(); // Al recargar, la orden desaparece de la lista 'activeRepairs'
    } catch (e) { onNotify('error', 'Error al cerrar orden.'); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 pb-32 relative">
      
      {/* INDICADOR DE CARGA GLOBAL (Bloqueo de pantalla) */}
      {isUploading && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <Loader2 size={64} className="animate-spin text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold">Subiendo evidencias a la nube...</h3>
            <p className="text-sm text-slate-300">Por favor espere, no cierre la ventana.</p>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deletingId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border-2 border-red-500/20 ${isDark ? 'bg-slate-900' : 'bg-white'} transform scale-100 transition-all`}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>¿Eliminar Orden?</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Esta acción es permanente y no se puede deshacer. Se borrarán todos los datos y evidencias asociadas.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setDeletingId(null)} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors">Sí, Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CERRAR ORDEN */}
      {closingRepair && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-green-500"><CheckCircle /> Finalizar Servicio</h3>
                    <button onClick={() => setClosingRepair(null)}><X size={20} className="text-slate-500 hover:text-white"/></button>
                </div>
                <form onSubmit={handleCloseOrder}>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Notas de Entrega</label>
                    <textarea name="closingNotes" className={`w-full p-3 rounded-xl border outline-none mb-4 h-24 resize-none ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'}`} placeholder="Ej: Equipo entregado funcionando..." required></textarea>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setClosingRepair(null)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-800">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg">Confirmar Entrega</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 1. COMPONENTE FORMULARIO */}
      <RepairForm 
        key={formKey}
        editingRepair={editingRepair}
        onCancelEdit={() => setEditingRepair(null)}
        onSubmit={handleSubmit}
        isDark={isDark}
        onNotify={onNotify}
      />

      {/* 2. COMPONENTE LISTA (FILTRADA) */}
      <RepairList 
        repairs={activeRepairs} 
        onEdit={setEditingRepair} 
        onDelete={handleDeleteRequest}
        onSelect={setSelectedRepair} 
        isDark={isDark} 
      />

      {/* 3. COMPONENTE MODAL DETALLES */}
      {selectedRepair && (
        <RepairDetailsModal 
          repair={selectedRepair} 
          onClose={() => setSelectedRepair(null)} 
          onCloseOrder={setClosingRepair}
          isDark={isDark}
          onNotify={onNotify}
        />
      )}

    </div>
  );
}