import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Calendar, DollarSign, Smartphone, User as UserIcon, Wrench, Edit, Trash2, X, FileText, Image as ImageIcon, PenTool, Eye, Camera, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Document, Page, Text, View, StyleSheet, Image as PDFImage, pdf } from '@react-pdf/renderer';
import api from '../../api';
import type { RepairOrder } from '../../types';

// --- IMPORTAMOS LOS SUBMÓDULOS (Asegúrate de tenerlos en la carpeta 'repairs') ---
import RepairForm from './repairs/RepairForm';
import RepairList from './repairs/RepairList';
import RepairDetailsModal from './repairs/RepairDetailsModal';

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
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  // --- FILTRO CRÍTICO: Ocultar entregados ---
  // Esta lista 'activeRepairs' solo tendrá las órdenes pendientes/en proceso.
  // Las órdenes con status 'Entregado' se filtran y no se muestran.
  const activeRepairs = (repairs || []).filter(r => r.status !== 'Entregado');

  const handleSubmit = async (formData: FormData, evidenceFiles: File[], signatureBlob: Blob | null) => {
    const submitData = new FormData();
    const get = (name: string) => (formData.get(name) as string) || '';

    if (!get('client') || !get('service')) {
        onNotify('error', 'Faltan datos obligatorios: Cliente o Servicio.');
        return;
    }

    submitData.append('clientName', get('client')); 
    submitData.append('phone', get('phone'));
    submitData.append('service', get('service'));
    submitData.append('cost', get('cost') || '0');
    submitData.append('downPayment', get('downPayment') || '0');
    submitData.append('comments', get('comments'));
    
    const rawDate = get('deliveryDate');
    if (rawDate) submitData.append('deliveryDate', new Date(rawDate).toISOString());
    
    submitData.append('brand', get('brand'));
    submitData.append('model', get('model'));
    submitData.append('color', get('color'));
    
    submitData.append('status', editingRepair ? editingRepair.status : 'Pendiente');

    evidenceFiles.forEach(f => submitData.append('evidencePhotos', f));
    if (signatureBlob) {
        submitData.append('clientSignature', signatureBlob, 'signature.png');
    }

    try {
      if (editingRepair) {
        await api.put(`/repairs/${editingRepair._id}`, submitData);
        onNotify('success', 'Orden actualizada correctamente.');
        setEditingRepair(null);
      } else {
        await api.post('/repairs', submitData);
        onNotify('success', '¡Orden creada con éxito!');
        setFormKey(prev => prev + 1);
      }
      onReload();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error de conexión.';
      onNotify('error', msg);
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
      {/* Solo pasamos activeRepairs para que no se vean las entregadas */}
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