# MJFOOD: Plataforma de Menús Digitales QR

## Descripción del Proyecto

**MJFOOD** es una plataforma web integral diseñada para revolucionar la gestión de menús en restaurantes mediante la implementación de códigos QR. Su objetivo principal es modernizar la experiencia del cliente, optimizar los procesos de pedido y eliminar la necesidad de menús físicos. La plataforma permite a los restaurantes digitalizar sus ofertas, gestionar pedidos en tiempo real y acceder a herramientas analíticas para mejorar su operación.

## Características Principales

### Para Clientes (Usuarios Finales)

*   **Directorio de Restaurantes:** Los usuarios pueden explorar una lista de restaurantes disponibles, filtrarlos por estado (abierto/cerrado) y ordenarlos por popularidad o nombre. Cada restaurante muestra su información clave, como nombre, dirección y logo.
*   **Menú Digital Interactivo:** Acceso a menús digitales personalizados para cada restaurante a través de códigos QR. Estos menús funcionan como Aplicaciones Web Progresivas (PWA), ofreciendo una experiencia de usuario fluida y la posibilidad de realizar pedidos directamente desde el dispositivo móvil.
*   **Proceso de Pedido Simplificado:** Los clientes pueden seleccionar productos, personalizar sus pedidos con variantes e instrucciones especiales, y gestionar un carrito de compras. El sistema calcula automáticamente los costos de envío según la zona y permite elegir entre diversas opciones de pago.

### Para Restaurantes (Panel de Administración)

*   **Panel de Control Analítico:** Un dashboard intuitivo que proporciona métricas clave en tiempo real, incluyendo el total de pedidos, ingresos generados, un ranking de los clientes más frecuentes y un historial detallado de pedidos recientes.
*   **Gestión de Pedidos en Tiempo Real:** Utilizando `Socket.io`, los restaurantes reciben notificaciones instantáneas de nuevos pedidos. Tienen la capacidad de aceptar o rechazar pedidos, lo que actualiza el estado en tiempo real para el cliente.
*   **Administración Completa del Menú:** Herramientas para crear, editar y eliminar categorías de productos, ítems individuales y sus variantes (ej. tamaños, adiciones, ingredientes).
*   **Configuración Personalizable:** Los propietarios de restaurantes pueden configurar sus horarios de atención, definir zonas de envío y sus respectivos costos, establecer información de pago (ej. datos bancarios para transferencias) y personalizar la apariencia de su menú digital (colores, logo, información de contacto).

### Para el Administrador Global

*   **Gestión de Restaurantes:** Funcionalidad para registrar nuevos restaurantes en la plataforma. Al registrar un nuevo restaurante, se crea automáticamente un menú por defecto y una cuenta de usuario asociada, facilitando el onboarding.

## Tecnologías Utilizadas

El proyecto **MJFOOD** está construido sobre un robusto stack tecnológico, principalmente basado en JavaScript:

| Categoría         | Tecnología          | Versión       | Descripción                                                                                                |
| :---------------- | :------------------ | :------------ | :--------------------------------------------------------------------------------------------------------- |
| **Backend**       | Node.js             |               | Entorno de ejecución de JavaScript del lado del servidor.                                                   |
|                   | Express.js          | `^5.1.0`      | Framework web para Node.js, utilizado para construir la API y manejar las rutas.                           |
| **Base de Datos** | MongoDB             |               | Base de datos NoSQL orientada a documentos.                                                                |
|                   | Mongoose            | `^8.17.0`     | ODM (Object Data Modeling) para MongoDB y Node.js, facilitando la interacción con la base de datos.        |
| **Frontend**      | EJS                 | `^3.1.10`     | Motor de plantillas incrustado en JavaScript para generar HTML dinámicamente.                              |
|                   | Tailwind CSS        | `^3.4.13`     | Framework CSS utility-first para un diseño rápido y personalizable.                                        |
| **Autenticación** | Passport.js         | `^0.7.0`      | Middleware de autenticación para Node.js, con estrategia local.                                            |
|                   | `passport-local`    | `^1.0.0`      | Estrategia de autenticación de usuario y contraseña para Passport.js.                                      |
|                   | `bcryptjs`          | `^3.0.2`      | Librería para el hash de contraseñas de forma segura.                                                      |
| **Tiempo Real**   | Socket.io           | `^4.8.1`      | Librería para comunicación bidireccional en tiempo real (WebSockets), esencial para notificaciones de pedidos. |
| **Utilidades**    | `dotenv`            | `16.5.0`      | Carga variables de entorno desde un archivo `.env`.                                                        |
|                   | `moment-timezone`   | `^0.6.0`      | Manejo de fechas y horas con soporte para zonas horarias (configurado para `America/Bogota`).             |
|                   | `qrcode`            | `^1.5.4`      | Generación de códigos QR.                                                                                  |
|                   | `web-push`          | `^3.6.7`      | Envío de notificaciones push a navegadores web.                                                            |
|                   | `nodemon`           | `^3.1.10`     | Herramienta para reiniciar automáticamente el servidor durante el desarrollo.                              |

