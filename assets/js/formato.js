// Fmt: cómo se muestran pesos, fechas, horas y teléfonos en toda la demo.
// Las fechas llegan siempre como 'AAAA-MM-DD' y las horas como número (13..24).
// En Django: estos formatos pasan a filtros de template.
const Fmt = (() => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // 'AAAA-MM-DD' → { dia, mes, diaSemana } sin depender de la zona horaria del navegador
  function partes(fecha) {
    const [anio, mes, dia] = String(fecha).split('-').map(Number);
    return { dia, mes, diaSemana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() };
  }

  const conMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

  // 21 → '21:00'. La 24 se muestra '00:00'
  const hora = (numero) => `${String(Number(numero) % 24).padStart(2, '0')}:00`;

  return {
    // 5000 → '$5.000'
    pesos(monto) {
      const entero = Math.round(Number(monto) || 0);
      const miles = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return (entero < 0 ? '-$' : '$') + miles;
    },

    // '2026-10-30' → 'Vie 30'
    dia(fecha) {
      const { dia, diaSemana } = partes(fecha);
      return `${conMayuscula(DIAS[diaSemana].slice(0, 3))} ${dia}`;
    },

    // '2026-10-30' → 'viernes 30 de octubre'
    diaLargo(fecha) {
      const { dia, mes, diaSemana } = partes(fecha);
      return `${DIAS[diaSemana]} ${dia} de ${MESES[mes - 1]}`;
    },

    // 2 → 'martes' (0 = domingo). Para mostrar los turnos fijos
    diaSemana(numero) {
      return DIAS[Number(numero)] || '';
    },

    // 21 → '21:00'. La 24 se muestra '00:00'
    hora,

    // (21, 2) → '21:00 a 23:00'
    rango(desde, horas = 1) {
      return `${hora(desde)} a ${hora(Number(desde) + Number(horas))}`;
    },

    // '1123456789' → '11 2345-6789'. Fuera de CABA y GBA toma un código de área de 3 dígitos
    telefono(telefono) {
      const digitos = String(telefono || '').replace(/\D/g, '');
      if (digitos.length !== 10) return String(telefono || '');
      const area = digitos.startsWith('11') ? 2 : 3;
      return `${digitos.slice(0, area)} ${digitos.slice(area, 6)}-${digitos.slice(6)}`;
    },
  };
})();
