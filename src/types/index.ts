export type UserRole = 'super' | 'admin' | 'vendedor';

export interface User {
  _id?: string;
  username: string;
  role: UserRole;
  password?: string; 
  isOnline?: boolean; // Estado de conexión
}

export interface Product {
  _id: string;
  model: string;
  brand: string;
  year: number;
  type: string;
  color: string;
  stock: number;
  price: number;
  category: string;
  image: string;
  qrCode?: string; // Campo opcional para el código QR
}

export interface RepairOrder {
  _id: string;
  folio?: string;
  clientName: string;
  phone: string;
  brand: string;
  model: string;
  color: string;
  service: string;
  cost: number;
  downPayment: number;
  deliveryDate?: string;
  comments?: string;
  status: 'Pendiente' | 'En Proceso' | 'Terminado' | 'Entregado' | 'Cancelado';
  evidencePhotos?: string[]; // Array de URLs de las fotos
  clientSignature?: string; // URL de la firma
  createdAt?: string;
  closedAt?: string;
  
  // Datos del dispositivo (Estructura anidada del backend)
  device?: {
    brand: string;
    model: string;
    color: string;
  };

  // Datos de Seguridad / Desbloqueo
  unlockType?: 'pattern' | 'password' | 'none';
  unlockCode?: string;
}

export interface TicketItem {
  productId?: string; // ID para devolución de stock al cancelar
  product: string;    // Nombre/Modelo del producto
  brand?: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

export interface Ticket {
  _id: string;
  folio: string;
  total: number;
  paymentMethod: string;
  seller: string;
  createdAt: string;
  status?: 'active' | 'cancelled'; // Estado para saber si fue cancelado
  items: TicketItem[];
}

export interface CartItem extends Product {
  qty: number;
  discount: number;
}