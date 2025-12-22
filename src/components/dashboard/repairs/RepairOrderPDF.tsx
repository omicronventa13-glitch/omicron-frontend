import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image as PDFImage } from '@react-pdf/renderer';
import type { RepairOrder } from '../../../types';

// Helper para fechas
const formatDateLocal = (dateString?: string) => {
  if (!dateString) return 'Por definir';
  const date = new Date(dateString);
  return new Date(date.valueOf() + date.getTimezoneOffset() * 60000).toLocaleDateString();
};

// Helper para datos de dispositivo
const getDevice = (order: any) => {
  if (order.device) return order.device;
  return { brand: order.brand || 'N/A', model: order.model || 'N/A', color: order.color || 'N/A' };
};

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  headerFolio: { fontSize: 10, color: '#666', marginBottom: 2 },
  folioValue: { fontSize: 12, color: '#E63946', fontWeight: 'bold' },
  
  section: { marginBottom: 15, padding: 10, border: '1px solid #eee', borderRadius: 5 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 8, color: '#444', backgroundColor: '#f5f5f5', padding: 4 },
  
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: 'bold', color: '#555' },
  value: { flex: 1 },
  
  // Estilos para Imágenes en PDF
  evidenceSection: { marginTop: 10 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  evidenceImage: { width: 150, height: 100, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 4, margin: 2 },
  
  legalText: { fontSize: 8, textAlign: 'justify', marginTop: 10, color: '#666', lineHeight: 1.4 },
  
  footer: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureBox: { alignItems: 'center', width: 200 },
  signatureImage: { width: 150, height: 60, objectFit: 'contain' },
  signatureLine: { borderTop: '1px solid #000', width: '100%', marginTop: 5 },
  signatureLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' }
});

export const RepairOrderPDF = ({ order }: { order: RepairOrder }) => {
  const device = getDevice(order);
  
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        
        {/* HEADER */}
        <View style={pdfStyles.headerContainer}>
          <View>
            <Text style={pdfStyles.headerTitle}>ÓMICRON</Text>
            <Text style={{ fontSize: 9, color: '#888' }}>Centro de Servicio Técnico Especializado</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={pdfStyles.headerFolio}>FOLIO DE ORDEN</Text>
            <Text style={pdfStyles.folioValue}>{order.folio || order._id.slice(-6).toUpperCase()}</Text>
            <Text style={{ fontSize: 8, marginTop: 2 }}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
        
        {/* INFORMACIÓN */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DATOS DEL CLIENTE Y EQUIPO</Text>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Cliente:</Text><Text style={pdfStyles.value}>{order.clientName}</Text></View>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Teléfono:</Text><Text style={pdfStyles.value}>{order.phone}</Text></View>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Equipo:</Text><Text style={pdfStyles.value}>{device.brand} {device.model}</Text></View>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Color/Detalle:</Text><Text style={pdfStyles.value}>{device.color}</Text></View>
          
          {/* SECCIÓN DE SEGURIDAD (NUEVO) */}
          {order.unlockType && order.unlockType !== 'none' && (
              <View style={{ marginTop: 5, paddingTop: 5, borderTop: '1px dashed #ccc' }}>
                  <View style={pdfStyles.row}>
                      <Text style={pdfStyles.label}>Desbloqueo:</Text>
                      <Text style={pdfStyles.value}>
                          {order.unlockType === 'pattern' ? 'Patrón' : `PIN/Pass: ${order.unlockCode}`}
                      </Text>
                  </View>
                  {order.unlockType === 'pattern' && order.unlockCode && (
                      <View style={pdfStyles.row}><Text style={pdfStyles.label}>Secuencia:</Text><Text style={pdfStyles.value}>{order.unlockCode}</Text></View>
                  )}
              </View>
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DETALLES DEL SERVICIO</Text>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Servicio:</Text><Text style={pdfStyles.value}>{order.service}</Text></View>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Observaciones:</Text><Text style={pdfStyles.value}>{order.comments || 'Sin observaciones'}</Text></View>
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Entrega Aprox:</Text><Text style={pdfStyles.value}>{formatDateLocal(order.deliveryDate)}</Text></View>
          
          <View style={{ flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #ccc' }}>
            <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Total:</Text><Text style={{ fontWeight: 'bold' }}>${order.cost}</Text></View>
            <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Anticipo:</Text><Text>${order.downPayment}</Text></View>
            <View style={{ flex: 1 }}><Text style={pdfStyles.label}>Restante:</Text><Text style={{ fontWeight: 'bold', color: '#E63946' }}>${order.cost - order.downPayment}</Text></View>
          </View>
        </View>

        {/* EVIDENCIAS FOTOGRÁFICAS */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>EVIDENCIA DE ENTRADA</Text>
          <View style={pdfStyles.evidenceGrid}>
            {order.evidencePhotos && order.evidencePhotos.length > 0 ? (
              order.evidencePhotos.map((url, index) => (
                <PDFImage key={index} src={url} style={pdfStyles.evidenceImage} />
              ))
            ) : (
              <Text style={{ fontSize: 9, fontStyle: 'italic', color: '#999' }}>No se adjuntó evidencia fotográfica al recibir el equipo.</Text>
            )}
          </View>
        </View>

        {/* LEGAL Y FIRMAS */}
        <View style={{ marginTop: 20 }}>
            <Text style={pdfStyles.sectionTitle}>TÉRMINOS Y CONDICIONES</Text>
            <Text style={pdfStyles.legalText}>
                1. El diagnóstico tiene costo si el servicio no es aceptado. 2. No nos hacemos responsables por pérdida de datos; respalde su información. 3. Equipos mojados se reciben sin garantía de encendido posterior. 4. Equipos no recogidos en 30 días causan almacenaje. 5. La garantía cubre solo la reparación efectuada. Al firmar, acepta estos términos.
            </Text>

            <View style={pdfStyles.footer}>
                <View style={pdfStyles.signatureBox}>
                    <View style={{ height: 60 }} />
                    <View style={pdfStyles.signatureLine} />
                    <Text style={pdfStyles.signatureLabel}>Firma Técnico</Text>
                </View>

                <View style={pdfStyles.signatureBox}>
                    {/* FIRMA DIGITAL DEL CLIENTE */}
                    {order.clientSignature ? (
                        <PDFImage src={order.clientSignature} style={pdfStyles.signatureImage} />
                    ) : (
                        <View style={{ height: 60 }} />
                    )}
                    <View style={pdfStyles.signatureLine} />
                    <Text style={pdfStyles.signatureLabel}>Firma Conformidad Cliente</Text>
                </View>
            </View>
        </View>
        
      </Page>
    </Document>
  );
};