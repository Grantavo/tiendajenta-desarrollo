# 🛒 Tienda Genta React - E-commerce & Investment Hub

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

Una plataforma de comercio electrónico moderna y robusta integrada con un sistema de fidelización de clientes a través de una **Billetera Virtual** y un **Dashboard de Inversiones** en tiempo real. Diseñada para ofrecer una experiencia de usuario premium y herramientas de gestión potentes para administradores.

---

## ✨ Características Principales

### 🛍️ Experiencia de Usuario (Cliente)
- **Catálogo Dinámico:** Navegación fluida por categorías y productos con filtros en tiempo real.
- **Billetera Virtual:** Sistema de saldo precargado para compras instantáneas.
- **Dashboard de Inversiones:** Visualización del rendimiento de activos y portafolio personal.
- **Múltiples Métodos de Pago:** Integración con **Nequi**, **Bancolombia**, **Nubank** (con identidad visual oficial) y soporte para **Bold**.
- **Notificaciones Premium:** Feedback visual inmediato mediante Sonner.

### 🛡️ Panel de Administración (Control Total)
- **Gestión de Inventario:** Control completo sobre productos, categorías y stock.
- **Métricas Avanzadas:** Gráficos estadísticos con Recharts para ventas y comportamiento de usuarios.
- **Configuración de Pasarelas:** Panel dedicado para la integración de Bold (API Keys, Modo Sandbox/Producción).
- **Gestión de Clientes:** Control de saldos, historial de pedidos y perfiles de inversión.
- **Marketing & Banners:** Personalización visual de la tienda desde el panel.

---

## 🚀 Tecnologías Utilizadas

- **Frontend:** React 18 + Vite (Optimización de carga).
- **Estilos:** Tailwind CSS (Diseño responsivo y utilitario).
- **Backend/Base de Datos:** Firebase Firestore (Base de datos NoSQL en tiempo real).
- **Autenticación:** Firebase Auth.
- **Iconografía:** Lucide React.
- **Gráficos:** Recharts.
- **Gestión de Excel:** ExcelJS (Exportación de reportes).

---

## 🛠️ Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/tienda-react.git
   cd tienda-react
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz (basado en `config.js`) con tus credenciales de Firebase.

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

---

## 📁 Estructura del Proyecto

```text
src/
├── assets/          # Imágenes, logos y recursos estáticos
├── components/      # Componentes reutilizables (Modales, Navbar, etc.)
├── context/         # Contextos globales (Carrito, Auth)
├── firebase/        # Configuración inicial de Firebase
├── hooks/           # Hooks personalizados (useFinnhub, useCart, etc.)
├── layouts/         # Estructuras base (AdminLayout, ShopLayout)
└── pages/           # Páginas principales del proyecto
    ├── admin/       # Gestión y configuración administrativa
    ├── shop/        # Interfaz de cara al cliente
    └── auth/        # Login y protección de rutas
```

---

## 💳 Integraciones de Pago Especiales

El proyecto cuenta con una integración visual para los bancos más importantes de Colombia:
- **Nequi:** Identificación por logo oficial.
- **Bancolombia:** Identificación por logo oficial.
- **Nubank:** Identificación por logo oficial.
- **Bold:** Pasarela de pago completa (en proceso de implementación final).

---

## ⚙️ Configuración del Panel Bold
Para activar los pagos con tarjeta y PSE, dirígete a `/admin/bold` e ingresa tus llaves API proporcionadas por Bold.co. Recuerda probar primero en modo **Sandbox**.

---

## 🤝 Contribución
Las contribuciones son lo que hacen a la comunidad de código abierto un lugar increíble para aprender, inspirar y crear. Cualquier contribución que hagas será **muy apreciada**.

1. Haz un Fork del proyecto.
2. Crea una rama para tu característica (`git checkout -b feature/AmazingFeature`).
3. Haz un Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4. Haz un Push a la rama (`git push origin feature/AmazingFeature`).
5. Abre un Pull Request.

---

Desarrollado con ❤️ para **Grupo Jenta**.
