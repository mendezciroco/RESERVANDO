// Datos del complejo GOLES y reservas de ejemplo de la demo.
// Las pantallas no leen este archivo: todo pasa por Store.
// En Django: esto viene de los modelos Complejo, Cancha y Reserva.
// Todo lo marcado PROVISORIO se reemplaza cuando GOLES nos pase los datos reales.

const GOLES = {
  id: 'goles',
  nombre: 'GOLES',
  subdominio: 'goles.reservando.com',
  direccion: 'Calle Falsa 123, Buenos Aires', // PROVISORIO
  whatsapp: '1100000000',                     // PROVISORIO (10 dígitos, se muestra con Fmt.telefono)
  telefonoDuenio: '1112345678',               // PROVISORIO: teléfono inventado para entrar al panel
  logo: 'assets/img/goles-logo.svg',          // PROVISORIO. Ruta desde la raíz: desde goles/ va con '../'
  horario: { desde: 13, hasta: 24 },          // el último turno es de 23:00 a 00:00
  duracionTurno: 1,                           // en horas
  senaPorHora: 5000,
  cancelacionGratuita: false,
  comisionMercadoPago: 'complejo',            // la paga el complejo, no el jugador
  canchas: [
    { id: 'f5', nombre: 'Cancha F5', tipo: 'F5', techada: true, superficie: 'Sintético', precioHora: 45000 }, // precioHora PROVISORIO
    { id: 'f7', nombre: 'Cancha F7', tipo: 'F7', techada: true, superficie: 'Sintético', precioHora: 65000 }, // precioHora PROVISORIO
  ],
};

// Reservas de ejemplo, relativas a la fecha de hoy: dia 0 = hoy, dia 1 = mañana.
// Quedan libres a propósito algunos horarios buenos (hoy F5 19, 21 y 23; F7 18, 21 y 23) para reservar en vivo.
// medioSena null = la seña todavía no se pagó.
const RESERVAS_EJEMPLO = [
  { dia: 0, canchaId: 'f7', hora: 16, horas: 1, nombre: 'Diego Sosa',       telefono: '1138472615', origen: 'manual', medioSena: 'efectivo' },
  { dia: 0, canchaId: 'f5', hora: 18, horas: 1, nombre: 'Martín Gómez',     telefono: '1134567812', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 0, canchaId: 'f7', hora: 19, horas: 2, nombre: 'Juan Rodríguez',   telefono: '1167890145', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 0, canchaId: 'f5', hora: 20, horas: 1, nombre: 'Lucas Fernández',  telefono: '1145678923', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 0, canchaId: 'f5', hora: 22, horas: 1, nombre: 'Nicolás Pérez',    telefono: '1156789034', origen: 'manual', medioSena: null },
  { dia: 1, canchaId: 'f7', hora: 18, horas: 1, nombre: 'Santiago Romero',  telefono: '1129384756', origen: 'manual', medioSena: null },
  { dia: 1, canchaId: 'f5', hora: 19, horas: 1, nombre: 'Federico Díaz',    telefono: '1178901256', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 1, canchaId: 'f7', hora: 20, horas: 1, nombre: 'Facundo Álvarez',  telefono: '1150617283', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 1, canchaId: 'f5', hora: 21, horas: 2, nombre: 'Matías López',     telefono: '1189012367', origen: 'web',    medioSena: 'mercadopago' },
  { dia: 1, canchaId: 'f7', hora: 22, horas: 1, nombre: 'Agustín Torres',   telefono: '1161728394', origen: 'web',    medioSena: 'mercadopago' },
];
