import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Tipos necesarios para el PDF
interface TicketItem {
  product: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

interface TicketData {
  folio: string;
  total: number;
  paymentMethod: string;
  seller: string;
  items: TicketItem[];
  date: string;
  paid: number;
  change: number;
}

// Estilos simulando un ticket térmico pero en A4
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { alignItems: 'center', marginBottom: 20, borderBottom: '1px dashed #999', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  
  infoSection: { marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { fontWeight: 'bold', color: '#555' },
  
  tableHeader: { flexDirection: 'row', borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', marginBottom: 4 },
  colProd: { width: '40%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '25%', textAlign: 'right' },
  colTotal: { width: '25%', textAlign: 'right' },

  totalsSection: { marginTop: 10, borderTop: '1px dashed #999', paddingTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 3, width: '50%', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 14, fontWeight: 'bold' },

  footer: { marginTop: 30, textAlign: 'center', fontSize: 8, color: '#888' }
});

export const TicketPDF = ({ data }: { data: TicketData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>ÓMICRON</Text>
        <Text style={styles.subtitle}>Punto de Venta y Servicios</Text>
        <Text style={styles.subtitle}>RFC: XAXX010101000</Text>
      </View>

      {/* Info del Ticket */}
      <View style={styles.infoSection}>
        <View style={styles.row}>
            <Text style={styles.label}>FOLIO:</Text>
            <Text>{data.folio}</Text>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>FECHA:</Text>
            <Text>{data.date}</Text>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>VENDEDOR:</Text>
            <Text>{data.seller}</Text>
        </View>
      </View>

      {/* Tabla de Productos */}
      <View>
        <View style={styles.tableHeader}>
            <Text style={styles.colProd}>PRODUCTO</Text>
            <Text style={styles.colQty}>CANT</Text>
            <Text style={styles.colPrice}>PRECIO</Text>
            <Text style={styles.colTotal}>TOTAL</Text>
        </View>
        {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
                <Text style={styles.colProd}>{item.product}</Text>
                <Text style={styles.colQty}>{item.qty}</Text>
                <Text style={styles.colPrice}>${item.price.toFixed(2)}</Text>
                <Text style={styles.colTotal}>${item.total.toFixed(2)}</Text>
            </View>
        ))}
      </View>

      {/* Totales y Pago */}
      <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
              <Text>TOTAL A PAGAR:</Text>
              <Text style={styles.totalValue}>${data.total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
              <Text>MÉTODO DE PAGO:</Text>
              <Text>{data.paymentMethod}</Text>
          </View>
          <View style={styles.totalRow}>
              <Text>EFECTIVO/PAGO:</Text>
              <Text>${data.paid.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
              <Text>CAMBIO:</Text>
              <Text>${data.change.toFixed(2)}</Text>
          </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
         <Text>¡Gracias por su preferencia!</Text>
         <Text>Para cualquier aclaración es necesario presentar este ticket.</Text>
      </View>
    </Page>
  </Document>
);