## Estructura del Proyecto

El proyecto sigue una estructura modular basada en el patrón MVC (Modelo-Vista-Controlador):

```
mjfood/
├── app.js                # Archivo principal de la aplicación
├── config/               # Configuraciones (Passport, variables de entorno)
├── controllers/          # Lógica de negocio (admin, menú, pedidos, estadísticas)
├── data/                 # Datos estáticos (menús de ejemplo, promociones)
├── middleware/           # Middlewares personalizados (autenticación)
├── models/               # Modelos de Mongoose (esquemas de la base de datos)
├── public/               # Archivos estáticos (CSS, JS, imágenes, assets)
│   ├── assets/           # Imágenes y logos de restaurantes
│   ├── css/              # Archivos CSS (input.css, output.css de Tailwind)
│   └── js/               # Scripts del lado del cliente
├── routes/               # Definición de rutas de la API y vistas
├── services/             # Lógica de negocio compleja (procesamiento de pedidos)
├── utils/                # Utilidades generales (conexión DB, recarga de menús, PDF)
└── views/                # Plantillas EJS (panel, login, home, menú, parciales)
```

## Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto en tu entorno local:

### Prerrequisitos

Asegúrate de tener instalado lo siguiente:

*   **Node.js** (versión 14 o superior recomendada)
*   **npm** (viene con Node.js)
*   **MongoDB** (servidor de base de datos)
*   **Git**

### Clonar el Repositorio

```bash
git clone https://github.com/DrkBotBase/mjfood.git
cd mjfood
```

### Instalación de Dependencias

Instala todas las dependencias del proyecto usando npm:

```bash
npm install
```

### Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/mjfood_db
SECRET_KEY=tu_clave_secreta_para_sesiones
MAINTENANCE=false
DOMINIO=http://localhost:3000
```

*   `PORT`: Puerto en el que se ejecutará la aplicación.
*   `MONGO_URI`: URI de conexión a tu base de datos MongoDB.
*   `SECRET_KEY`: Clave secreta para las sesiones de Express. **¡Cámbiala por una cadena segura en producción!**
*   `MAINTENANCE`: Establece a `true` para activar el modo mantenimiento de la aplicación.
*   `DOMINIO`: Dominio de la aplicación, utilizado para algunas configuraciones internas.

### Base de Datos

Asegúrate de que tu servidor MongoDB esté en ejecución. La aplicación se conectará automáticamente a la base de datos especificada en `MONGO_URI` y creará las colecciones necesarias al insertar datos.

## Uso

### Iniciar el Servidor

Para iniciar la aplicación en modo de desarrollo (con `nodemon` para recarga automática):

```bash
npm run dev
```

Para iniciar la aplicación en modo de producción:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000` (o el puerto que hayas configurado).

### Acceso al Panel de Administración

Para acceder al panel de administración, navega a `http://localhost:3000/admin/login`.

*   **Creación de Usuario Administrador:** Puedes crear un usuario administrador directamente en la base de datos o, si tienes un usuario con rol `admin` ya creado, usar la ruta `/admin/register` para registrar nuevos restaurantes.

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue los siguientes pasos:

1.  Haz un fork del repositorio.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y commitea (`git commit -am 'feat: Añadir nueva funcionalidad'`).
4.  Sube tus cambios (`git push origin feature/nueva-funcionalidad`).
5.  Abre un Pull Request.

## Licencia

Este proyecto está bajo la licencia ISC. Consulta el archivo `LICENSE` para más detalles. (Nota: Si no existe un archivo `LICENSE`, se asume una licencia por defecto o se debe añadir uno).
